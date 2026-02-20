const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  port: 9999,
  ports: [3000, 4000, 5000, 5173, 8000, 8080],
  refresh: 3000,
  names: {},
  open: false,
};

function parseArgs(argv) {
  const result = { positionalPorts: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-v' || arg === '--version') {
      result.version = true;
    } else if (arg === '-p' || arg === '--port') {
      result.port = parseInt(argv[++i], 10);
    } else if (arg === '-w' || arg === '--watch') {
      result.watch = argv[++i].split(',').map(Number).filter(Boolean);
    } else if (arg === '-r' || arg === '--refresh') {
      result.refresh = parseInt(argv[++i], 10);
    } else if (arg === '-o' || arg === '--open') {
      result.open = true;
    } else if (/^\d+$/.test(arg)) {
      result.positionalPorts.push(parseInt(arg, 10));
    }
    i++;
  }
  return result;
}

function loadConfigFile() {
  try {
    const filePath = path.join(process.cwd(), '.portmonitor');
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function loadConfig(args) {
  const file = loadConfigFile();
  const config = { ...DEFAULTS };

  // Layer 2: .portmonitor file
  if (file.port != null) config.port = file.port;
  if (Array.isArray(file.ports)) config.ports = file.ports;
  if (file.refresh != null) config.refresh = file.refresh;
  if (file.names && typeof file.names === 'object') config.names = { ...config.names, ...file.names };

  // Layer 3: CLI args (highest priority)
  if (args.port != null) config.port = args.port;
  if (args.refresh != null) config.refresh = args.refresh;

  // Ports priority: positional args > --watch > file > defaults
  if (args.watch && args.watch.length > 0) config.ports = args.watch;
  if (args.positionalPorts && args.positionalPorts.length > 0) config.ports = args.positionalPorts;
  if (args.open) config.open = true;

  return config;
}

module.exports = { parseArgs, loadConfig, DEFAULTS };
