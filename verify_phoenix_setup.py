"""
Phoenix Setup Verification Script
Checks if all components are installed and working
"""

import sys


def check_imports():
    """Check if all required packages can be imported"""
    print("=" * 60)
    print("PHOENIX SETUP VERIFICATION")
    print("=" * 60)

    checks = [
        ("Phoenix Core", "phoenix"),
        ("OpenInference - Anthropic", "openinference.instrumentation.anthropic"),
        ("OpenInference - OpenAI", "openinference.instrumentation.openai"),
        ("OpenTelemetry API", "opentelemetry.sdk.trace"),
        ("OpenTelemetry Exporter", "opentelemetry.exporter.otlp.proto.http.trace_exporter"),
    ]

    results = []
    for name, module_path in checks:
        try:
            parts = module_path.split(".")
            mod = __import__(module_path)
            for part in parts[1:]:
                mod = getattr(mod, part)

            version = getattr(mod, "__version__", "unknown")
            print(f"✅ {name}: OK (v{version})")
            results.append(True)
        except ImportError as e:
            print(f"❌ {name}: FAILED - {str(e)}")
            results.append(False)
        except Exception as e:
            print(f"⚠️  {name}: WARNING - {str(e)}")
            results.append(False)

    print("=" * 60)

    if all(results):
        print("🎉 ALL CHECKS PASSED! Phoenix is ready to use.")
        print("\nNext steps:")
        print("1. Start Phoenix server: npm run phoenix:start")
        print("2. Open Phoenix UI: http://localhost:6006")
        print("3. Add initialization code to your agent")
        return 0
    else:
        print("❌ Some dependencies are missing or failed to import.")
        print("Run: pip install -r agent/requirements-phoenix.txt")
        return 1

if __name__ == "__main__":
    sys.exit(check_imports())
