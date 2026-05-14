"""Phoenix Dataset Exporter for Copilot Telemetry.

This module exports GitHub Copilot interaction traces from Phoenix to
structured datasets suitable for:
- Fine-tuning LLMs
- Prompt engineering analysis
- Usage analytics
- Research datasets

Exports to formats:
- JSONL (for fine-tuning APIs like OpenAI, Google, Anthropic)
- CSV (for spreadsheet analysis)
- Parquet (for data science workflows)
- HuggingFace datasets

Usage:
    python -m agent.observability.export_copilot_dataset
        --output-dir ./datasets
        --format jsonl
        --start-date 2026-02-01
        --end-date 2026-02-08

Environment Variables:
    PHOENIX_ENDPOINT: Phoenix server URL (default: http://localhost:6006)
"""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import requests
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

PHOENIX_ENDPOINT = os.getenv("PHOENIX_ENDPOINT", "http://localhost:6006")
DEFAULT_OUTPUT_DIR = "./datasets/copilot-telemetry"

# ============================================================================
# DATA MODELS
# ============================================================================

class CopilotInteraction(BaseModel):
    """Structured Copilot interaction for export."""

    # Identifiers
    trace_id: str
    span_id: str
    timestamp: datetime

    # Interaction type
    event_type: str  # chat, completion, error
    agent_role: Optional[str] = None

    # Content
    user_prompt: Optional[str] = None
    assistant_response: Optional[str] = None
    completion_text: Optional[str] = None

    # Context
    model: Optional[str] = None
    workspace: Optional[str] = None
    file_path: Optional[str] = None
    language: Optional[str] = None
    instructions: Optional[str] = None

    # Tools
    tools_available: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)

    # Metrics
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None

    # Feedback
    feedback: Optional[str] = None  # positive, negative, or null

class FineTuneExample(BaseModel):
    """Format for LLM fine-tuning."""

    messages: List[Dict[str, str]]
    metadata: Optional[Dict[str, Any]] = None

# ============================================================================
# PHOENIX API CLIENT
# ============================================================================

class PhoenixClient:
    """Client for querying Phoenix traces."""

    def __init__(self, endpoint: str = PHOENIX_ENDPOINT):
        self.endpoint = endpoint.rstrip('/')
        self.api_url = f"{self.endpoint}/v1"

    def test_connection(self) -> bool:
        """Test connection to Phoenix."""
        try:
            response = requests.get(f"{self.endpoint}/", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to connect to Phoenix: {e}")
            return False

    def query_traces(
        self,
        project_name: str = "copilot-research",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Query traces from Phoenix.

        Args:
            project_name: Phoenix project name
            start_time: Start of time range
            end_time: End of time range
            limit: Maximum number of traces

        Returns:
            List of trace dictionaries
        """
        # Build GraphQL query
        query = """
        query GetTraces(
            $projectName: String!
            $startTime: DateTime
            $endTime: DateTime
            $limit: Int
        ) {
            traces(
                projectName: $projectName
                startTime: $startTime
                endTime: $endTime
                limit: $limit
            ) {
                edges {
                    node {
                        traceId
                        projectName
                        startTime
                        spans {
                            spanId
                            name
                            startTime
                            endTime
                            statusCode
                            attributes {
                                key
                                value
                            }
                        }
                    }
                }
            }
        }
        """

        variables = {
            "projectName": project_name,
            "startTime": start_time.isoformat() if start_time else None,
            "endTime": end_time.isoformat() if end_time else None,
            "limit": limit
        }

        try:
            response = requests.post(
                f"{self.api_url}/graphql",
                json={"query": query, "variables": variables},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            if "errors" in data:
                logger.error(f"GraphQL errors: {data['errors']}")
                return []

            edges = data.get("data", {}).get("traces", {}).get("edges", [])
            traces = [edge["node"] for edge in edges]

            logger.info(f"Retrieved {len(traces)} traces from Phoenix")
            return traces

        except Exception as e:
            logger.error(f"Failed to query traces: {e}")
            return []

# ============================================================================
# DATA TRANSFORMATION
# ============================================================================

def parse_trace_to_interaction(trace: Dict[str, Any]) -> Optional[CopilotInteraction]:
    """Parse Phoenix trace to CopilotInteraction."""
    if not trace.get("spans"):
        return None

    # Get first span (assumes single span per trace for simplicity)
    span = trace["spans"][0]

    # Extract attributes
    attrs = {attr["key"]: attr["value"] for attr in span.get("attributes", [])}

    # Parse to structured format
    try:
        return CopilotInteraction(
            trace_id=trace["traceId"],
            span_id=span["spanId"],
            timestamp=datetime.fromisoformat(span["startTime"]),
            event_type=attrs.get("copilot.event_type", "unknown"),
            agent_role=attrs.get("copilot.agent_role"),
            user_prompt=attrs.get("input.value"),
            assistant_response=attrs.get("output.value"),
            completion_text=attrs.get("completion.text"),
            model=attrs.get("llm.model_name"),
            workspace=attrs.get("workspace.name"),
            file_path=attrs.get("code.file_path"),
            language=attrs.get("code.language"),
            instructions=attrs.get("copilot.instructions"),
            tools_available=attrs.get("copilot.tools.available", "").split(",") if attrs.get("copilot.tools.available") else [],
            tools_used=attrs.get("copilot.tools.used", "").split(",") if attrs.get("copilot.tools.used") else [],
            input_tokens=int(attrs["llm.token_count.prompt"]) if attrs.get("llm.token_count.prompt") else None,
            output_tokens=int(attrs["llm.token_count.completion"]) if attrs.get("llm.token_count.completion") else None,
            total_tokens=int(attrs["llm.token_count.total"]) if attrs.get("llm.token_count.total") else None,
            latency_ms=int(attrs["latency.ms"]) if attrs.get("latency.ms") else None,
            feedback=attrs.get("copilot.feedback")
        )
    except Exception as e:
        logger.warning(f"Failed to parse trace {trace.get('traceId')}: {e}")
        return None

def interaction_to_finetune_format(interaction: CopilotInteraction) -> Optional[FineTuneExample]:
    """Convert interaction to fine-tuning format (OpenAI/Anthropic style)."""
    if not interaction.user_prompt or not interaction.assistant_response:
        return None

    messages = []

    # System message (if instructions exist)
    if interaction.instructions:
        messages.append({
            "role": "system",
            "content": interaction.instructions
        })

    # User message
    messages.append({
        "role": "user",
        "content": interaction.user_prompt
    })

    # Assistant message
    messages.append({
        "role": "assistant",
        "content": interaction.assistant_response
    })

    metadata = {
        "trace_id": interaction.trace_id,
        "timestamp": interaction.timestamp.isoformat(),
        "agent_role": interaction.agent_role,
        "model": interaction.model,
        "tools_used": interaction.tools_used,
        "feedback": interaction.feedback,
        "tokens": {
            "input": interaction.input_tokens,
            "output": interaction.output_tokens,
            "total": interaction.total_tokens
        }
    }

    return FineTuneExample(messages=messages, metadata=metadata)

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

def export_to_jsonl(
    interactions: List[CopilotInteraction],
    output_path: Path,
    format_type: Literal["raw", "finetune"] = "raw"
):
    """Export interactions to JSONL format."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open('w', encoding='utf-8') as f:
        for interaction in interactions:
            if format_type == "finetune":
                example = interaction_to_finetune_format(interaction)
                if example:
                    f.write(example.model_dump_json() + '\n')
            else:
                f.write(interaction.model_dump_json() + '\n')

    logger.info(f"Exported {len(interactions)} interactions to {output_path}")

def export_to_csv(interactions: List[CopilotInteraction], output_path: Path):
    """Export interactions to CSV format."""
    try:
        import pandas as pd

        # Convert to dataframe
        df = pd.DataFrame([i.model_dump() for i in interactions])

        # Flatten nested fields
        df['tools_available'] = df['tools_available'].apply(lambda x: ','.join(x) if x else '')
        df['tools_used'] = df['tools_used'].apply(lambda x: ','.join(x) if x else '')

        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)

        logger.info(f"Exported {len(interactions)} interactions to {output_path}")
    except ImportError:
        logger.error("pandas is required for CSV export. Install with: pip install pandas")

def export_to_parquet(interactions: List[CopilotInteraction], output_path: Path):
    """Export interactions to Parquet format."""
    try:
        import pandas as pd

        df = pd.DataFrame([i.model_dump() for i in interactions])

        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, engine='pyarrow', compression='snappy')

        logger.info(f"Exported {len(interactions)} interactions to {output_path}")
    except ImportError:
        logger.error("pandas and pyarrow are required for Parquet export. Install with: pip install pandas pyarrow")

# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Export GitHub Copilot telemetry from Phoenix to datasets"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory for datasets"
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["jsonl", "csv", "parquet", "all"],
        default="jsonl",
        help="Export format"
    )
    parser.add_argument(
        "--finetune-format",
        action="store_true",
        help="Export in fine-tuning format (messages array)"
    )
    parser.add_argument(
        "--project-name",
        type=str,
        default="copilot-research",
        help="Phoenix project name"
    )
    parser.add_argument(
        "--start-date",
        type=str,
        help="Start date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--end-date",
        type=str,
        help="End date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=7,
        help="Number of days back to query (if no start date)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10000,
        help="Maximum number of traces to export"
    )
    parser.add_argument(
        "--phoenix-endpoint",
        type=str,
        default=PHOENIX_ENDPOINT,
        help="Phoenix server endpoint"
    )

    args = parser.parse_args()

    # Parse dates
    end_time = datetime.fromisoformat(args.end_date) if args.end_date else datetime.now()
    start_time = (
        datetime.fromisoformat(args.start_date)
        if args.start_date
        else end_time - timedelta(days=args.days_back)
    )

    logger.info("Exporting Copilot telemetry from Phoenix")
    logger.info(f"Time range: {start_time} to {end_time}")
    logger.info(f"Project: {args.project_name}")

    # Connect to Phoenix
    client = PhoenixClient(args.phoenix_endpoint)
    if not client.test_connection():
        logger.error("Failed to connect to Phoenix. Is it running?")
        return

    # Query traces
    traces = client.query_traces(
        project_name=args.project_name,
        start_time=start_time,
        end_time=end_time,
        limit=args.limit
    )

    if not traces:
        logger.warning("No traces found in the specified time range")
        return

    # Parse to interactions
    interactions = []
    for trace in traces:
        interaction = parse_trace_to_interaction(trace)
        if interaction:
            interactions.append(interaction)

    logger.info(f"Parsed {len(interactions)} valid interactions")

    if not interactions:
        logger.warning("No valid interactions to export")
        return

    # Export
    output_dir = Path(args.output_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if args.format in ["jsonl", "all"]:
        format_suffix = "finetune" if args.finetune_format else "raw"
        output_path = output_dir / f"copilot_telemetry_{timestamp}_{format_suffix}.jsonl"
        export_to_jsonl(
            interactions,
            output_path,
            format_type="finetune" if args.finetune_format else "raw"
        )

    if args.format in ["csv", "all"]:
        output_path = output_dir / f"copilot_telemetry_{timestamp}.csv"
        export_to_csv(interactions, output_path)

    if args.format in ["parquet", "all"]:
        output_path = output_dir / f"copilot_telemetry_{timestamp}.parquet"
        export_to_parquet(interactions, output_path)

    logger.info("Export complete!")
    logger.info(f"Output directory: {output_dir.absolute()}")

if __name__ == "__main__":
    main()
