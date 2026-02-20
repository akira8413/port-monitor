const http = require('http');
const { getPortInfo, killProcess } = require('./scanner');
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

  server.listen(port, () => {
    console.log(`\n  Port Monitor running at http://localhost:${port}\n`);
    console.log(`  Monitoring ports: ${ports.join(', ')}`);
    console.log(`  Refresh interval: ${refresh / 1000}s\n`);
  });

  return server;
}

module.exports = { createServer };
