"""
Azure AI Evaluation Pipeline for Agent Conversations
Retrieves conversations from GreptimeDB and evaluates them using Azure AI Evaluation SDK
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import uuid
from datetime import datetime
from typing import Any, Dict, List

from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from observability.greptime_logger import GreptimeLogger

# Azure AI Evaluation imports (install via: pip install azure-ai-evaluation)
try:
    from azure.ai.evaluation import (
        IntentResolutionEvaluator,
        TaskAdherenceEvaluator,
        ToolCallAccuracyEvaluator,
        evaluate,
    )
    AZURE_AI_AVAILABLE = True
except ImportError:
    print("Warning: azure-ai-evaluation not installed. Run: pip install azure-ai-evaluation")
    AZURE_AI_AVAILABLE = False

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AgentEvaluationPipeline:
    """
    Pipeline for evaluating agent conversations using Azure AI Evaluation SDK.
    """

    def __init__(
        self,
        greptime_logger: GreptimeLogger | None = None,
        evaluator_model: str | None = None,
    ):
        """Initialize evaluation pipeline."""
        self.greptime = greptime_logger or GreptimeLogger()
        self.evaluator_model = evaluator_model or os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")

        if not AZURE_AI_AVAILABLE:
            raise ImportError("azure-ai-evaluation is required. Install via: pip install azure-ai-evaluation")

        # Initialize evaluators
        model_config = {
            "azure_endpoint": os.getenv("AZURE_OPENAI_ENDPOINT"),
            "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "azure_deployment": self.evaluator_model,
        }

        self.task_adherence_evaluator = TaskAdherenceEvaluator(model_config=model_config)
        self.intent_resolution_evaluator = IntentResolutionEvaluator(model_config=model_config)
        self.tool_accuracy_evaluator = ToolCallAccuracyEvaluator(model_config=model_config)

        logger.info(f"Initialized evaluation pipeline with model: {self.evaluator_model}")

    def fetch_conversations(
        self,
        limit: int = 100,
        provider: str | None = None,
        unevaluated_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Fetch conversations from GreptimeDB for evaluation.

        Args:
            limit: Maximum number of conversations to fetch
            provider: Filter by provider (None = all providers)
            unevaluated_only: Only fetch conversations without evaluations

        Returns:
            List of conversation dictionaries
        """
        if unevaluated_only:
            conversations = self.greptime.get_unevaluated_conversations(limit=limit)
        else:
            conversations = self.greptime.get_recent_conversations(limit=limit, provider=provider)

        logger.info(f"Fetched {len(conversations)} conversations for evaluation")
        return conversations

    def prepare_data_for_evaluation(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform conversations into format expected by Azure AI Evaluation SDK.

        Expected format:
        {
            "query": "user question",
            "response": "agent response",
            "tool_definitions": [{"name": "...", "description": "...", "parameters": {...}}],
            "tool_calls": [{"type": "tool_call", "name": "...", "arguments": "..."}]
        }
        """
        evaluation_data = []

        for conv in conversations:
            # Parse tool_calls JSON if present
            tool_calls = []
            tool_definitions = []

            if conv.get("tool_calls"):
                try:
                    raw_tool_calls = json.loads(conv["tool_calls"]) if isinstance(conv["tool_calls"], str) else conv["tool_calls"]

                    # Transform to evaluation format
                    for tc in raw_tool_calls:
                        tool_calls.append({
                            "type": "tool_call",
                            "name": tc.get("name"),
                            "arguments": json.dumps(tc.get("params", {})),
                        })

                        # Generate tool definition (if not already present)
                        if not any(td["name"] == tc.get("name") for td in tool_definitions):
                            tool_definitions.append({
                                "name": tc.get("name"),
                                "description": f"Tool: {tc.get('name')}",
                                "parameters": {},  # Would need to fetch from tool registry
                            })
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse tool_calls for conversation {conv.get('conversation_id')}")

            eval_item = {
                "conversation_id": conv.get("conversation_id"),
                "message_id": conv.get("message_id"),
                "query": conv.get("user_query", ""),
                "response": conv.get("agent_response", ""),
            }

            # Add optional fields
            if tool_definitions:
                eval_item["tool_definitions"] = tool_definitions
            if tool_calls:
                eval_item["tool_calls"] = tool_calls

            evaluation_data.append(eval_item)

        return evaluation_data

    def evaluate_conversations(
        self,
        conversations: List[Dict[str, Any]],
        skip_tool_accuracy: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Evaluate conversations using Azure AI Evaluation SDK.

        Args:
            conversations: List of conversations in evaluation format
            skip_tool_accuracy: Skip tool accuracy evaluation (if no tools used)

        Returns:
            List of evaluation results
        """
        results = []

        for conv in conversations:
            logger.info(f"Evaluating conversation {conv.get('conversation_id')}")

            eval_result = {
                "evaluation_id": str(uuid.uuid4()),
                "conversation_id": conv.get("conversation_id"),
                "message_id": conv.get("message_id"),
                "timestamp": datetime.utcnow().isoformat(),
                "evaluator_model": self.evaluator_model,
            }

            # Task Adherence Evaluation
            try:
                task_result = self.task_adherence_evaluator(
                    query=conv["query"],
                    response=conv["response"],
                    tool_definitions=conv.get("tool_definitions"),
                )
                eval_result["task_adherence_score"] = task_result.get("task_adherence", 0)
                eval_result["task_adherence_reasoning"] = task_result.get("task_adherence_reason", "")
                logger.info(f"  Task Adherence: {eval_result['task_adherence_score']}")
            except Exception as e:
                logger.error(f"Task adherence evaluation failed: {e}")
                eval_result["task_adherence_score"] = None
                eval_result["task_adherence_reasoning"] = f"Error: {str(e)}"

            # Intent Resolution Evaluation
            try:
                intent_result = self.intent_resolution_evaluator(
                    query=conv["query"],
                    response=conv["response"],
                    tool_definitions=conv.get("tool_definitions"),
                )
                eval_result["intent_resolution_score"] = intent_result.get("intent_resolution", 0)
                eval_result["intent_resolution_reasoning"] = intent_result.get("intent_resolution_reason", "")
                logger.info(f"  Intent Resolution: {eval_result['intent_resolution_score']}")
            except Exception as e:
                logger.error(f"Intent resolution evaluation failed: {e}")
                eval_result["intent_resolution_score"] = None
                eval_result["intent_resolution_reasoning"] = f"Error: {str(e)}"

            # Tool Call Accuracy Evaluation (if tools were used)
            if not skip_tool_accuracy and conv.get("tool_calls"):
                try:
                    tool_result = self.tool_accuracy_evaluator(
                        query=conv["query"],
                        tool_definitions=conv.get("tool_definitions", []),
                        tool_calls=conv.get("tool_calls"),
                        response=conv.get("response"),
                    )
                    eval_result["tool_accuracy_score"] = tool_result.get("tool_call_accuracy", 0)
                    eval_result["tool_accuracy_reasoning"] = tool_result.get("tool_call_accuracy_reason", "")
                    logger.info(f"  Tool Accuracy: {eval_result['tool_accuracy_score']}")
                except Exception as e:
                    logger.error(f"Tool accuracy evaluation failed: {e}")
                    eval_result["tool_accuracy_score"] = None
                    eval_result["tool_accuracy_reasoning"] = f"Error: {str(e)}"
            else:
                eval_result["tool_accuracy_score"] = None
                eval_result["tool_accuracy_reasoning"] = "No tools used"

            # Calculate overall score
            scores = [
                s for s in [
                    eval_result.get("task_adherence_score"),
                    eval_result.get("intent_resolution_score"),
                    eval_result.get("tool_accuracy_score"),
                ]
                if s is not None
            ]
            eval_result["overall_score"] = sum(scores) / len(scores) if scores else 0
            eval_result["pass_threshold"] = eval_result["overall_score"] >= 3.0  # Pass if >= 3.0 out of 5.0

            results.append(eval_result)

        return results

    def store_evaluations(self, evaluations: List[Dict[str, Any]]) -> None:
        """Store evaluation results back to GreptimeDB."""
        for eval_result in evaluations:
            def escape_sql(s: str | None) -> str:
                if s is None:
                    return "NULL"
                return "'" + str(s).replace("'", "''").replace("\\", "\\\\") + "'"

            sql = f"""
            INSERT INTO agent_evaluations (
                evaluation_id, conversation_id, message_id, timestamp,
                task_adherence_score, intent_resolution_score, tool_accuracy_score,
                task_adherence_reasoning, intent_resolution_reasoning, tool_accuracy_reasoning,
                overall_score, pass_threshold,
                evaluator_model, evaluation_version
            ) VALUES (
                {escape_sql(eval_result['evaluation_id'])},
                {escape_sql(eval_result['conversation_id'])},
                {escape_sql(eval_result['message_id'])},
                '{eval_result['timestamp']}',
                {eval_result.get('task_adherence_score') or 'NULL'},
                {eval_result.get('intent_resolution_score') or 'NULL'},
                {eval_result.get('tool_accuracy_score') or 'NULL'},
                {escape_sql(eval_result.get('task_adherence_reasoning'))},
                {escape_sql(eval_result.get('intent_resolution_reasoning'))},
                {escape_sql(eval_result.get('tool_accuracy_reasoning'))},
                {eval_result.get('overall_score', 0)},
                {str(eval_result.get('pass_threshold', False)).upper()},
                {escape_sql(eval_result['evaluator_model'])},
                '1.0.0'
            );
            """

            result = self.greptime._execute_sql(sql)
            if result.get("status") == "success":
                logger.info(f"✓ Stored evaluation {eval_result['evaluation_id']}")
            else:
                logger.error(f"✗ Failed to store evaluation: {result.get('error')}")

    def run(
        self,
        limit: int = 100,
        provider: str | None = None,
        unevaluated_only: bool = True,
    ) -> Dict[str, Any]:
        """
        Run complete evaluation pipeline.

        Returns:
            Summary statistics
        """
        logger.info("=" * 80)
        logger.info("Starting Agent Evaluation Pipeline")
        logger.info("=" * 80)

        # Fetch conversations
        conversations = self.fetch_conversations(limit=limit, provider=provider, unevaluated_only=unevaluated_only)

        if not conversations:
            logger.info("No conversations found for evaluation")
            return {"status": "no_data"}

        # Prepare data
        eval_data = self.prepare_data_for_evaluation(conversations)

        # Evaluate
        results = self.evaluate_conversations(eval_data)

        # Store results
        self.store_evaluations(results)

        # Calculate summary
        total = len(results)
        passed = sum(1 for r in results if r.get("pass_threshold"))
        avg_overall = sum(r.get("overall_score", 0) for r in results) / total if total > 0 else 0

        summary = {
            "status": "success",
            "total_evaluated": total,
            "passed": passed,
            "pass_rate": passed / total if total > 0 else 0,
            "average_overall_score": avg_overall,
        }

        logger.info("=" * 80)
        logger.info("Evaluation Summary:")
        logger.info(f"  Total: {total}")
        logger.info(f"  Passed: {passed} ({summary['pass_rate']*100:.1f}%)")
        logger.info(f"  Average Score: {avg_overall:.2f}")
        logger.info("=" * 80)

        return summary


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Evaluate agent conversations")
    parser.add_argument("--limit", type=int, default=100, help="Max conversations to evaluate")
    parser.add_argument("--provider", type=str, help="Filter by provider")
    parser.add_argument("--all", action="store_true", help="Evaluate all conversations (not just unevaluated)")
    parser.add_argument("--test-mode", action="store_true", help="Test mode (don't store results)")

    args = parser.parse_args()

    # Run pipeline
    pipeline = AgentEvaluationPipeline()
    summary = pipeline.run(
        limit=args.limit,
        provider=args.provider,
        unevaluated_only=not args.all,
    )

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
