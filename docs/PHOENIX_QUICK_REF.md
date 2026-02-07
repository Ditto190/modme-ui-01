# Phoenix Integration Quick Reference Card

**Last Updated**: February 8, 2026
**Print this for your desk** 📋

## 🚀 Start Services

```bash
# Terminal 1: Phoenix
python -m phoenix.server.main serve

# Terminal 2: Agent
npm run dev:agent
```

## ✅ Health Checks

```bash
curl http://localhost:6006/healthz  # Phoenix
curl http://localhost:8000/health   # Agent
```

## 🔧 Key Files

| File                                  | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| `.env`                                | Phoenix config (`ENABLE_PHOENIX=true`) |
| `.vscode/mcp.json`                    | VSCode MCP servers                     |
| `agent/observability/`                | Instrumentation code                   |
| `scripts/test_phoenix_integration.py` | Test script                            |

## 📊 Phoenix UI

**URL**: http://localhost:6006

**What to check**:

- Projects → `modme-agent`
- Traces → Recent spans
- Attributes → OpenInference format

## 🤖 MCP Tools (VSCode)

Restart VSCode after config changes, then:

```
@phoenix List my Phoenix projects
@phoenix Show recent traces
@phoenix What prompts do I have?
```

## 🧪 Test Command

```bash
python scripts/test_phoenix_integration.py
```

**Expected**: All tests pass ✅

## 📝 Manual Trace Test

```python
from agent.observability.custom_provider_tracer import trace_custom_llm

with trace_custom_llm(
    provider="vscode-copilot",
    model="gpt-4",
    input_messages=[{"role": "user", "content": "test"}]
) as tracer:
    tracer.set_output({"role": "assistant", "content": "response"})
    tracer.set_tokens(input_tokens=10, output_tokens=20)
```

## 🔍 Verify Traces (GraphQL)

```bash
curl -X POST http://localhost:6006/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ spans(first: 5) { edges { node { name } } } }"}'
```

## ⚠️ Troubleshooting

| Symptom            | Fix                                                  |
| ------------------ | ---------------------------------------------------- |
| No traces          | Check `.env` has `ENABLE_PHOENIX=true`               |
| Phoenix 404        | Start Phoenix: `python -m phoenix.server.main serve` |
| Agent error        | Check logs in terminal                               |
| VSCode MCP missing | Restart VSCode completely                            |

## 📚 Documentation

| Doc                                  | Purpose                    |
| ------------------------------------ | -------------------------- |
| `PHOENIX_SETUP_COMPLETE.md`          | Full setup summary         |
| `PHOENIX_MCP_CONFIG.md`              | MCP configuration guide    |
| `PHOENIX_COPILOT_VERIFICATION.md`    | Testing & verification     |
| `PHOENIX_AI_PROVIDER_INTEGRATION.md` | Provider integration guide |

## 🎯 Success Checklist

- [ ] Phoenix running (port 6006)
- [ ] Agent running (port 8000)
- [ ] `.env` configured
- [ ] Test script passes
- [ ] Traces visible in UI
- [ ] MCP tools working

## 📞 Help

- **Phoenix Docs**: https://docs.arize.com/phoenix
- **Test Script**: `python scripts/test_phoenix_integration.py --help`
- **MCP Support**: Ask `@phoenix-support` in chat

---

**Quick Start**: Run `npm run dev` → Wait 10s → Check http://localhost:6006
