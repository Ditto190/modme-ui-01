#!/usr/bin/env bash
# Unified MCP Server Manager - Bash version
# Discovers and starts all available MCP servers

set -euo pipefail

# Parse arguments
FORCE=0
WAIT_FOR_READY=0
VERBOSE=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=1
            shift
            ;;
        --wait|-w)
            WAIT_FOR_READY=1
            shift
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            cat << EOF
Unified MCP Server Manager

Usage: $0 [OPTIONS]

Options:
    -f, --force         Force restart even if already running
    -w, --wait          Wait for health checks on servers with ports
    -v, --verbose       Show detailed output
    -h, --help          Show this help message

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Get script directory and repo root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

# Color output helpers
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_detail() { [[ $VERBOSE -eq 1 ]] && echo -e "\033[90m   $1\033[0m" || true; }

# Server registry array
declare -a SERVERS=()
declare -a SERVER_NAMES=()
declare -a SERVER_TYPES=()
declare -a SERVER_PATHS=()
declare -a SERVER_LOGS=()
declare -a SERVER_PORTS=()

echo ""
echo -e "\033[36m🚀 MCP Server Manager\033[0m"
echo -e "\033[36m============================================================\033[0m"
echo ""

# ============================================================================
# 1. Discover .copilot/mcp-servers/ scripts
# ============================================================================
print_info "Scanning .copilot/mcp-servers/ for startup scripts..."
MCP_DIR="$ROOT/.copilot/mcp-servers"
if [[ -d "$MCP_DIR" ]]; then
    script_count=0
    while IFS= read -r -d '' file; do
        basename=$(basename "$file")
        name="${basename%.*}"
        ext="${basename##*.}"

        if [[ "$ext" =~ ^(sh|ps1|bat|cmd)$ ]]; then
            SERVER_NAMES+=("$name (script)")
            SERVER_TYPES+=("Script")
            SERVER_PATHS+=("$file")
            SERVER_LOGS+=("$LOG_DIR/mcp-$name.log")
            SERVER_PORTS+=("")
            ((script_count++))
            print_detail "Found script: $basename"
        fi
    done < <(find "$MCP_DIR" -maxdepth 1 -type f -print0)

    if [[ $script_count -gt 0 ]]; then
        print_success "Found $script_count MCP startup scripts"
    fi
else
    print_warning "Directory not found: $MCP_DIR"
fi

# ============================================================================
# 2. Discover Python MCP servers in agent/
# ============================================================================
print_info "Scanning agent/ for Python MCP servers..."
AGENT_DIR="$ROOT/agent"
if [[ -d "$AGENT_DIR" ]]; then
    python_count=0
    while IFS= read -r -d '' file; do
        basename=$(basename "$file")
        name="${basename%_mcp_server.py}"

        # Assign ports for known servers
        port=""
        case "$basename" in
            journal_mcp_server.py) port="8002" ;;
        esac

        SERVER_NAMES+=("$name (Python MCP)")
        SERVER_TYPES+=("PythonMCP")
        SERVER_PATHS+=("$file")
        SERVER_LOGS+=("$LOG_DIR/mcp-$name.log")
        SERVER_PORTS+=("$port")
        ((python_count++))
        print_detail "Found Python MCP: $basename${port:+ (port $port)}"
    done < <(find "$AGENT_DIR" -maxdepth 1 -type f -name "*_mcp_server.py" -print0)

    if [[ $python_count -gt 0 ]]; then
        print_success "Found $python_count Python MCP servers"
    fi
else
    print_warning "Directory not found: $AGENT_DIR"
fi

# ============================================================================
# 3. ChromaDB Server
# ============================================================================
print_info "Checking for ChromaDB server..."
CHROMA_SCRIPT="$ROOT/scripts/start_chroma_server.py"
if [[ -f "$CHROMA_SCRIPT" ]]; then
    SERVER_NAMES+=("chroma-db (HTTP)")
    SERVER_TYPES+=("ChromaDB")
    SERVER_PATHS+=("$CHROMA_SCRIPT")
    SERVER_LOGS+=("$LOG_DIR/mcp-chroma-db.log")
    SERVER_PORTS+=("8001")
    print_success "Found ChromaDB server (port 8001)"
else
    print_detail "ChromaDB server script not found at: $CHROMA_SCRIPT"
fi

# ============================================================================
# 4. Load mcp_config.json servers
# ============================================================================
print_info "Scanning for mcp_config.json files..."
config_count=0
while IFS= read -r -d '' config_file; do
    if command -v jq &> /dev/null; then
        # Parse with jq if available
        while IFS= read -r server_name; do
            SERVER_NAMES+=("$server_name (configured)")
            SERVER_TYPES+=("Configured")
            SERVER_PATHS+=("$config_file")
            SERVER_LOGS+=("$LOG_DIR/mcp-$server_name.log")
            SERVER_PORTS+=("")
            ((config_count++))
            print_detail "Found configured server: $server_name from $config_file"
        done < <(jq -r '.mcpServers | keys[]' "$config_file" 2>/dev/null || true)
    else
        print_warning "jq not installed, skipping JSON parsing for: $config_file"
    fi
done < <(find "$ROOT" -type f -name "mcp_config.json" -print0 2>/dev/null)

if [[ $config_count -gt 0 ]]; then
    print_success "Found $config_count configured servers"
fi

echo ""
echo -e "\033[36m📊 Total servers discovered: ${#SERVER_NAMES[@]}\033[0m"
echo ""

if [[ ${#SERVER_NAMES[@]} -eq 0 ]]; then
    print_warning "No MCP servers found. Nothing to start."
    exit 0
fi

# ============================================================================
# Helper Functions
# ============================================================================

is_port_open() {
    local port=$1
    if command -v nc &> /dev/null; then
        nc -z localhost "$port" 2>/dev/null
    elif command -v netstat &> /dev/null; then
        netstat -an | grep -q ":$port.*LISTEN"
    else
        # Fallback: try to connect with bash
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null
    fi
}

is_server_running() {
    local port=$1
    local path=$2

    # Check by port if available
    if [[ -n "$port" ]]; then
        is_port_open "$port"
        return $?
    fi

    # Check by command line
    if [[ -n "$path" ]]; then
        pgrep -f "$path" > /dev/null 2>&1
        return $?
    fi

    return 1
}

start_script_server() {
    local path=$1
    local log=$2
    local ext="${path##*.}"

    case "$ext" in
        sh)
            bash "$path" > "$log" 2>&1 &
            ;;
        ps1)
            if command -v pwsh &> /dev/null; then
                pwsh -NoProfile -ExecutionPolicy Bypass -File "$path" > "$log" 2>&1 &
            else
                print_error "PowerShell not found"
                return 1
            fi
            ;;
        *)
            "$path" > "$log" 2>&1 &
            ;;
    esac
}

start_python_server() {
    local path=$1
    local log=$2
    local port=$3

    # Find Python command
    local python_cmd="python3"
    if command -v python &> /dev/null; then
        python_cmd="python"
    fi

    # Check for venv
    local venv_python="$ROOT/agent/.venv/bin/python"
    if [[ -f "$venv_python" ]]; then
        python_cmd="$venv_python"
        print_detail "Using venv Python: $venv_python"
    fi

    # Build args
    local args=("$path")
    if [[ -n "$port" ]]; then
        args+=("--port" "$port")
    fi

    "$python_cmd" "${args[@]}" > "$log" 2>&1 &
}

# ============================================================================
# Main startup loop
# ============================================================================

STARTED=0
SKIPPED=0
FAILED=0

for ((i=0; i<${#SERVER_NAMES[@]}; i++)); do
    name="${SERVER_NAMES[$i]}"
    type="${SERVER_TYPES[$i]}"
    path="${SERVER_PATHS[$i]}"
    log="${SERVER_LOGS[$i]}"
    port="${SERVER_PORTS[$i]}"

    echo ""
    echo -e "\033[36m🔧 $name\033[0m"

    # Check if already running
    if [[ $FORCE -eq 0 ]] && is_server_running "$port" "$path"; then
        print_success "Already running"
        ((SKIPPED++))
        continue
    fi

    # Start server based on type
    case "$type" in
        Script)
            if start_script_server "$path" "$log"; then
                print_success "Started successfully"
                print_detail "Logs: $log"
                ((STARTED++))
            else
                print_error "Failed to start"
                ((FAILED++))
            fi
            ;;
        PythonMCP|ChromaDB)
            if start_python_server "$path" "$log" "$port"; then
                print_success "Started successfully"
                print_detail "Logs: $log"
                ((STARTED++))
            else
                print_error "Failed to start"
                ((FAILED++))
            fi
            ;;
        Configured)
            print_warning "Configured servers not yet implemented in bash version"
            ((SKIPPED++))
            ;;
    esac

    # Optional: Wait for health check
    if [[ $WAIT_FOR_READY -eq 1 ]] && [[ -n "$port" ]]; then
        print_info "Waiting for port $port to be ready..."
        retry_count=0
        max_retries=30
        ready=0

        while [[ $retry_count -lt $max_retries ]]; do
            sleep 1
            if is_port_open "$port"; then
                print_success "Server is ready on port $port!"
                ready=1
                break
            fi
            ((retry_count++))
            echo -n "."
        done
        echo ""

        if [[ $ready -eq 0 ]]; then
            print_warning "Server did not become ready within 30 seconds"
        fi
    fi
done

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "\033[36m============================================================\033[0m"
echo -e "\033[36m📊 MCP Server Startup Summary\033[0m"
echo -e "\033[36m============================================================\033[0m"
print_success "Started: $STARTED"
print_info "Already running: $SKIPPED"
[[ $FAILED -gt 0 ]] && print_error "Failed: $FAILED" || true
echo ""
print_info "📁 Logs directory: $LOG_DIR"
echo ""

if [[ $((STARTED + SKIPPED)) -gt 0 ]]; then
    print_success "MCP servers are ready!"
fi

exit $(( FAILED > 0 ? 1 : 0 ))
