"""
DeepEval Evaluation Pipeline for Agent Conversations
Free & open-source alternative to Azure AI Evaluation
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

# DeepEval imports
try:
    from deepeval import evaluate
    from deepeval.metrics import (
        ArgumentCorrectnessMetric,
        ConversationCompletenessMetric,
        TaskCompletionMetric,
        ToolUseMetric,
    )
    from deepeval.test_case import ConversationalTestCase, ToolCall, Turn
    DEEPEVAL_AVAILABLE = True
except ImportError:
    print("Warning: deepeval not installed. Run: pip install deepeval")
    DEEPEVAL_AVAILABLE = False

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AgentEvaluationPipeline:
    """
    Pipeline for evaluating agent conversations using DeepEval (free & open-source).

    Metrics:
    - TaskCompletionMetric: Did the agent complete the user's task?
    - ConversationCompletenessMetric: Is the conversation complete?
    - ToolUseMetric: Did the agent use tools correctly?
    - ArgumentCorrectnessMetric: Were tool arguments correct?
    """

    def __init__(
        self,
        greptime_logger: GreptimeLogger | None = None,
        evaluator_model: str | None = None,
        evaluation_threshold: float = 0.7,
    ):
        """Initialize evaluation pipeline."""
        self.greptime = greptime_logger or GreptimeLogger()
        self.evaluator_model = evaluator_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.threshold = evaluation_threshold

        if not DEEPEVAL_AVAILABLE:
            raise ImportError("deepeval is required. Install via: pip install deepeval")

        # Initialize metrics
        self.task_completion_metric = TaskCompletionMetric(
            threshold=self.threshold,
            model=self.evaluator_model,
        )

        self.conversation_completeness_metric = ConversationCompletenessMetric(
            threshold=self.threshold,
            model=self.evaluator_model,
        )

        self.tool_use_metric = ToolUseMetric(
            threshold=self.threshold,
            model=self.evaluator_model,
        )

        self.argument_correctness_metric = ArgumentCorrectnessMetric(
            threshold=self.threshold,
            model=self.evaluator_model,
        )

        logger.info(f"Initialized DeepEval pipeline with model: {self.evaluator_model}")

    def fetch_conversations(
        self,
        limit: int = 100,
        provider: str | None = None,
        unevaluated_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Fetch conversations from GreptimeDB for evaluation.
        """
        if unevaluated_only:
            conversations = self.greptime.get_unevaluated_conversations(limit=limit)
        else:
            conversations = self.greptime.get_recent_conversations(limit=limit, provider=provider)

        logger.info(f"Fetched {len(conversations)} conversations for evaluation")
        return conversations

    def convert_to_deepeval_format(self, conversations: List[Dict[str, Any]]) -> List[ConversationalTestCase]:
        """
        Transform conversations into DeepEval ConversationalTestCase format.

        DeepEval expects:
        {
            "turns": [
                {"role": "user", "content": "query"},
                {"role": "assistant", "content": "response", "tools_called": [...]}
            ]
        }
        """
        test_cases = []

        for conv in conversations:
            turns = []

            # User turn
            turns.append(Turn(
                role="user",
                content=conv.get("user_query", "")
            ))

            # Agent turn with optional tools
            tool_calls = []
            if conv.get("tool_calls"):
                try:
                    raw_tool_calls = json.loads(conv["tool_calls"]) if isinstance(conv["tool_calls"], str) else conv["tool_calls"]

                    for tc in raw_tool_calls:
                        tool_calls.append(ToolCall(
                            name=tc.get("name", ""),
                            arguments=tc.get("params", {}),
                        ))
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse tool_calls for conversation {conv.get('conversation_id')}")

            turns.append(Turn(
                role="assistant",
                content=conv.get("agent_response", ""),
                tools_called=tool_calls if tool_calls else None
            ))

            # Create test case
            test_case = ConversationalTestCase(
                turns=turns,
                additional_metadata={
                    "conversation_id": conv.get("conversation_id"),
                    "message_id": conv.get("message_id"),
                    "provider": conv.get("provider"),
                    "timestamp": conv.get("timestamp"),
                }
            )

            test_cases.append(test_case)

        return test_cases

    def evaluate_conversations(
        self,
        test_cases: List[ConversationalTestCase],
        skip_tool_metrics: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Evaluate conversations using DeepEval metrics.

        Returns evaluation results with scores and reasoning.
        """
        results = []

        # Select metrics based on configuration
        metrics = [
            self.task_completion_metric,
            self.conversation_completeness_metric,
        ]

        if not skip_tool_metrics:
            metrics.extend([
                self.tool_use_metric,
                self.argument_correctness_metric,
            ])

        for test_case in test_cases:
            metadata = test_case.additional_metadata
            logger.info(f"Evaluating conversation {metadata.get('conversation_id')}")

            eval_result = {
                "evaluation_id": str(uuid.uuid4()),
                "conversation_id": metadata.get("conversation_id"),
                "message_id": metadata.get("message_id"),
                "timestamp": datetime.utcnow().isoformat(),
                "evaluator_model": self.evaluator_model,
            }

            try:
                # Run evaluation
                evaluation_results = evaluate(
                    test_cases=[test_case],
                    metrics=metrics,
                    run_async=False,
                    show_indicator=False,
                )

                # Extract scores and reasoning
                for metric in evaluation_results.test_results[0].metrics_data:
                    metric_name = metric.name.lower().replace(" ", "_")

                    eval_result[f"{metric_name}_score"] = metric.score
                    eval_result[f"{metric_name}_reasoning"] = metric.reason

                    logger.info(f"  {metric.name}: {metric.score:.2f}")

                # Calculate overall score
                scores = [
                    eval_result.get("task_completion_score"),
                    eval_result.get("conversation_completeness_score"),
                    eval_result.get("tool_use_score"),
                    eval_result.get("argument_correctness_score"),
                ]
                scores = [s for s in scores if s is not None]

                eval_result["overall_score"] = sum(scores) / len(scores) if scores else 0
                eval_result["pass_threshold"] = eval_result["overall_score"] >= self.threshold

            except Exception as e:
                logger.error(f"Evaluation failed: {e}")
                eval_result["overall_score"] = 0
                eval_result["pass_threshold"] = False
                eval_result["error"] = str(e)

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
                {eval_result.get('task_completion_score') or 'NULL'},
                {eval_result.get('conversation_completeness_score') or 'NULL'},
                {eval_result.get('tool_use_score') or 'NULL'},
                {escape_sql(eval_result.get('task_completion_reasoning'))},
                {escape_sql(eval_result.get('conversation_completeness_reasoning'))},
                {escape_sql(eval_result.get('tool_use_reasoning'))},
                {eval_result.get('overall_score', 0)},
                {str(eval_result.get('pass_threshold', False)).upper()},
                {escape_sql(eval_result['evaluator_model'])},
                'deepeval-1.0'
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

        Returns summary statistics.
        """
        logger.info("=" * 80)
        logger.info("Starting DeepEval Agent Evaluation Pipeline")
        logger.info("=" * 80)

        # Fetch conversations
        conversations = self.fetch_conversations(limit=limit, provider=provider, unevaluated_only=unevaluated_only)

        if not conversations:
            logger.info("No conversations found for evaluation")
            return {"status": "no_data"}

        # Convert to DeepEval format
        test_cases = self.convert_to_deepeval_format(conversations)

        # Evaluate
        results = self.evaluate_conversations(test_cases)

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
            "framework": "deepeval",
        }

        logger.info("=" * 80)
        logger.info("Evaluation Summary:")
        logger.info("  Framework: DeepEval (open-source)")
        logger.info(f"  Total: {total}")
        logger.info(f"  Passed: {passed} ({summary['pass_rate']*100:.1f}%)")
        logger.info(f"  Average Score: {avg_overall:.2f}")
        logger.info("=" * 80)

        return summary


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Evaluate agent conversations with DeepEval")
    parser.add_argument("--limit", type=int, default=100, help="Max conversations to evaluate")
    parser.add_argument("--provider", type=str, help="Filter by provider")
    parser.add_argument("--all", action="store_true", help="Evaluate all conversations (not just unevaluated)")
    parser.add_argument("--threshold", type=float, default=0.7, help="Pass threshold (0.0-1.0)")
    parser.add_argument("--model", type=str, help="Evaluator model (default: gpt-4o-mini)")

    args = parser.parse_args()

    # Run pipeline
    pipeline = AgentEvaluationPipeline(
        evaluator_model=args.model,
        evaluation_threshold=args.threshold,
    )
    summary = pipeline.run(
        limit=args.limit,
        provider=args.provider,
        unevaluated_only=not args.all,
    )

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
