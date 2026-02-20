const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';

const DEV_PROCESSES = new Set([
  'node', 'python', 'python3', 'ruby', 'java', 'deno', 'bun', 'php', 'perl',
  'go', 'cargo', 'dotnet', 'uvicorn', 'gunicorn', 'puma', 'nginx', 'httpd',
  'apache2', 'postgres', 'mysql', 'mysqld', 'redis-server', 'redis', 'mongod',
  'mongos', 'docker-proxy',
]);

function categorizePort(port, processName) {
  const proc = (processName || '').toLowerCase();
  if (DEV_PROCESSES.has(proc)) return 'dev';
  if (port >= 49152) return 'system';
  if ([53, 137, 138, 139, 445, 515, 631, 5353, 7000].includes(port)) return 'system';
  return 'system';
}

function getPortInfo(targetPorts) {
  const results = targetPorts.map(port => ({
    port,
    state: 'free',
    pid: null,
    process: null,
    cwd: null,
    branch: null,
    category: 'dev',
  }));

  try {
    if (isWindows) {
      scanWindows(results);
    } else {
      scanUnix(results);
    }
  } catch {}

  for (const r of results) {
    if (r.state === 'active') r.category = categorizePort(r.port, r.process);
  }

  return results;
}

function getAllPorts() {
  const results = [];

  try {
    if (isWindows) {
      discoverAllWindows(results);
    } else {
      discoverAllUnix(results);
    }
  } catch {}

  results.sort((a, b) => a.port - b.port);
  return results;
}

function discoverAllUnix(results) {
  const raw = execSync('lsof -i -P -n -sTCP:LISTEN 2>/dev/null', {
    encoding: 'utf8',
    timeout: 5000,
  });

  const lines = raw.trim().split('\n').slice(1);
  const seen = new Set();

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const processName = parts[0];
    const pid = parts[1];
    const addrPort = parts[8];
    const match = addrPort.match(/:(\d+)$/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    if (seen.has(port)) continue;
    seen.add(port);

    const entry = {
      port,
      state: 'active',
      pid,
      process: processName,
      cwd: null,
      branch: null,
      category: categorizePort(port, processName),
    };

    try {
      const cwd = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null`, {
        encoding: 'utf8',
        timeout: 3000,
      });
      const cwdMatch = cwd.match(/\nn(.*)/);
      if (cwdMatch) {
        entry.cwd = cwdMatch[1];
        entry.branch = detectBranch(cwdMatch[1]);
      }
    } catch {}

    results.push(entry);
  }
}

function discoverAllWindows(results) {
  const raw = execSync('netstat -ano', {
    encoding: 'utf8',
    timeout: 5000,
  });

  const lines = raw.trim().split('\n');
  const seen = new Set();

  for (const line of lines) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    const localAddr = parts[1];
    const pid = parts[4];
    const match = localAddr.match(/:(\d+)$/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    if (seen.has(port)) continue;
    seen.add(port);

    const entry = {
      port,
      state: 'active',
      pid,
      process: null,
      cwd: null,
      branch: null,
      category: 'system',
    };

    try {
      const taskInfo = execSync(
        `tasklist /FI "PID eq ${parseInt(pid, 10)}" /FO CSV /NH`,
        { encoding: 'utf8', timeout: 3000 }
      );
      const csvMatch = taskInfo.match(/"([^"]+)"/);
      if (csvMatch) {
        entry.process = csvMatch[1];
        entry.category = categorizePort(port, csvMatch[1]);
      }
    } catch {}

    results.push(entry);
  }
}

function scanUnix(results) {
  const raw = execSync('lsof -i -P -n -sTCP:LISTEN 2>/dev/null', {
    encoding: 'utf8',
    timeout: 5000,
  });

  const lines = raw.trim().split('\n').slice(1);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;

    const processName = parts[0];
    const pid = parts[1];
    const addrPort = parts[8];
    const match = addrPort.match(/:(\d+)$/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    const entry = results.find(r => r.port === port);
    if (!entry || entry.state === 'active') continue;

    entry.state = 'active';
    entry.pid = pid;
    entry.process = processName;

    try {
      const cwd = execSync(`lsof -p ${pid} -a -d cwd -Fn 2>/dev/null`, {
        encoding: 'utf8',
        timeout: 3000,
      });
      const cwdMatch = cwd.match(/\nn(.*)/);
      if (cwdMatch) {
        entry.cwd = cwdMatch[1];
        entry.branch = detectBranch(cwdMatch[1]);
      }
    } catch {}
  }
}

function scanWindows(results) {
  const raw = execSync('netstat -ano', {
    encoding: 'utf8',
    timeout: 5000,
  });

  const lines = raw.trim().split('\n');

  for (const line of lines) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    const localAddr = parts[1];
    const pid = parts[4];
    const match = localAddr.match(/:(\d+)$/);
    if (!match) continue;

    const port = parseInt(match[1], 10);
    const entry = results.find(r => r.port === port);
    if (!entry || entry.state === 'active') continue;

    entry.state = 'active';
    entry.pid = pid;

    try {
      const taskInfo = execSync(
        `tasklist /FI "PID eq ${parseInt(pid, 10)}" /FO CSV /NH`,
        { encoding: 'utf8', timeout: 3000 }
      );
      const csvMatch = taskInfo.match(/"([^"]+)"/);
      if (csvMatch) entry.process = csvMatch[1];
    } catch {}
  }
}

function detectBranch(cwd) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      encoding: 'utf8',
      cwd,
      timeout: 3000,
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function killProcess(pid) {
  const safePid = parseInt(pid, 10);
  if (isNaN(safePid)) return { success: false, error: 'Invalid PID' };

  try {
    if (isWindows) {
      execSync(`taskkill /PID ${safePid}`, { timeout: 3000 });
    } else {
      execSync(`kill ${safePid}`, { timeout: 3000 });
    }
    return { success: true };
  } catch {
    try {
      if (isWindows) {
        execSync(`taskkill /PID ${safePid} /F`, { timeout: 3000 });
      } else {
        execSync(`kill -9 ${safePid}`, { timeout: 3000 });
      }
      return { success: true, forced: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { getPortInfo, getAllPorts, killProcess };
