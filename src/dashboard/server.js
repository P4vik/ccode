'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 4200;
const POLL_INTERVAL = 2000;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// ── helpers ──────────────────────────────────────────────────────────────────

function runCmd(cmd, args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, { cwd: PROJECT_ROOT, shell: true });
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: '', error: `timeout after ${timeoutMs}ms`, timedOut: true });
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: stdout, error: stderr, code });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: '', error: err.message });
    });
  });
}

function tryParseJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function readFileSafe(filePath) {
  try {
    const full = path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(full)) return null;
    const content = fs.readFileSync(full, 'utf8');
    return tryParseJson(content) || content;
  } catch { return null; }
}

function readDirFiles(dirPath) {
  try {
    const full = path.join(PROJECT_ROOT, dirPath);
    if (!fs.existsSync(full)) return [];
    return fs.readdirSync(full).map(f => ({
      name: f,
      content: readFileSafe(path.join(dirPath, f))
    }));
  } catch { return []; }
}

// ── parse CLI text output ─────────────────────────────────────────────────────

function parseStatusText(text) {
  const result = {
    systemStatus: 'unknown',
    swarmRunning: false,
    agents: { active: 0, idle: 0, total: 0 },
    tasks: { pending: 0, running: 0, completed: 0, failed: 0, total: 0 },
    memory: { backend: 'none', entries: 0, size: '0 B', searchTime: '0ms', cacheHitRate: '0%' },
    mcp: { running: false }
  };

  if (!text) return result;

  // System status
  const statusMatch = text.match(/RuFlo V3 \[(\w+)\]/);
  if (statusMatch) result.systemStatus = statusMatch[1].toLowerCase();

  // Swarm
  result.swarmRunning = !text.includes('Swarm not running');

  // Agents table
  const activeMatch = text.match(/Active\s*\|\s*(\d+)/);
  const idleMatch = text.match(/Idle\s*\|\s*(\d+)/);
  const totalAgentsMatch = text.match(/Total\s*\|\s*(\d+)/m);
  if (activeMatch) result.agents.active = parseInt(activeMatch[1]);
  if (idleMatch) result.agents.idle = parseInt(idleMatch[1]);
  if (totalAgentsMatch) result.agents.total = parseInt(totalAgentsMatch[1]);

  // Tasks table
  const pendingMatch = text.match(/Pending\s*\|\s*(\d+)/);
  const runningMatch = text.match(/Running\s*\|\s*(\d+)/);
  const completedMatch = text.match(/Completed\s*\|\s*(\d+)/);
  const failedMatch = text.match(/Failed\s*\|\s*(\d+)/);
  const totalTaskMatch = text.match(/Total\s*\|\s*(\d+)/g);
  if (pendingMatch) result.tasks.pending = parseInt(pendingMatch[1]);
  if (runningMatch) result.tasks.running = parseInt(runningMatch[1]);
  if (completedMatch) result.tasks.completed = parseInt(completedMatch[1]);
  if (failedMatch) result.tasks.failed = parseInt(failedMatch[1]);
  if (totalTaskMatch && totalTaskMatch.length >= 2) {
    const m = totalTaskMatch[1].match(/\d+/);
    if (m) result.tasks.total = parseInt(m[0]);
  }

  // Memory table
  const backendMatch = text.match(/Backend\s*\|\s*(\S+)/);
  const entriesMatch = text.match(/Entries\s*\|\s*(\d+)/);
  const sizeMatch = text.match(/Size\s*\|\s*([^\|]+)\|/);
  const searchMatch = text.match(/Search Time\s*\|\s*([^\|]+)\|/);
  const cacheMatch = text.match(/Cache Hit Rate\s*\|\s*([^\|]+)\|/);
  if (backendMatch) result.memory.backend = backendMatch[1].trim();
  if (entriesMatch) result.memory.entries = parseInt(entriesMatch[1]);
  if (sizeMatch) result.memory.size = sizeMatch[1].trim();
  if (searchMatch) result.memory.searchTime = searchMatch[1].trim();
  if (cacheMatch) result.memory.cacheHitRate = cacheMatch[1].trim();

  // MCP
  result.mcp.running = !text.includes('Not running');

  return result;
}

function parseAgentList(text) {
  if (!text) return [];
  if (text.includes('No agents found')) return [];
  const agents = [];
  // Try to parse table rows: | id | name | type | status | ...
  const rows = text.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('name'));
  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      agents.push({
        id: cols[0] || '?',
        name: cols[1] || cols[0],
        type: cols[2] || 'unknown',
        status: cols[3] || 'unknown',
        task: cols[4] || '',
        uptime: cols[5] || ''
      });
    }
  }
  return agents;
}

function parseTaskList(text) {
  if (!text) return [];
  if (text.includes('No tasks found')) return [];
  const tasks = [];
  const rows = text.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('id'));
  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      tasks.push({
        id: cols[0] || '?',
        name: cols[1] || cols[0],
        status: cols[2] || 'unknown',
        assignee: cols[3] || '',
        created: cols[4] || ''
      });
    }
  }
  return tasks;
}

function parseMemoryList(text) {
  if (!text) return [];
  if (text.includes('No entries found')) return [];
  const entries = [];
  const rows = text.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('key'));
  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      entries.push({ key: cols[0], value: cols[1] || '', namespace: cols[2] || 'default' });
    }
  }
  return entries;
}

function parseDaemonStatus(text) {
  if (!text) return { running: false, error: 'no output' };
  const running = text.includes('running') || text.includes('RUNNING') || text.includes('active');
  const pidMatch = text.match(/PID[:\s]+(\d+)/i);
  return {
    running,
    pid: pidMatch ? pidMatch[1] : null,
    raw: text.substring(0, 500)
  };
}

// ── main data collector ───────────────────────────────────────────────────────

async function collectData() {
  const ts = Date.now();
  const errors = [];

  // Run all CLI commands in parallel
  const [statusRes, swarmRes, agentRes, taskRes, memoryRes, daemonRes] = await Promise.all([
    runCmd('npx', ['@claude-flow/cli@latest', 'status']),
    runCmd('npx', ['@claude-flow/cli@latest', 'swarm', 'status']),
    runCmd('npx', ['@claude-flow/cli@latest', 'agent', 'list']),
    runCmd('npx', ['@claude-flow/cli@latest', 'task', 'list']),
    runCmd('npx', ['@claude-flow/cli@latest', 'memory', 'list']),
    runCmd('bash', ['.claude/helpers/daemon-manager.sh', 'status']),
  ]);

  // Collect CLI errors
  if (!statusRes.ok && statusRes.error) errors.push({ source: 'status', msg: statusRes.error });
  if (!swarmRes.ok && swarmRes.error && !swarmRes.output.includes('No active swarm')) {
    errors.push({ source: 'swarm', msg: swarmRes.error });
  }

  // Parse CLI results
  const systemStatus = parseStatusText(statusRes.output || statusRes.error);
  const agents = parseAgentList(agentRes.output);
  const tasks = parseTaskList(taskRes.output);
  const memoryEntries = parseMemoryList(memoryRes.output);
  const daemonStatus = parseDaemonStatus(daemonRes.output || daemonRes.error);

  // Swarm activity log from file
  const swarmActivity = readFileSafe('.claude-flow/swarm-activity.json') || [];
  const activityLog = Array.isArray(swarmActivity) ? swarmActivity.slice(-20) : [];

  // Metrics files
  const metricsFiles = readDirFiles('.claude-flow/metrics');

  // PID files
  const pidFiles = readDirFiles('.claude-flow/pids');
  const pids = pidFiles.map(f => ({ name: f.name.replace('.pid', ''), pid: typeof f.content === 'string' ? f.content.trim() : f.content }));

  // Logs (last 20 lines)
  const logFile = readFileSafe('.claude-flow/logs/daemon.log');
  const logLines = typeof logFile === 'string'
    ? logFile.split('\n').filter(Boolean).slice(-20)
    : [];

  return {
    timestamp: ts,
    system: {
      ...systemStatus,
      daemonStatus,
      pids,
      cliVersion: 'v3.5.42'
    },
    agents: {
      list: agents,
      counts: systemStatus.agents
    },
    tasks: {
      list: tasks,
      counts: systemStatus.tasks
    },
    memory: {
      stats: systemStatus.memory,
      entries: memoryEntries
    },
    mcp: systemStatus.mcp,
    communication: {
      log: activityLog,
      logLines
    },
    metrics: metricsFiles,
    errors: errors.length > 0 ? errors : null,
    rawOutputs: {
      status: (statusRes.output || statusRes.error || '').substring(0, 1000),
      swarm: (swarmRes.output || swarmRes.error || '').substring(0, 500),
      daemon: (daemonRes.output || daemonRes.error || '').substring(0, 500)
    }
  };
}

// ── WebSocket broadcast ───────────────────────────────────────────────────────

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on('connection', async (ws) => {
  console.log('[ws] client connected');
  // Send current data immediately on connect
  try {
    const data = await collectData();
    ws.send(JSON.stringify(data));
  } catch (err) {
    ws.send(JSON.stringify({ error: err.message }));
  }
});

// ── polling loop ──────────────────────────────────────────────────────────────

let polling = false;
setInterval(async () => {
  if (polling || wss.clients.size === 0) return;
  polling = true;
  try {
    const data = await collectData();
    broadcast(data);
  } catch (err) {
    broadcast({ error: err.message, timestamp: Date.now() });
  } finally {
    polling = false;
  }
}, POLL_INTERVAL);

// ── REST fallback ─────────────────────────────────────────────────────────────

app.get('/api/data', async (req, res) => {
  try {
    const data = await collectData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n┌─────────────────────────────────────────┐`);
  console.log(`│  RuFlo Dashboard                        │`);
  console.log(`│  http://localhost:${PORT}                  │`);
  console.log(`│  WebSocket: ws://localhost:${PORT}         │`);
  console.log(`│  Polling every ${POLL_INTERVAL}ms                  │`);
  console.log(`└─────────────────────────────────────────┘\n`);
});
