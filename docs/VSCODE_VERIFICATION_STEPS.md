# VSCode Phoenix Setup Verification

**Status**: Phoenix is running ✅
**Date**: February 8, 2026

## ✅ Completed Steps

1. ✅ Phoenix server running at http://localhost:6006
2. ✅ GraphQL API responsive
3. ✅ `.env` file configured with `ENABLE_PHOENIX=true`
4. ✅ `.vscode/mcp.json` updated with Phoenix MCP servers

## 🎯 Next: VSCode Verification

Follow these steps to verify the MCP integration in VSCode:

### Step 1: Reload VSCode Window

**Why**: VSCode needs to reload to pick up the new MCP configuration.

**How**:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Developer: Reload Window"
3. Press Enter

**Alternative**: Close all VSCode windows and reopen

### Step 2: Check MCP Server Status

**After reloading**:

1. Press `Ctrl+Shift+P`
2. Type "Output: Show Output Panel"
3. Select "MCP Logs" from the dropdown

**What to look for**:

- ✅ "Phoenix MCP server started"
- ✅ No error messages
- ⚠️ If you see errors, check the troubleshooting section below

### Step 3: Test Phoenix MCP Tools in Copilot Chat

**Open Copilot Chat**:

1. Press `Ctrl+Alt+I` (or click the chat icon)
2. Type: `@phoenix`

**You should see**:

- Phoenix MCP tools in the autocomplete
- Options like "List my Phoenix projects", etc.

**Try these test queries**:

```
@phoenix List my Phoenix projects

@phoenix Show me details about the Phoenix server status

@phoenix What prompts do I have available?
```

### Step 4: Test Phoenix Docs MCP

Type in Copilot Chat:

```
@phoenix-docs How do I set up tracing for Python applications?

@phoenix-docs What are OpenInference semantic attributes?
```

### Step 5: Verify in Phoenix UI

1. Open browser: http://localhost:6006
2. Check for:
   - Projects section (may be empty until you send traces)
   - UI loads without errors
   - "Connected" status indicator

## 🧪 Send a Test Trace

Once MCP is working, let's send a test trace:

**Option A: Quick Python Test**

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Set up tracing
tracer_provider = TracerProvider()
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:6006/v1/traces")
tracer_provider.add_span_processor(SimpleSpanProcessor(otlp_exporter))
trace.set_tracer_provider(tracer_provider)

# Create a test trace
tracer = trace.get_tracer("test.vscode.verification")
with tracer.start_as_current_span("test_trace") as span:
    span.set_attribute("test.type", "vscode_verification")
    span.set_attribute("test.timestamp", "2026-02-08")
    print("✅ Test trace sent to Phoenix!")
```

Save this as `test_trace.py` and run:

```bash
python test_trace.py
```

**Option B: Use Phoenix health check**

The simpler check script we just ran proves Phoenix is accessible:

```bash
python scripts/check_phoenix.py
```

## 🔍 Verification Checklist

- [ ] VSCode window reloaded
- [ ] MCP logs show no errors
- [ ] `@phoenix` shows autocomplete in Copilot Chat
- [ ] `@phoenix-docs` shows autocomplete in Copilot Chat
- [ ] Phoenix UI accessible at http://localhost:6006
- [ ] Test trace appears in Phoenix UI (if sent)

## ⚠️ Troubleshooting

### Issue: `@phoenix` not showing in autocomplete

**Solutions**:

1. Verify `.vscode/mcp.json` syntax (must be valid JSON)
2. Check for trailing commas (not allowed in JSON)
3. Restart VSCode completely (close all windows)
4. Check Output > MCP Logs for error messages

### Issue: "Phoenix MCP server failed to start"

**Check**:

```powershell
# Test npx can run
npx -y @arizeai/phoenix-mcp@latest --baseUrl http://localhost:6006 --help

# Check Node.js version (should be 18+)
node --version
```

### Issue: Phoenix UI not loading

**Solutions**:

```powershell
# Check Phoenix is running
Invoke-WebRequest -Uri http://localhost:6006/healthz

# Check Docker containers (if using Docker)
docker ps | Select-String "phoenix"

# Restart Phoenix
# If Docker:
docker-compose restart phoenix-server
```

### Issue: Traces not appearing

**Check environment variables**:

```powershell
# In PowerShell
Get-Content .env | Select-String "PHOENIX"

# Should show:
# ENABLE_PHOENIX=true
# PHOENIX_ENDPOINT=http://localhost:6006
```

## 📚 Quick Commands Reference

```powershell
# Check Phoenix health
python scripts/check_phoenix.py

# View Phoenix logs (if using Docker)
docker logs phoenix-server

# Restart Phoenix
docker-compose restart phoenix-server

# Check MCP config syntax
Get-Content .vscode\mcp.json | ConvertFrom-Json

# Open Phoenix UI
Start-Process "http://localhost:6006"
```

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ `@phoenix` appears in Copilot autocomplete
2. ✅ Phoenix MCP tools respond with project info
3. ✅ Phoenix UI loads at http://localhost:6006
4. ✅ No errors in VSCode Output > MCP Logs
5. ✅ Test traces appear in Phoenix UI

## 📖 Next Steps After Verification

Once verified:

1. **Read the docs**: See [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md)
2. **Instrument your code**: Add OpenTelemetry to your Python/TypeScript
3. **Create experiments**: Use Phoenix for LLM evaluation
4. **Query traces**: Use `@phoenix` to analyze your LLM calls

## 💡 Example Workflows

**Workflow 1: Debug a Failed LLM Call**

```
@phoenix Show me failed spans from the last hour
@phoenix Get details about span ID abc123
@phoenix What was the error message for that span?
```

**Workflow 2: Analyze Token Usage**

```
@phoenix List spans with high token counts
@phoenix Show me the average tokens per request today
@phoenix Which prompts are most expensive?
```

**Workflow 3: Prompt Engineering**

```
@phoenix What prompts do I have for customer-support?
@phoenix Create a new prompt for sentiment classification
@phoenix Update my classification prompt with these categories
```

## 📞 Support

- **Documentation**: See `docs/` folder
- **Quick Reference**: [PHOENIX_QUICK_REF.md](./PHOENIX_QUICK_REF.md)
- **Phoenix Docs**: https://docs.arize.com/phoenix
- **MCP Protocol**: https://modelcontextprotocol.io/

---

**Current Status**: Ready for VSCode verification! 🚀

Follow Step 1 above to reload VSCode and test the MCP integration.
