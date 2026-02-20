# port-monitor

Lightweight port monitor with web dashboard. Zero dependencies.

See which processes are using your development ports at a glance, and kill them with one click.

## Quick Start

```bash
npx port-monitor-gui
```

Open http://localhost:9999 in your browser.

## Features

- Real-time port monitoring with auto-refresh
- Process name, PID, git branch, and working directory detection
- One-click process kill
- Add/remove ports from the dashboard
- Cross-platform (macOS, Linux, Windows)
- Zero dependencies

## Usage

```bash
# Monitor default ports (3000, 4000, 5000, 5173, 8000, 8080)
npx port-monitor-gui

# Monitor specific ports
npx port-monitor-gui 3000 8000

# Custom dashboard port
npx port-monitor-gui --port 8888

# Watch specific ports (comma-separated)
npx port-monitor-gui --watch 3000,8000,5432

# Custom refresh interval (ms)
npx port-monitor-gui --refresh 1000
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
