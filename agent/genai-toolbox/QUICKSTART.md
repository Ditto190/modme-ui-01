# GenAI Toolbox + GreptimeDB Quick Start

> **5-minute setup for unified observability across all AI models**

## Prerequisites

- ✅ Go 1.21+ installed ([download](https://go.dev/dl/))
- ✅ GreptimeDB running (Docker or standalone)
- ✅ Database credentials (PostgreSQL, BigQuery, etc.)

---

## Quick Start (Windows)

### 1. Install GreptimeDB

```powershell
# Option A: Docker (Recommended)
docker run -d --name greptime `
  -p 4000-4004:4000-4004 `
  -v greptime_data:/tmp/greptimedb `
  greptime/greptimedb:latest standalone start

# Option B: Standalone binary
# Download from: https://github.com/GreptimeTeam/greptimedb/releases
```

### 2. Setup GenAI Toolbox

```powershell
cd agent/genai-toolbox

# Run automated setup
.\setup-genai-toolbox.ps1

# This will:
# - Verify Go installation
# - Create .env from template
# - Install dependencies
# - Check GreptimeDB connectivity
# - Build the server
```

### 3. Configure Environment

Edit `agent/genai-toolbox/.env`:

```bash
# GreptimeDB
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public

# PostgreSQL (example)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=modme_db
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
```

### 4. Start the Server

```powershell
# Option A: Run directly
go run main.go --tools-file tools.yaml --address 127.0.0.1 --port 8080

# Option B: Use built executable
.\genai-toolbox.exe --tools-file tools.yaml --address 127.0.0.1 --port 8080
```

### 5. Verify Setup

```powershell
# Check GreptimeDB
curl http://localhost:4000/health

# Check GenAI Toolbox
curl http://localhost:8080/health

# Test MCP endpoint
curl http://localhost:8080/mcp
```

---

## Configure MCP Client

### Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "genai-toolbox": {
      "command": "go",
      "args": [
        "run",
        "main.go",
        "--tools-file",
        "tools.yaml",
        "--address",
        "127.0.0.1",
        "--port",
        "8080"
      ],
      "cwd": "C:/Users/dylan/.claude-worktrees/modme-ui-01/relaxed-hugle/agent/genai-toolbox",
      "env": {
        "GREPTIME_HOST": "localhost:4000",
        "GREPTIME_DB": "public"
      }
    }
  }
}
```

### VS Code MCP

Edit `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "genai-toolbox": {
      "command": "go",
      "args": ["run", "main.go", "--tools-file", "tools.yaml"],
      "cwd": "${workspaceFolder}/agent/genai-toolbox",
      "env": {
        "GREPTIME_HOST": "localhost:4000"
      }
    }
  }
}
```

---

## Query Metrics

### PromQL (Grafana)

```promql
# Database query rate
rate(genai_toolbox_queries_total[5m])

# Query duration P95
histogram_quantile(0.95, genai_toolbox_query_duration_seconds)

# Active connections
genai_toolbox_connection_pool_active
```

### SQL (GreptimeDB)

```sql
-- Recent metrics
SELECT
  metric_name,
  value,
  labels,
  greptime_timestamp
FROM opentelemetry_metrics
WHERE resource_attributes->>'service.name' = 'genai-toolbox'
ORDER BY greptime_timestamp DESC
LIMIT 100;

-- Query rate per minute
SELECT
  ts_bucket('1 minute', greptime_timestamp) AS time,
  count(*) AS queries
FROM opentelemetry_metrics
WHERE metric_name = 'genai_toolbox_queries_total'
GROUP BY time
ORDER BY time DESC
LIMIT 60;
```

---

## Test with Example Query

```powershell
# Using MCP protocol (requires MCP client)
# In Claude Desktop or your MCP client:

# 1. Get database schema
Use tool: get_schema
Parameters: { "schema_name": "public" }

# 2. Describe a table
Use tool: describe_table
Parameters: { "table_name": "users" }

# 3. Execute a query
Use tool: query_postgres
Parameters: {
  "query": "SELECT * FROM users LIMIT 10"
}
```

---

## Troubleshooting

### Issue: Go not found

```powershell
# Install Go
winget install GoLang.Go

# Verify
go version
```

### Issue: GreptimeDB not accessible

```powershell
# Check if running
docker ps | findstr greptime

# Start if stopped
docker start greptime

# View logs
docker logs greptime
```

### Issue: Build fails

```powershell
# Clean and rebuild
go clean
go mod tidy
go build -o genai-toolbox.exe .
```

### Issue: Database connection fails

```powershell
# Test connection manually
# PostgreSQL example:
psql -h localhost -U your_user -d modme_db

# Check .env configuration
cat .env | findstr POSTGRES
```

---

## Next Steps

1. **Add More Data Sources**: Edit `tools.yaml` to add BigQuery, Spanner, etc.
2. **Create Grafana Dashboards**: Connect Grafana to GreptimeDB
3. **Configure Authentication**: Add API keys for production
4. **Deploy to Production**: Use Docker or Kubernetes

---

## Architecture Overview

```
┌─────────────────┐
│ Claude Desktop  │
│ (MCP Client)    │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────────────┐
│ GenAI Toolbox           │
│ (Port 8080)             │
│ - Tool: query_postgres  │
│ - Tool: get_schema      │
│ - Tool: describe_table  │
└────────┬────────────────┘
         │ OpenTelemetry
         │ OTLP/HTTP
         ▼
┌─────────────────────────┐      ┌─────────────┐
│ GreptimeDB              │      │ PostgreSQL  │
│ (Port 4000)             │◄─────│ Your DB     │
│ - Metrics               │      └─────────────┘
│ - Traces                │
│ - Logs                  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Grafana (Optional)      │
│ (Port 3001)             │
│ - Dashboards            │
│ - Alerts                │
└─────────────────────────┘
```

---

## Key Metrics to Monitor

| Metric                                 | Description            | Query                                   |
| -------------------------------------- | ---------------------- | --------------------------------------- |
| `genai_toolbox_queries_total`          | Total database queries | `rate(genai_toolbox_queries_total[5m])` |
| `genai_toolbox_query_duration_seconds` | Query latency          | `histogram_quantile(0.95, ...)`         |
| `genai_toolbox_connection_pool_active` | Active DB connections  | Direct gauge value                      |
| `genai_toolbox_errors_total`           | Error count            | `rate(genai_toolbox_errors_total[5m])`  |
| `genai_toolbox_tool_invocations_total` | MCP tool calls         | `sum by(tool_name) (...)`               |

---

## Resources

- **GenAI Toolbox Docs**: <https://googleapis.github.io/genai-toolbox/>
- **GreptimeDB Docs**: <https://docs.greptime.com/>
- **MCP Protocol**: <https://modelcontextprotocol.io/>
- **Integration Plan**: [GENAI_TOOLBOX_INTEGRATION_PLAN.md](../../GENAI_TOOLBOX_INTEGRATION_PLAN.md)

---

**Setup Time**: ~5 minutes  
**Status**: Production-Ready ✅
