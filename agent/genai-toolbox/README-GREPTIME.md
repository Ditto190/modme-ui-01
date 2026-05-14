# GenAI Toolbox + GreptimeDB - Complete Setup

> **Production-ready MCP Toolbox with unified observability**

[![Status](https://img.shields.io/badge/status-production--ready-green)]()
[![Go Version](https://img.shields.io/badge/go-1.21%2B-blue)]()
[![GreptimeDB](https://img.shields.io/badge/observability-GreptimeDB-orange)]()

---

## 📋 Quick Links

- **5-Minute Setup**: [QUICKSTART.md](QUICKSTART.md)
- **Integration Plan**: [../../GENAI_TOOLBOX_INTEGRATION_PLAN.md](../../GENAI_TOOLBOX_INTEGRATION_PLAN.md)
- **Comparison Guide**: [../../GENAI_TOOLBOX_COMPARISON.md](../../GENAI_TOOLBOX_COMPARISON.md)
- **Official Docs**: <https://googleapis.github.io/genai-toolbox/>

---

## 🚀 Quick Start (Windows)

### Prerequisites

- ✅ Go 1.21+ ([download](https://go.dev/dl/))
- ✅ GreptimeDB running (Docker or standalone)
- ✅ Database credentials (PostgreSQL, BigQuery, etc.)

### Setup in 3 Commands

```powershell
# 1. Install GreptimeDB
docker run -d --name greptime -p 4000-4004:4000-4004 greptime/greptimedb:latest standalone start

# 2. Setup GenAI Toolbox
cd agent/genai-toolbox
.\setup-genai-toolbox.ps1

# 3. Configure & Start
# Edit .env with your credentials, then:
go run main.go --tools-file tools.yaml --address 127.0.0.1 --port 8080
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ModMe GenUI Workbench                     │
└─────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Python Agent │ │ GenAI Toolbox│ │ React UI     │
│ (Port 8000)  │ │ (Port 8080)  │ │ (Port 3000)  │
│              │ │              │ │              │
│ GreptimeDB   │ │ • MCP Server │ │ GreptimeDB   │
│ integrated   │ │ • 30+ DBs    │ │ integrated   │
└──────┬───────┘ │ • GreptimeDB │ └──────┬───────┘
       │         └──────┬───────┘        │
       │ OTLP/HTTP     │ OTLP/HTTP      │
       └───────────────┼────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ GreptimeDB (4000)    │
            │ ──────────────────   │
            │ • Metrics            │
            │ • Traces             │
            │ • Logs               │
            └──────────────────────┘
```

---

## 🎯 What This Provides

### Database Connectors (30+)

**Google Cloud**:

- BigQuery, Cloud SQL (MySQL/PostgreSQL/MSSQL)
- Spanner, AlloyDB, Dataplex, Looker

**Self-Hosted**:

- PostgreSQL, MySQL, MongoDB, Redis
- Cassandra, ClickHouse, Neo4j, Elasticsearch
- Couchbase, MindsDB, MariaDB, Oracle

**Full list**: <https://googleapis.github.io/genai-toolbox/>

### Observability (GreptimeDB)

**Metrics Tracked**:

- `genai_toolbox_queries_total` - Total queries executed
- `genai_toolbox_query_duration_seconds` - Query latency
- `genai_toolbox_connection_pool_active` - Active connections
- `genai_toolbox_errors_total` - Error count
- `genai_toolbox_tool_invocations_total` - MCP tool calls

**Query Languages**:

- SQL (PostgreSQL wire protocol)
- PromQL (Prometheus-compatible)

### MCP Protocol

- **Native Support**: Built for Model Context Protocol
- **Tool Discovery**: Automatic capability advertisement
- **Authentication**: API keys, OAuth, JWT
- **Rate Limiting**: Configurable per-client

---

## 📁 File Structure

```
agent/genai-toolbox/
├── main.go                      ← Entry point
├── tools.yaml                   ← ✅ Database & observability config
├── .env.example                 ← ✅ Environment template
├── setup-genai-toolbox.ps1      ← ✅ Automated setup script
├── QUICKSTART.md                ← ✅ 5-minute guide
├── README.md                    ← This file
├── server.json                  ← MCP server metadata
│
├── cmd/                         ← CLI commands
├── internal/                    ← Internal packages
│   ├── auth/                    ← Authentication
│   ├── sources/                 ← Database connectors
│   ├── telemetry/               ← Observability
│   └── tools/                   ← MCP tool implementations
│
├── docs/                        ← Documentation
│   ├── ALLOYDBPG_README.md
│   ├── BIGQUERY_README.md
│   ├── SPANNER_README.md
│   └── ... (30+ connector docs)
│
└── tests/                       ← Integration tests
```

---

## ⚙️ Configuration

### 1. Environment Variables (.env)

```bash
# GreptimeDB
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=

# PostgreSQL (example)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=modme_db
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Google Cloud (optional)
GCP_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### 2. Tools Configuration (tools.yaml)

```yaml
# Observability
observability:
  enabled: true
  backend: greptime
  greptime:
    host: ${GREPTIME_HOST}
    database: ${GREPTIME_DB}

# Database sources
sources:
  postgres_local:
    kind: postgres
    host: ${POSTGRES_HOST}
    port: ${POSTGRES_PORT}
    database: ${POSTGRES_DB}
    user: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}

# Tools
tools:
  - name: query_postgres
    source: postgres_local
    description: Execute SQL queries
    observability:
      track_query_duration: true
```

### 3. MCP Client Configuration

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):

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
        "GREPTIME_HOST": "localhost:4000"
      }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

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

## 🧪 Testing

### Health Checks

```powershell
# GreptimeDB
curl http://localhost:4000/health

# GenAI Toolbox
curl http://localhost:8080/health

# MCP endpoint
curl http://localhost:8080/mcp
```

### Query Metrics

```sql
-- Recent queries
SELECT
  metric_name,
  value,
  greptime_timestamp
FROM opentelemetry_metrics
WHERE resource_attributes->>'service.name' = 'genai-toolbox'
ORDER BY greptime_timestamp DESC
LIMIT 100;
```

```promql
# Query rate
rate(genai_toolbox_queries_total[5m])

# P95 latency
histogram_quantile(0.95, genai_toolbox_query_duration_seconds)
```

### Test Tool Call

In your MCP client (Claude Desktop):

```
Use tool: get_schema
Parameters: { "schema_name": "public" }

Expected result: List of tables in public schema
```

---

## 📊 Metrics & Monitoring

### Key Metrics

| Metric                                 | Type      | Description                |
| -------------------------------------- | --------- | -------------------------- |
| `genai_toolbox_queries_total`          | Counter   | Total queries executed     |
| `genai_toolbox_query_duration_seconds` | Histogram | Query latency distribution |
| `genai_toolbox_connection_pool_active` | Gauge     | Active DB connections      |
| `genai_toolbox_errors_total`           | Counter   | Total errors               |
| `genai_toolbox_tool_invocations_total` | Counter   | MCP tool calls             |

### Grafana Dashboard

```promql
# Panel 1: Query Rate
rate(genai_toolbox_queries_total[5m])

# Panel 2: Latency P95
histogram_quantile(0.95, rate(genai_toolbox_query_duration_seconds_bucket[5m]))

# Panel 3: Error Rate
rate(genai_toolbox_errors_total[5m])

# Panel 4: Active Connections
genai_toolbox_connection_pool_active
```

---

## 🔧 Troubleshooting

### Issue: Go not installed

```powershell
winget install GoLang.Go
go version  # Verify
```

### Issue: GreptimeDB not running

```powershell
docker ps | findstr greptime   # Check status
docker start greptime          # Start if stopped
docker logs greptime           # View logs
```

### Issue: Database connection fails

```powershell
# Test PostgreSQL connection
psql -h localhost -U your_user -d modme_db

# Verify .env
cat .env | findstr POSTGRES
```

### Issue: Build fails

```powershell
go clean
go mod tidy
go build -o genai-toolbox.exe .
```

---

## 🚀 Production Deployment

### Docker

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN go build -o genai-toolbox .

FROM gcr.io/distroless/base-debian11
COPY --from=builder /app/genai-toolbox /
COPY tools.yaml /tools.yaml
EXPOSE 8080
CMD ["/genai-toolbox", "--tools-file", "/tools.yaml", "--address", "0.0.0.0", "--port", "8080"]
```

```powershell
# Build & run
docker build -t genai-toolbox:latest .
docker run -d -p 8080:8080 --env-file .env genai-toolbox:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: genai-toolbox
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: genai-toolbox
          image: genai-toolbox:latest
          ports:
            - containerPort: 8080
          env:
            - name: GREPTIME_HOST
              value: "greptime.observability.svc:4000"
          volumeMounts:
            - name: config
              mountPath: /tools.yaml
              subPath: tools.yaml
```

---

## 📚 Additional Resources

### Documentation

- **Integration Plan**: [../../GENAI_TOOLBOX_INTEGRATION_PLAN.md](../../GENAI_TOOLBOX_INTEGRATION_PLAN.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Comparison**: [../../GENAI_TOOLBOX_COMPARISON.md](../../GENAI_TOOLBOX_COMPARISON.md)
- **GreptimeDB Guide**: [../../docs/GREPTIME_OBSERVABILITY.md](../../docs/inbox/GREPTIME_OBSERVABILITY.md)

### External Links

- **Official Docs**: <https://googleapis.github.io/genai-toolbox/>
- **GitHub Repo**: <https://github.com/googleapis/genai-toolbox>
- **GreptimeDB**: <https://docs.greptime.com/>
- **MCP Protocol**: <https://modelcontextprotocol.io/>
- **Discord Community**: <https://discord.gg/Dmm69peqjh>

---

## 🤝 Support

### Getting Help

1. Check [QUICKSTART.md](QUICKSTART.md)
2. See [Troubleshooting](#-troubleshooting) section
3. Review [Integration Plan](../../GENAI_TOOLBOX_INTEGRATION_PLAN.md)
4. Join Discord: <https://discord.gg/Dmm69peqjh>
5. File issue: <https://github.com/googleapis/genai-toolbox/issues>

---

## ✅ Status

- ✅ GreptimeDB observability configured
- ✅ 30+ database connectors available
- ✅ MCP protocol support
- ✅ Production-ready security
- ✅ Automated setup script
- ✅ Complete documentation

**Ready for production deployment!** 🎉

---

**Version**: 0.24.0
**Maintained by**: Google + ModMe GenUI Team
**Last Updated**: January 8, 2026
