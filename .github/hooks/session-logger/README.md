Session Logger hook

PowerShell session logger for Cursor/Copilot on Windows. Logs JSON lines under `logs/copilot/`.

## Configuration

[`config.json`](config.json) — tracked docs, event types, log directory.

## Actions

| Action | Purpose |
|--------|---------|
| `start` | sessionStart — writes `session.log` |
| `end` | sessionEnd |
| `prompt` | User prompt text → `prompts.log` |
| `event` | Behavioral / hookFire → `events.log` |

## Usage

```powershell
.\.github\hooks\session-logger\session-logger.ps1 -Action start
.\.github\hooks\session-logger\session-logger.ps1 -Action end -SessionId <id>
.\.github\hooks\session-logger\session-logger.ps1 -Action prompt -SessionId <id> -Message "..."
.\.github\hooks\session-logger\session-logger.ps1 -Action event -EventName hookFire -SessionId <id>
```

Set `SKIP_LOGGING=1` to disable. Wired from [`.cursor/hooks/session-bootstrap.ps1`](../../.cursor/hooks/session-bootstrap.ps1) and [`session-capture.ps1`](../../.cursor/hooks/session-capture.ps1).

## Eval pipeline

```powershell
yarn eval:collect
yarn eval:report
```

See [`docs/evaluation/ARCHITECTURE.md`](../../../docs/evaluation/ARCHITECTURE.md).
