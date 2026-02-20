const http = require('http');
const { exec } = require('child_process');
const { getPortInfo, getAllPorts, killProcess } = require('./scanner');
const { buildHTML } = require('./html');

function createServer(config) {
  const { port, ports, refresh } = config;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildHTML(ports, refresh, config.names));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/ports') {
      const all = url.searchParams.get('all') === '1';
      if (all) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getAllPorts()));
        return;
      }
      const queryPorts = url.searchParams.getAll('p').map(Number).filter(Boolean);
      const targetPorts = queryPorts.length > 0 ? queryPorts : ports;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getPortInfo(targetPorts)));
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/kill/')) {
      const pid = url.pathname.split('/').pop();
      if (!/^\d+$/.test(pid)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid PID' }));
        return;
      }
      const result = killProcess(pid);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  Port Monitor running at ${url}\n`);
    console.log(`  Monitoring ports: ${ports.join(', ')}`);
    console.log(`  Refresh interval: ${refresh / 1000}s\n`);

    if (config.open) {
      const cmd = process.platform === 'darwin' ? `open "${url}"`
        : process.platform === 'win32' ? `start "" "${url}"`
        : `xdg-open "${url}"`;
      exec(cmd);
    }
  });

  return server;
}

module.exports = { createServer };
