function buildHTML(defaultPorts, refreshInterval) {
  const portsJSON = JSON.stringify(defaultPorts);
  return `<!DOCTYPE html>
<html lang="en">
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
      : '<span class="empty-cell">\\u{2014}</span>';
    const branchDir = r.branch
      ? '<span class="branch-tag">' + esc(r.branch) + '</span>' + (r.cwd ? '<div class="cwd-text">' + esc(r.cwd) + '</div>' : '')
      : r.cwd
        ? '<div class="cwd-text">' + esc(r.cwd) + '</div>'
        : '<span class="empty-cell">\\u{2014}</span>';
    const action = r.pid
      ? '<button class="btn btn-kill" onclick="killPid(\\'' + r.pid + '\\',' + r.port + ')">Kill</button>'
      : '<button class="btn btn-kill" disabled>Kill</button>';
    const isDefault = ${portsJSON}.includes(r.port);
    const remove = !isDefault
      ? ' <button class="btn btn-remove" onclick="removePort(' + r.port + ')" title="Remove">\\u{00D7}</button>'
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
setInterval(refresh, ${refreshInterval});

document.getElementById('newPort').addEventListener('keydown', e => {
  if (e.key === 'Enter') addPort();
});
</script>
</body>
</html>`;
}

module.exports = { buildHTML };
