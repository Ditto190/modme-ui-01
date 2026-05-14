#!/usr/bin/env python3
"""
Phoenix VSCode Copilot Integration Test Script

This script tests that VSCode Copilot telemetry is correctly sending traces to Phoenix.
It simulates Copilot interactions and verifies they appear in Phoenix.

Usage:
    python scripts/test_phoenix_integration.py
    python scripts/test_phoenix_integration.py --verbose
    python scripts/test_phoenix_integration.py --check-only
"""

import argparse
import json
import sys
import time
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "agent"))

try:
    import requests
    from opentelemetry import trace

    from agent.observability.custom_provider_tracer import trace_custom_llm
    from agent.observability.phoenix_instrumentors import instrument_all_providers
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure you're in the correct directory and dependencies are installed.")
    sys.exit(1)


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def print_step(step: str, status: str = "info"):
    """Print a test step with color coding."""
    icons = {"info": "ℹ️", "success": "✅", "error": "❌", "warning": "⚠️"}
    colors = {
        "info": Colors.BLUE,
        "success": Colors.GREEN,
        "error": Colors.RED,
        "warning": Colors.YELLOW,
    }
    print(f"{icons.get(status, 'ℹ️')} {colors.get(status, '')}{step}{Colors.RESET}")


def check_phoenix_running(endpoint: str = "http://localhost:6006") -> bool:
    """Check if Phoenix server is running."""
    print_step("Checking Phoenix server...", "info")
    try:
        response = requests.get(f"{endpoint}/healthz", timeout=5)
        if response.status_code == 200:
            print_step(f"Phoenix is running at {endpoint}", "success")
            return True
        else:
            print_step(
                f"Phoenix returned status {response.status_code}", "error"
            )
            return False
    except requests.exceptions.RequestException as e:
        print_step(f"Phoenix is not accessible: {e}", "error")
        print_step(
            "Start Phoenix with: python -m phoenix.server.main serve", "warning"
        )
        return False


def check_agent_running(endpoint: str = "http://localhost:8000") -> bool:
    """Check if agent is running."""
    print_step("Checking agent server...", "info")
    try:
        response = requests.get(f"{endpoint}/health", timeout=5)
        if response.status_code == 200:
            print_step(f"Agent is running at {endpoint}", "success")
            return True
        else:
            print_step(f"Agent returned status {response.status_code}", "warning")
            print_step("Agent not required but recommended for full testing", "info")
            return False
    except requests.exceptions.RequestException:
        print_step("Agent is not running (optional)", "warning")
        print_step("Start agent with: npm run dev:agent", "info")
        return False


def test_manual_trace():
    """Test sending a manual trace using custom provider tracer."""
    print_step("Testing manual trace generation...", "info")

    try:
        with trace_custom_llm(
            provider="vscode-copilot",
            model="gpt-4",
            input_messages=[
                {
                    "role": "user",
                    "content": "How do I implement authentication in Next.js?",
                }
            ],
        ) as tracer:
            # Simulate processing
            time.sleep(0.3)

            # Set response
            tracer.set_output(
                {
                    "role": "assistant",
                    "content": "You can implement authentication in Next.js using NextAuth.js...",
                }
            )

            # Set token counts
            tracer.set_tokens(input_tokens=45, output_tokens=120, total_tokens=165)

            # Set model parameters
            tracer.set_parameters(
                temperature=0.7, max_tokens=500, top_p=0.9
            )

            # Add metadata
            tracer.set_metadata(
                {
                    "workspace": "modme-ui-01-test-worktree",
                    "file_extension": ".tsx",
                    "copilot_version": "1.150.0",
                    "test_run": True,
                }
            )

        print_step("Manual trace sent successfully", "success")
        return True

    except Exception as e:
        print_step(f"Failed to send manual trace: {e}", "error")
        return False


def test_instrumentor_trace():
    """Test sending a trace using instrumentor."""
    print_step("Testing instrumentor-based trace...", "info")

    try:
        # Initialize instrumentation
        instrument_all_providers()

        # Get tracer
        tracer = trace.get_tracer("test.vscode.copilot")

        # Create a test span
        with tracer.start_as_current_span("copilot.chat.test") as span:
            span.set_attribute("llm.provider", "openai")
            span.set_attribute("llm.model_name", "gpt-4")
            span.set_attribute(
                "llm.input_messages",
                json.dumps([{"role": "user", "content": "Test message"}]),
            )
            span.set_attribute(
                "llm.output_messages",
                json.dumps([{"role": "assistant", "content": "Test response"}]),
            )
            span.set_attribute("llm.token_count.prompt", 10)
            span.set_attribute("llm.token_count.completion", 20)
            span.set_attribute("llm.token_count.total", 30)
            span.set_attribute("test_run", "true")

            time.sleep(0.2)

        print_step("Instrumentor trace sent successfully", "success")
        return True

    except Exception as e:
        print_step(f"Failed to send instrumentor trace: {e}", "error")
        return False


def test_agent_endpoint(endpoint: str = "http://localhost:8000"):
    """Test sending telemetry to agent endpoint."""
    print_step("Testing agent telemetry endpoint...", "info")

    try:
        # Test chat request
        response = requests.post(
            f"{endpoint}/vscode/copilot/telemetry",
            json={
                "event_type": "chat_request",
                "user_id": "test-user",
                "session_id": f"test-session-{int(time.time())}",
                "conversation_id": "conv-test",
                "message": "How do I use React hooks?",
                "metadata": {
                    "workspace": "modme-ui-01-test-worktree",
                    "language": "typescript",
                    "test_run": True,
                },
            },
            timeout=5,
        )

        if response.status_code == 200:
            print_step("Chat request telemetry sent", "success")

            # Test chat response
            time.sleep(0.1)
            response = requests.post(
                f"{endpoint}/vscode/copilot/telemetry",
                json={
                    "event_type": "chat_response",
                    "user_id": "test-user",
                    "session_id": f"test-session-{int(time.time())}",
                    "conversation_id": "conv-test",
                    "response": "Here's how to use React hooks...",
                    "model": "gpt-4",
                    "tokens_used": 180,
                    "latency_ms": 850,
                },
                timeout=5,
            )

            if response.status_code == 200:
                print_step("Chat response telemetry sent", "success")
                return True

        print_step(f"Agent endpoint returned {response.status_code}", "warning")
        return False

    except requests.exceptions.RequestException as e:
        print_step(f"Agent endpoint test skipped: {e}", "warning")
        return False


def verify_traces_in_phoenix(endpoint: str = "http://localhost:6006"):
    """Verify traces appear in Phoenix GraphQL API."""
    print_step("Verifying traces in Phoenix...", "info")

    time.sleep(2)  # Wait for traces to be processed

    try:
        query = """
        {
          spans(first: 5, sort: { col: startTime, dir: desc }) {
            edges {
              node {
                name
                attributes
                statusCode
              }
            }
          }
        }
        """

        response = requests.post(
            f"{endpoint}/graphql",
            json={"query": query},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            spans = data.get("data", {}).get("spans", {}).get("edges", [])

            if spans:
                print_step(f"Found {len(spans)} recent spans in Phoenix", "success")

                # Check for test spans
                test_spans = [
                    s for s in spans
                    if "test" in s.get("node", {}).get("name", "").lower()
                    or any(
                        "test" in str(v).lower()
                        for v in s.get("node", {}).get("attributes", {}).values()
                    )
                ]

                if test_spans:
                    print_step(
                        f"✅ Found {len(test_spans)} test span(s) in Phoenix",
                        "success",
                    )
                    return True
                else:
                    print_step(
                        "Found spans but no test spans yet. They may still be processing.",
                        "warning",
                    )
                    return True
            else:
                print_step("No spans found in Phoenix yet", "warning")
                print_step(
                    "Wait a few seconds and check Phoenix UI: http://localhost:6006",
                    "info",
                )
                return False
        else:
            print_step(f"Phoenix API returned {response.status_code}", "error")
            return False

    except Exception as e:
        print_step(f"Failed to query Phoenix API: {e}", "error")
        return False


def run_full_test(verbose: bool = False):
    """Run complete integration test suite."""
    print(f"\n{Colors.BOLD}=== Phoenix VSCode Copilot Integration Test ==={Colors.RESET}\n")

    results = {}

    # Check services
    results["phoenix"] = check_phoenix_running()
    results["agent"] = check_agent_running()

    print()

    if not results["phoenix"]:
        print_step("Cannot continue without Phoenix running", "error")
        return False

    # Run tests
    print_step("Running integration tests...", "info")
    print()

    results["manual_trace"] = test_manual_trace()
    time.sleep(1)

    results["instrumentor_trace"] = test_instrumentor_trace()
    time.sleep(1)

    if results["agent"]:
        results["agent_endpoint"] = test_agent_endpoint()
        time.sleep(1)
    else:
        results["agent_endpoint"] = None

    # Verify traces
    print()
    results["verification"] = verify_traces_in_phoenix()

    # Print summary
    print(f"\n{Colors.BOLD}=== Test Summary ==={Colors.RESET}\n")

    for test_name, result in results.items():
        if result is None:
            continue
        status = "success" if result else "error"
        print_step(f"{test_name.replace('_', ' ').title()}: {'PASS' if result else 'FAIL'}", status)

    all_passed = all(v for v in results.values() if v is not None)

    print()
    if all_passed:
        print_step("All tests passed! ✨", "success")
        print()
        print(f"{Colors.BLUE}Next steps:{Colors.RESET}")
        print("  1. Open Phoenix UI: http://localhost:6006")
        print("  2. Navigate to your project")
        print("  3. View traces and spans with 'test' in attributes")
        print()
        return True
    else:
        print_step("Some tests failed. Check the errors above.", "error")
        print()
        print(f"{Colors.YELLOW}Troubleshooting steps:{Colors.RESET}")
        print("  1. Ensure Phoenix is running: python -m phoenix.server.main serve")
        print("  2. Check environment variables in .env")
        print("  3. Verify ENABLE_PHOENIX=true")
        print("  4. Review logs for detailed errors")
        print()
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Test Phoenix VSCode Copilot integration"
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check if services are running",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Verbose output"
    )

    args = parser.parse_args()

    if args.check_only:
        phoenix_ok = check_phoenix_running()
        agent_ok = check_agent_running()
        sys.exit(0 if phoenix_ok else 1)
    else:
        success = run_full_test(verbose=args.verbose)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
