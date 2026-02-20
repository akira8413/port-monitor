#!/usr/bin/env node

const http = require("http");
const { execSync } = require("child_process");

const PORT = process.env.PORT_MONITOR_PORT || 9999;
const DEFAULT_PORTS = [3000, 3010, 8000, 8080, 5173, 1420];
const REFRESH_INTERVAL = 3000;

// --- Port scanning ---

function getPortInfo(targetPorts) {
  const results = targetPorts.map((port) => ({
    port,
    state: "free",
    pid: null,
    process: null,
    cwd: null,
    branch: null,
  }));

  try {
    const raw = execSync("lsof -i -P -n -sTCP:LISTEN 2>/dev/null", {
      encoding: "utf8",
      timeout: 5000,
    });

    const lines = raw.trim().split("\n").slice(1);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const processName = parts[0];
      const pid = parts[1];
      const addrPort = parts[8];
      const match = addrPort.match(/:(\d+)$/);
      if (!match) continue;

      const port = parseInt(match[1], 10);
      const entry = results.find((r) => r.port === port);
      if (!entry || entry.state === "active") continue;

      entry.state = "active";
      entry.pid = pid;
      entry.process = processName;

      try {
        const cwd = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null`, {
          encoding: "utf8",
          timeout: 3000,
        });
        const cwdMatch = cwd.match(/\nn(.*)/);
        if (cwdMatch) {
          entry.cwd = cwdMatch[1];
          entry.branch = detectBranch(cwdMatch[1]);
        }
      } catch {}
    }
  } catch {}

  return results;
}

function detectBranch(cwd) {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", {
      encoding: "utf8",
      cwd,
      timeout: 3000,
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function killProcess(pid) {
  try {
    execSync(`kill ${parseInt(pid, 10)}`, { timeout: 3000 });
    return { success: true };
  } catch (e) {
    try {
      execSync(`kill -9 ${parseInt(pid, 10)}`, { timeout: 3000 });
      return { success: true, forced: true };
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
}

// --- HTML ---

function buildHTML(customPorts) {
  const portsJSON = JSON.stringify(customPorts);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Port Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
    padding: 2rem;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .add-port {
    display: flex;
    gap: 0.5rem;
  }
  .add-port input {
    width: 100px;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    border: 1px solid #334155;
    background: #1e293b;
    color: #e2e8f0;
    font-size: 0.85rem;
  }
  .add-port input::placeholder { color: #64748b; }
  .btn {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-add {
    background: #3b82f6;
    color: white;
  }
  .btn-add:hover { background: #2563eb; }
  .btn-kill {
    background: #ef4444;
    color: white;
  }
  .btn-kill:hover { background: #dc2626; }
  .btn-kill:disabled {
    background: #334155;
    color: #64748b;
    cursor: not-allowed;
  }
  .btn-remove {
    background: none;
    color: #64748b;
    font-size: 0.75rem;
    padding: 0.2rem 0.4rem;
  }
  .btn-remove:hover { color: #ef4444; }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #1e293b;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  th {
    text-align: left;
    padding: 0.8rem 1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  td {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    border-bottom: 1px solid #1e293b0a;
  }
  tr:hover td { background: #253349; }
  tr:last-child td { border-bottom: none; }
  .state-active {
    color: #22c55e;
    font-weight: 600;
  }
  .state-free {
    color: #64748b;
  }
  .port-num {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-weight: 700;
    font-size: 1rem;
  }
  .process-name {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85rem;
  }
  .branch-tag {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: #312e81;
    color: #a5b4fc;
    font-size: 0.75rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
  .cwd-text {
    font-size: 0.7rem;
    color: #64748b;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty-cell { color: #475569; }
  .last-update {
    font-size: 0.75rem;
    color: #64748b;
  }
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s;
    z-index: 100;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast-success { background: #166534; color: #bbf7d0; }
  .toast-error { background: #991b1b; color: #fecaca; }
</style>
</head>
<body>
<div class="header">
  <h1>Port Monitor</h1>
  <div class="header-right">
    <div class="add-port">
      <input type="number" id="newPort" placeholder="port..." min="1" max="65535">
      <button class="btn btn-add" onclick="addPort()">+ Add</button>
    </div>
    <div class="status-dot"></div>
    <span class="last-update" id="lastUpdate"></span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Port</th>
      <th>State</th>
      <th>Process</th>
      <th>Branch / Dir</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>

<div class="toast" id="toast"></div>

<script>
let ports = ${portsJSON};

function loadSavedPorts() {
  try {
    const saved = localStorage.getItem('port-monitor-ports');
    if (saved) ports = JSON.parse(saved);
  } catch {}
}

function savePorts() {
  localStorage.setItem('port-monitor-ports', JSON.stringify(ports));
}

function addPort() {
  const input = document.getElementById('newPort');
  const p = parseInt(input.value, 10);
  if (!p || p < 1 || p > 65535) return;
  if (!ports.includes(p)) {
    ports.push(p);
    ports.sort((a, b) => a - b);
    savePorts();
    refresh();
  }
  input.value = '';
}

function removePort(p) {
  ports = ports.filter(x => x !== p);
  savePorts();
  refresh();
}

async function killPid(pid, port) {
  if (!confirm('Kill process on port ' + port + ' (PID: ' + pid + ')?')) return;
  try {
    const res = await fetch('/api/kill/' + pid, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Killed PID ' + pid + (data.forced ? ' (forced)' : ''), 'success');
      setTimeout(refresh, 500);
    } else {
      showToast('Failed: ' + data.error, 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast toast-' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 3000);
}

async function refresh() {
  try {
    const qs = ports.map(p => 'p=' + p).join('&');
    const res = await fetch('/api/ports?' + qs);
    const data = await res.json();
    render(data);
    document.getElementById('lastUpdate').textContent =
      'Updated: ' + new Date().toLocaleTimeString();
  } catch {}
}

function render(data) {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = data.map(r => {
    const stateClass = r.state === 'active' ? 'state-active' : 'state-free';
    const stateIcon = r.state === 'active' ? '\\u{1F7E2}' : '\\u{26AB}';
    const proc = r.pid
      ? '<span class="process-name">' + esc(r.process) + '</span> <span style="color:#64748b">(PID ' + esc(r.pid) + ')</span>'
      : '<span class="empty-cell">\\u2014</span>';
    const branchDir = r.branch
      ? '<span class="branch-tag">' + esc(r.branch) + '</span>' + (r.cwd ? '<div class="cwd-text">' + esc(r.cwd) + '</div>' : '')
      : r.cwd
        ? '<div class="cwd-text">' + esc(r.cwd) + '</div>'
        : '<span class="empty-cell">\\u2014</span>';
    const action = r.pid
      ? '<button class="btn btn-kill" onclick="killPid(\\''+r.pid+'\\','+r.port+')">Kill</button>'
      : '<button class="btn btn-kill" disabled>Kill</button>';
    const isDefault = ${portsJSON}.includes(r.port);
    const remove = !isDefault
      ? ' <button class="btn btn-remove" onclick="removePort('+r.port+')" title="Remove">\\u00d7</button>'
      : '';

    return '<tr>'
      + '<td><span class="port-num">' + r.port + '</span>' + remove + '</td>'
      + '<td class="' + stateClass + '">' + stateIcon + ' ' + r.state + '</td>'
      + '<td>' + proc + '</td>'
      + '<td>' + branchDir + '</td>'
      + '<td>' + action + '</td>'
      + '</tr>';
  }).join('');
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

loadSavedPorts();
refresh();
setInterval(refresh, ${REFRESH_INTERVAL});

document.getElementById('newPort').addEventListener('keydown', e => {
  if (e.key === 'Enter') addPort();
});
</script>
</body>
</html>`;
}

// --- Server ---

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHTML(DEFAULT_PORTS));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ports") {
    const ports = url.searchParams.getAll("p").map(Number).filter(Boolean);
    const targetPorts = ports.length > 0 ? ports : DEFAULT_PORTS;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getPortInfo(targetPorts)));
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/kill/")) {
    const pid = url.pathname.split("/").pop();
    if (!/^\d+$/.test(pid)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Invalid PID" }));
      return;
    }
    const result = killProcess(pid);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`\\n  Port Monitor running at http://localhost:${PORT}\\n`);
  console.log(`  Monitoring ports: ${DEFAULT_PORTS.join(", ")}`);
  console.log(`  Refresh interval: ${REFRESH_INTERVAL / 1000}s\\n`);
});
