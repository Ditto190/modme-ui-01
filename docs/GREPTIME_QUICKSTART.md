# GreptimeDB Observability - Quick Start

## 🚀 5-Minute Setup

### 1. Install GreptimeDB (Local Development)

**Option A: Docker (Recommended)**

```bash
docker run -d --name greptimedb \
  -p 4000-4004:4000-4004 \
  -v greptimedb_data:/tmp/greptimedb \
  greptime/greptimedb:latest standalone start
```

**Option B: Binary**

- Download: https://github.com/GreptimeTeam/greptimedb/releases
- Run: `./greptime standalone start`

**Option C: Use GreptimeCloud**

- Sign up: https://greptime.com/product/cloud
- Get connection details from dashboard

### 2. Configure Environment

Copy `.env.greptime.example` to `.env` and update:

```bash
# Local
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=

# Or GreptimeCloud
GREPTIME_HOST=your-instance.greptime.cloud:443
GREPTIME_DB=your-db
GREPTIME_USERNAME=your-user
GREPTIME_PASSWORD=your-password
```

### 3. Verify Connection

```bash
curl http://localhost:4000/health
# Should return: {"version":"0.x.x"}
```

### 4. Start Application

```bash
npm run dev
```

Observability will auto-initialize if `GREPTIME_HOST` is set!

## 📊 View Metrics

### Query with curl

```bash
# Check metrics are being sent
curl http://localhost:4000/v1/sql \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sql=SELECT * FROM opentelemetry_metrics LIMIT 10"
```

### Query with Grafana

1. Start Grafana:

   ```bash
   docker run -d -p 3001:3000 grafana/grafana
   ```

2. Open: http://localhost:3001 (admin/admin)

3. Add Data Source:

   - Type: **Prometheus**
   - URL: `http://localhost:4000/v1/prometheus`
   - Save & Test

4. Create Dashboard:
   - Query: `rate(http_requests_total[5m])`
   - Chart Type: Time series

## 📖 Full Documentation

See [GREPTIME_OBSERVABILITY.md](../docs/GREPTIME_OBSERVABILITY.md) for:

- Architecture diagrams
- Complete metrics reference
- Custom instrumentation examples
- Production deployment guide
- Troubleshooting

## 🔍 Key Metrics

| Metric                   | Description            | Labels                |
| ------------------------ | ---------------------- | --------------------- |
| `http_requests_total`    | HTTP requests          | `endpoint`, `status`  |
| `agent_tool_calls_total` | Agent tool invocations | `tool_name`, `status` |
| `state_elements_count`   | UI elements in state   | -                     |

## ⚡ Quick Queries (PromQL)

```promql
# Request rate (per second)
rate(http_requests_total[5m])

# Tool call success rate
rate(agent_tool_calls_total{status="success"}[5m])
/
rate(agent_tool_calls_total[5m])

# Current canvas size
state_elements_count
```

## 🐛 Troubleshooting

### No metrics appearing?

```bash
# Check GreptimeDB is running
curl http://localhost:4000/health

# Check agent logs
npm run dev:agent
# Look for: "[GreptimeDB] Observability initialized"
```

### Connection refused?

```bash
# Verify host/port
echo $GREPTIME_HOST  # or: $env:GREPTIME_HOST on Windows

# Test endpoint
curl http://localhost:4000/v1/otlp/v1/metrics
```

## 🎯 Next Steps

- [x] GreptimeDB running
- [x] Environment configured
- [x] Application started
- [ ] Create Grafana dashboard
- [ ] Add custom metrics
- [ ] Configure alerts
- [ ] Review [GREPTIME_OBSERVABILITY.md](../docs/GREPTIME_OBSERVABILITY.md)

---

**Need help?** See full docs at [GREPTIME_OBSERVABILITY.md](../docs/GREPTIME_OBSERVABILITY.md)
