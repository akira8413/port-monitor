# port-monitor

Lightweight port monitor with web dashboard. Zero dependencies.

See which processes are using your development ports at a glance, and kill them with one click.

## Quick Start

```bash
git clone https://github.com/akira8413/port-monitor.git
cd port-monitor
node bin/cli.js --open
```

Dashboard opens at http://localhost:9999.

## Features

- Real-time port monitoring with auto-refresh
- **All Ports** mode: auto-discover every listening port on the system
- Dev / System categorization with filter toggle
- Click to name any port (e.g., "frontend", "api")
- One-click process kill
- Process name, PID, git branch, and working directory detection
- Dynamic favicon (green/amber/red) shows port health at a glance
- Tab title shows active count: `(3/6) Port Monitor`
- `--open` to auto-launch browser on start
- Cross-platform (macOS, Linux, Windows)
- Zero dependencies

## Usage

```bash
# Monitor default ports (3000, 4000, 5000, 5173, 8000, 8080)
node bin/cli.js

# Monitor specific ports
node bin/cli.js 3000 8000

# Custom dashboard port
node bin/cli.js --port 8888

# Watch specific ports (comma-separated)
node bin/cli.js --watch 3000,8000,5432

# Custom refresh interval (ms)
node bin/cli.js --refresh 1000

# Open browser automatically
node bin/cli.js --open
```

## CLI Options

```
port-monitor [ports...] [options]

Arguments:
  ports           Ports to monitor (space-separated)

Options:
  -p, --port      Dashboard port (default: 9999)
  -w, --watch     Ports to monitor (comma-separated)
  -r, --refresh   Refresh interval in ms (default: 3000)
  -o, --open      Open dashboard in browser on start
  -h, --help      Show help
  -v, --version   Show version
```

## Config File

Place a `.portmonitor` file (JSON) in your project root:

```json
{
  "ports": [3000, 8000, 5432],
  "names": { "3000": "frontend", "8000": "api", "5432": "postgres" },
  "port": 9999,
  "refresh": 3000
}
```

Priority: CLI args > `.portmonitor` > defaults

## License

MIT
