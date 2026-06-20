# GenAI Toolbox Integration & GreptimeDB Observability Plan

## 📊 Current Situation Analysis

### Two GenAI Toolbox Installations

You have two different genai-toolbox setups in your workspace:

#### 1. **Root genai-toolbox** (`/genai-toolbox/`) - Custom TypeScript MCP Server

- **Type**: Custom TypeScript MCP server with LLM sampling
- **Purpose**: MCP server for tool orchestration with OpenTelemetry
- **Tech Stack**: TypeScript, Node.js, MCP SDK
- **Current Observability**: OpenTelemetry configured (OTLP endpoint)
- **Size**: ~362 lines of code
- **Status**: ⚠️ Configured for generic OTLP endpoint (port 4318), NOT GreptimeDB

**Key Files:**

```
genai-toolbox/
├── src/
│   ├── server.ts           # MCP server with tool registration
│   └── telemetry.ts        # OpenTelemetry setup (OTLP HTTP)
├── tools.yaml              # Tool definitions (Python-based)
├── package.json            # TypeScript dependencies
└── README.md               # Custom documentation
```

**Current Configuration:**

```typescript
// Uses generic OTLP endpoint (NOT GreptimeDB-specific)
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
```

---

#### 2. **Agent genai-toolbox** (`/agent/genai-toolbox/`) - Official Google Repository

- **Type**: Full official Google genai-toolbox (Go-based)
- **Purpose**: Production-grade MCP Toolbox for Databases
- **Tech Stack**: Go, MCP protocol, extensive database connectors
- **Features**:
  - 30+ database sources (BigQuery, Spanner, CloudSQL, AlloyDB, etc.)
  - Production-ready connection pooling
  - Authentication handling
  - Gemini CLI extension support
  - Full documentation website
- **Size**: 1000+ files, comprehensive implementation
- **Status**: ✅ Production-ready, actively maintained by Google

**Key Capabilities:**

- AlloyDB, BigQuery, Cloud SQL (MySQL/PostgreSQL/MSSQL)
- Spanner, Looker, Dataplex
- Self-hosted: MongoDB, MySQL, PostgreSQL, Redis, Cassandra, etc.
- Built-in observability hooks
- MCP-native architecture

---

## 🎯 Recommendation: Use Agent GenAI Toolbox (Official Google Repository)

### Why Choose `/agent/genai-toolbox/`?

✅ **Production-Ready**: Battle-tested by Google  
✅ **Comprehensive**: 30+ database connectors  
✅ **Maintained**: Active development, versioned releases  
✅ **Documented**: Full docs at <https://googleapis.github.io/genai-toolbox/>  
✅ **MCP-Native**: Designed for Model Context Protocol  
✅ **Extensible**: Gemini CLI extension system  
✅ **Go-Based**: Better performance for database operations

### What to Do with `/genai-toolbox/`?

Two options:

**Option A: Archive** (Recommended)

- Move to `/archive/genai-toolbox-custom/`
- Keep as reference for custom MCP server patterns
- Use its OpenTelemetry integration patterns

**Option B: Repurpose** (Advanced)

- Convert to a custom MCP wrapper for agent-specific tools
- Focus on ModMe GenUI-specific tools
- Use agent/genai-toolbox for database operations

---

## 🔧 Integration Plan: GreptimeDB + Agent GenAI Toolbox

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  ModMe GenUI Workbench                         │
└────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐  ┌────────────────────┐  ┌──────────────┐
│ Python Agent │  │ GenAI Toolbox      │  │ React UI     │
│ (Port 8000)  │  │ (Port 8080)        │  │ (Port 3000)  │
│              │  │                    │  │              │
│ observability│  │ Go MCP Server      │  │ observability│
│ greptime     │  │ + Database Tools   │  │ greptime     │
│              │  │                    │  │              │
└──────┬───────┘  └────────┬───────────┘  └──────┬───────┘
       │                   │                      │
       │ OTLP/HTTP         │ OTLP/HTTP            │ OTLP/HTTP
       │ (Proto)           │ (Proto)              │ (Proto)
       │                   │                      │
       └───────────────────┴──────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │   GreptimeDB (Port 4000)   │
              │   Unified Observability    │
              │   ─────────────────────    │
              │   Endpoints:               │
              │   /v1/otlp/v1/metrics     │
              │   /v1/otlp/v1/traces      │
              │   /v1/otlp/v1/logs        │
              └────────────────────────────┘
```

### Step-by-Step Implementation

#### Step 1: Configure GenAI Toolbox for GreptimeDB

Create `agent/genai-toolbox/tools.yaml` with observability:

```yaml
# GenAI Toolbox Configuration for GreptimeDB Observability
version: 1.0

# Observability configuration
observability:
  enabled: true
  backend: greptime
  endpoint: http://localhost:4000
  database: public
  # Authentication (if using GreptimeCloud)
  auth:
    username: ${GREPTIME_USERNAME}
    password: ${GREPTIME_PASSWORD}

# Telemetry settings
telemetry:
  metrics:
    enabled: true
    export_interval: 15s
  traces:
    enabled: true
    sampling_rate: 1.0 # 100% for development
  logs:
    enabled: true
    level: info

# Database sources
sources:
  # Your existing database connections
  postgres_local:
    kind: postgres
    host: localhost
    port: 5432
    database: modme_db
    user: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}

  # Add more sources as needed
  # bigquery:
  #   kind: bigquery
  #   project: ${GCP_PROJECT}

# Tools configuration
tools:
  # Database query tools
  - name: query_database
    source: postgres_local
    description: Execute SQL queries on local PostgreSQL

  # Add more tools as needed
```

#### Step 2: Create GreptimeDB Integration for Go Server

Create `agent/genai-toolbox/internal/telemetry/greptime.go`:

```go
package telemetry

import (
    "context"
    "fmt"
    "os"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// GreptimeDBConfig holds GreptimeDB connection configuration
type GreptimeDBConfig struct {
    Host     string
    Database string
    Username string
    Password string
}

// InitializeGreptimeDB sets up OpenTelemetry with GreptimeDB backend
func InitializeGreptimeDB(serviceName, serviceVersion string) error {
    ctx := context.Background()

    // Load configuration from environment
    config := GreptimeDBConfig{
        Host:     getEnv("GREPTIME_HOST", "localhost:4000"),
        Database: getEnv("GREPTIME_DB", "public"),
        Username: os.Getenv("GREPTIME_USERNAME"),
        Password: os.Getenv("GREPTIME_PASSWORD"),
    }

    // Create resource
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(serviceVersion),
        ),
    )
    if err != nil {
        return fmt.Errorf("failed to create resource: %w", err)
    }

    // Setup trace exporter
    traceExporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint(config.Host),
        otlptracehttp.WithURLPath("/v1/otlp/v1/traces"),
        otlptracehttp.WithInsecure(), // Use WithTLSClientConfig for production
        otlptracehttp.WithHeaders(map[string]string{
            "X-Greptime-DB-Name": config.Database,
            // Add Basic Auth if configured
        }),
    )
    if err != nil {
        return fmt.Errorf("failed to create trace exporter: %w", err)
    }

    // Setup trace provider
    traceProvider := trace.NewTracerProvider(
        trace.WithBatcher(traceExporter),
        trace.WithResource(res),
    )
    otel.SetTracerProvider(traceProvider)

    // Setup metric exporter
    metricExporter, err := otlpmetrichttp.New(ctx,
        otlpmetrichttp.WithEndpoint(config.Host),
        otlpmetrichttp.WithURLPath("/v1/otlp/v1/metrics"),
        otlpmetrichttp.WithInsecure(),
        otlpmetrichttp.WithHeaders(map[string]string{
            "X-Greptime-DB-Name": config.Database,
        }),
    )
    if err != nil {
        return fmt.Errorf("failed to create metric exporter: %w", err)
    }

    // Setup metric provider
    metricProvider := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(
            metricExporter,
            metric.WithInterval(15*time.Second),
        )),
        metric.WithResource(res),
    )
    otel.SetMeterProvider(metricProvider)

    fmt.Printf("[GreptimeDB] Observability initialized for %s\n", serviceName)
    fmt.Printf("[GreptimeDB] Endpoint: %s\n", config.Host)

    return nil
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

#### Step 3: Update GenAI Toolbox Main Entry Point

Modify `agent/genai-toolbox/main.go`:

```go
package main

import (
    "log"
    "os"

    "github.com/googleapis/genai-toolbox/internal/telemetry"
    // ... other imports
)

func main() {
    // Initialize GreptimeDB observability if configured
    if os.Getenv("GREPTIME_HOST") != "" {
        if err := telemetry.InitializeGreptimeDB("genai-toolbox", "0.24.0"); err != nil {
            log.Printf("[WARNING] Failed to initialize GreptimeDB observability: %v", err)
            // Continue without observability (graceful degradation)
        }
    }

    // ... rest of your main function
}
```

#### Step 4: Configure Environment Variables

Create `agent/genai-toolbox/.env`:

```bash
# GreptimeDB Configuration
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=

# Service metadata
SERVICE_NAME=genai-toolbox
SERVICE_VERSION=0.24.0
ENVIRONMENT=development

# Database connections
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Google Cloud (if using BigQuery, Spanner, etc.)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
# GCP_PROJECT=your-project-id
```

#### Step 5: Update `.github/copilot-instructions.md`

Add GenAI Toolbox section:

```markdown
## GenAI Toolbox Integration

**Location**: `agent/genai-toolbox/` (Official Google repository)

**Purpose**: Production-grade MCP Toolbox for database operations

**Key Features**:

- 30+ database connectors (BigQuery, Spanner, CloudSQL, etc.)
- MCP-native architecture
- OpenTelemetry observability
- GreptimeDB integration

**Configuration**: `agent/genai-toolbox/tools.yaml`

**Documentation**: https://googleapis.github.io/genai-toolbox/

**Observability**: Connected to GreptimeDB (localhost:4000)
```

---

## 🚀 Quick Start Commands

### Option 1: Run GenAI Toolbox Standalone

```powershell
# Navigate to agent/genai-toolbox
cd agent/genai-toolbox

# Set environment variables
$env:GREPTIME_HOST="localhost:4000"
$env:GREPTIME_DB="public"

# Run the server
go run main.go --tools-file tools.yaml --address 127.0.0.1 --port 8080
```

### Option 2: Run as Docker Container

```powershell
# Pull official image
docker pull us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.24.0

# Run with GreptimeDB connection
docker run -d \
  -p 8080:8080 \
  -e GREPTIME_HOST=host.docker.internal:4000 \
  -e GREPTIME_DB=public \
  -v ${PWD}/tools.yaml:/app/tools.yaml \
  us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:0.24.0 \
  --tools-file /app/tools.yaml \
  --address 0.0.0.0 \
  --port 8080
```

### Option 3: Integrate with Claude Desktop/MCP Client

Update your MCP client configuration (`%APPDATA%\Code\User\mcp.json`):

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
        "GREPTIME_DB": "public",
        "POSTGRES_USER": "your_user",
        "POSTGRES_PASSWORD": "your_password"
      }
    }
  }
}
```

---

## 📊 Metrics to Track

### GenAI Toolbox Metrics (Auto-generated)

```promql
# Database query rate
rate(genai_toolbox_queries_total[5m])

# Query duration (P95)
histogram_quantile(0.95, genai_toolbox_query_duration_seconds)

# Connection pool usage
genai_toolbox_connection_pool_active

# Error rate
rate(genai_toolbox_errors_total[5m])

# Tool invocation count
sum by(tool_name) (genai_toolbox_tool_invocations_total)
```

### Combined Dashboard Query (Python Agent + GenAI Toolbox + React UI)

```sql
-- All services request rate
SELECT
  resource_attributes->>'service.name' AS service,
  ts_bucket('1 minute', greptime_timestamp) AS time,
  count(*) AS requests
FROM opentelemetry_metrics
WHERE metric_name LIKE '%requests_total'
GROUP BY service, time
ORDER BY time DESC
LIMIT 100;
```

---

## 🔄 Migration Path for Custom genai-toolbox

If you want to preserve your custom TypeScript MCP server:

### Step 1: Archive Custom Server

```powershell
# Create archive directory
mkdir archive

# Move custom genai-toolbox
mv genai-toolbox archive/genai-toolbox-custom

# Document decision
echo "Archived on $(Get-Date) - Replaced by official Google genai-toolbox" > archive/genai-toolbox-custom/ARCHIVED.md
```

### Step 2: Extract Useful Patterns

From `genai-toolbox/src/telemetry.ts`, extract OpenTelemetry patterns for use in other TypeScript services.

### Step 3: Update All References

```powershell
# Search for references
grep -r "genai-toolbox" --include="*.md" --include="*.json" --include="*.yaml"

# Update documentation
# Update copilot-instructions.md
# Update package.json scripts if applicable
```

---

## 🎯 Final Recommendation

### Immediate Actions

1. ✅ **Use `agent/genai-toolbox`** (Official Google repository)
2. ✅ **Archive `/genai-toolbox`** → `/archive/genai-toolbox-custom`
3. ✅ **Configure GreptimeDB** in `agent/genai-toolbox/tools.yaml`
4. ✅ **Add Go telemetry integration** (greptime.go file above)
5. ✅ **Update environment variables** (.env file)
6. ✅ **Test connection** with sample database query

### Benefits of This Approach

✅ **Single Source of Truth**: One production-grade toolbox  
✅ **Unified Observability**: All services → GreptimeDB  
✅ **Scalable**: Add databases easily with official connectors  
✅ **Maintained**: Google actively develops this  
✅ **MCP-Native**: Built for Model Context Protocol from ground up  
✅ **Documented**: Comprehensive docs and examples

### Next Steps

1. Review `agent/genai-toolbox/README.md`
2. Configure your first database source (PostgreSQL/BigQuery/etc.)
3. Test tool invocation from Claude Desktop or your Python agent
4. Verify metrics in GreptimeDB
5. Create Grafana dashboard for combined metrics

---

## 📚 Resources

- **GenAI Toolbox Docs**: <https://googleapis.github.io/genai-toolbox/>
- **GitHub Repository**: <https://github.com/googleapis/genai-toolbox>
- **MCP Protocol**: <https://modelcontextprotocol.io/>
- **GreptimeDB Docs**: <https://docs.greptime.com/>
- **OpenTelemetry Go**: <https://opentelemetry.io/docs/languages/go/>

---

**Decision**: Use `/agent/genai-toolbox` (Official Google repository) + Add GreptimeDB observability integration

**Status**: Ready for implementation ✅
