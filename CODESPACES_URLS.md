# Codespaces Access URLs

## ✅ Your GenUI Workbench URL

**🎨 UI (Next.js - Port 3000):**
```
https://urban-giggle-v9rg679gv4j25ww-3000.github.dev
```
👆 **USE THIS URL** to access the GenUI Workbench in your browser!

---

## How It Works

```
Browser (your computer)
    ↓ HTTPS to public Codespace URL
UI: https://...-3000.github.dev (Next.js)
    ↓ Server-side API call to /api/copilotkit
    ↓ Proxies internally to localhost:8000
Agent: http://127.0.0.1:8000 (Python FastAPI)
    ↓ CopilotKit HttpAgent
Python ADK Agent (workbench_agent)
```

**Key Architecture:**
- **Browser** → Next.js UI (public URL)
- **Next.js** → Agent (localhost, server-to-server)
- Agent is NOT directly accessible from browser
- All communication flows through Next.js API route

---

## ✅ Configuration

**Agent URL** in `.env`:
```
AGENT_URL=http://127.0.0.1:8000
```

**CORS** in `agent/main.py` allows requests from:
- `https://urban-giggle-v9rg679gv4j25ww-3000.github.dev`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

---

## Quick Test

1. **Open UI**: https://urban-giggle-v9rg679gv4j25ww-3000.github.dev
2. **Open sidebar**: Look for chat icon on the right
3. **Test GenUI**: Type: *"Generate a sales KPI dashboard with revenue, users, and churn cards"*
4. **Watch magic happen**: AI creates UI components live!

---

## Troubleshooting

### "Agent is not responding" Error

This means the API route couldn't connect to the agent. Check:

1. **Both services running**:
   ```bash
   ps aux | grep -E "(uvicorn|next)"
   ```

2. **Agent is healthy**:
   ```bash
   curl http://127.0.0.1:8000/health
   ```

3. **Check logs**:
   ```bash
   tail -50 /tmp/dev.log
   ```

4. **Restart if needed**:
   ```bash
   pkill -f "npm run dev" && npm run dev
   ```

### Port Visibility

Port 3000 should be **public** in the PORTS tab. Port 8000 can be private since only the Next.js server needs to access it internally.

---

## Why This Architecture?

In Codespaces, ports can require authentication. By using **server-side proxying** (Next.js → Agent via localhost), we avoid authentication issues. The browser only connects to the Next.js UI, which handles authentication via your GitHub session.

This is the same pattern used in production deployments where the frontend and backend are in the same network but not directly exposed to the internet.
