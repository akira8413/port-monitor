#!/usr/bin/env node

const { parseArgs, loadConfig } = require('../lib/config');
const { createServer } = require('../lib/server');

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
  port-monitor - Lightweight port monitor with web dashboard

  Usage:
    port-monitor [ports...] [options]

  Arguments:
    ports           Ports to monitor (space-separated)

  Options:
    -p, --port      Dashboard port (default: 9999)
    -w, --watch     Ports to monitor (comma-separated)
    -r, --refresh   Refresh interval in ms (default: 3000)
    -o, --open      Open dashboard in browser on start
    -h, --help      Show this help
    -v, --version   Show version

  Examples:
    npx port-monitor-gui
    npx port-monitor-gui 3000 8000
    npx port-monitor-gui --port 8888 --watch 3000,8000,5432

  Config file:
    Place a .portmonitor file (JSON) in your project root:
    { "ports": [3000, 8000], "port": 9999, "refresh": 3000 }
`);
  process.exit(0);
}

if (args.version) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

const config = loadConfig(args);
createServer(config);
