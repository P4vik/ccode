'use strict';

// ─── Ruflo Live: real-time agent monitoring via CLI polling ──────────────────
const { execSync } = require('child_process');

const TYPE_META = {
  coder:               { color: '#3b82f6', icon: '💻', tier: 2 },
  reviewer:            { color: '#10b981', icon: '🔍', tier: 2 },
  tester:              { color: '#06b6d4', icon: '🧪', tier: 2 },
  researcher:          { color: '#f97316', icon: '🔬', tier: 2 },
  architect:           { color: '#8b5cf6', icon: '🏛️', tier: 1 },
  coordinator:         { color: '#c084fc', icon: '🔄', tier: 1 },
  analyst:             { color: '#78350f', icon: '📐', tier: 2 },
  optimizer:           { color: '#84cc16', icon: '⚡', tier: 2 },
  'security-auditor':      { color: '#dc2626', icon: '🔐', tier: 2 },
  'security-architect':    { color: '#ef4444', icon: '🛡️', tier: 2 },
  'memory-specialist':     { color: '#ec4899', icon: '🧠', tier: 2 },
  'swarm-specialist':      { color: '#d946ef', icon: '🌐', tier: 2 },
  'performance-engineer':  { color: '#65a30d', icon: '📈', tier: 2 },
  'core-architect':        { color: '#7c3aed', icon: '⚙️', tier: 1 },
  'test-architect':        { color: '#0891b2', icon: '🧪', tier: 2 },
};

// Which agent type handles which kind of task
const ROUTING = {
  code:          'coder',
  implement:     'coder',
  write:         'coder',
  fix:           'coder',
  review:        'reviewer',
  test:          'tester',
  architecture:  'architect',
  design:        'architect',
  coordinate:    'coordinator',
  analyze:       'analyst',
  optimize:      'optimizer',
  security:      'security-auditor',
  audit:         'security-auditor',
  memory:        'memory-specialist',
  performance:   'performance-engineer',
  benchmark:     'performance-engineer',
};

function normaliseStatus(raw) {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'active' || s === 'running' || s === 'working') return 'working';
  if (s === 'thinking') return 'thinking';
  if (s === 'done' || s === 'finished') return 'done';
  return 'idle';
}

function normaliseType(raw) {
  const s = (raw || '').trim();
  if (s.startsWith('security-aud')) return 'security-auditor';
  if (s.startsWith('security-arc')) return 'security-architect';
  if (s.startsWith('memory-spec')) return 'memory-specialist';
  if (s.startsWith('performance-')) return 'performance-engineer';
  if (s.startsWith('swarm-spec')) return 'swarm-specialist';
  if (s.startsWith('core-arc')) return 'core-architect';
  if (s.startsWith('test-arc')) return 'test-architect';
  return s;
}

function parseAgentTable(raw) {
  const lines = raw.split('\n').filter(l => l.includes('|'));
  const agents = [];
  let headerParsed = false;

  for (const line of lines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    if (cells[0] === 'ID' || cells[0].match(/^[-+]+$/)) { headerParsed = true; continue; }
    if (!headerParsed) continue;
    if (cells[0].match(/^[-+]+$/)) continue;

    const rawType = cells[0] || 'coder';
    const type    = normaliseType(rawType);
    const status  = normaliseStatus(cells[1]);
    const meta    = TYPE_META[type] || { color: '#6b7280', icon: '🤖', tier: 2 };
    const label   = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    agents.push({
      id:          `ruflo-${type}-${agents.length + 1}`,
      name:        `${label} #${agents.length + 1}`,
      type,
      status,
      task:        null,
      connections: ['ruflo-orch'],
      real:        true,
      ...meta,
    });
  }
  return agents;
}

function parseSwarmStatus(raw) {
  const metrics = {};
  const lines = raw.split('\n');
  for (const l of lines) {
    const m1 = l.match(/Overall Progress:.*?(\d+\.?\d*)%/);
    if (m1) metrics.progress = parseFloat(m1[1]);
    const m2 = l.match(/Active\s*\|\s*(\d+)/);
    if (m2) metrics.activeAgents = parseInt(m2[1]);
    const m3 = l.match(/Completed\s*\|\s*(\d+)/i);
    if (m3) metrics.completedTasks = parseInt(m3[1]);
    const m4 = l.match(/In Progress\s*\|\s*(\d+)/);
    if (m4) metrics.inProgressTasks = parseInt(m4[1]);
    const m5 = l.match(/Messages Sent:\s*(\d+)/);
    if (m5) metrics.messagesSent = parseInt(m5[1]);
    const m6 = l.match(/Tokens Used:\s*(\d+)/);
    if (m6) metrics.tokensUsed = parseInt(m6[1]);
  }
  return metrics;
}

// ─── CLI command runner (safe, no user input) ───────────────────────────────
function runCLI(cmd) {
  try {
    return execSync(`npx ruflo@latest ${cmd}`, {
      env: { ...process.env },
      timeout: 8000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
  } catch (_) {
    return '';
  }
}

// ─── State ──────────────────────────────────────────────────────────────────
let agents = [];
let messages = [];
let msgId = 0;
let swarmMetrics = {};
let broadcast = null;
let pollInterval = null;

function setBroadcast(fn) { broadcast = fn; }

function emit(type, payload) {
  if (broadcast) broadcast(JSON.stringify({ type, payload }));
}

// ─── Snapshot for SSE init ──────────────────────────────────────────────────
function getSnapshot() {
  return {
    agents,
    messages: messages.slice(-30),
    swarmMetrics,
    agentTypes: TYPE_META,
    ts: new Date().toISOString(),
    realCount: agents.length,
    simCount: 0,
  };
}

// ─── Auto-route: pick best agent for a task description ─────────────────────
function routeTask(description) {
  const desc = description.toLowerCase();
  for (const [keyword, agentType] of Object.entries(ROUTING)) {
    if (desc.includes(keyword)) return agentType;
  }
  return 'coder'; // default
}

// ─── Assign task from user to an agent ──────────────────────────────────────
function assignTask(description, targetType) {
  const agentType = targetType || routeTask(description);
  const agent = agents.find(a => a.type === agentType && a.id !== 'ruflo-orch');

  if (!agent) return { ok: false, error: `Brak agenta typu: ${agentType}` };

  // Update agent state
  agent.task = description;
  agent.status = 'working';
  emit('agent:update', agent);

  // Orchestrator → agent communication
  const msg = {
    id: msgId++,
    from: 'ruflo-orch',
    to: agent.id,
    text: `Nowe zadanie: ${description}`,
    ts: new Date().toISOString(),
  };
  messages.push(msg);
  if (messages.length > 100) messages.shift();
  emit('message', msg);

  // Also create in ruflo CLI
  const safeDesc = description.replace(/"/g, '\\"').substring(0, 100);
  runCLI(`task create -t review -d "${safeDesc}"`);

  return { ok: true, agent: agent.id, agentName: agent.name, type: agentType };
}

// ─── Complete a task ────────────────────────────────────────────────────────
function completeTask(agentId, result) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return { ok: false, error: `Agent ${agentId} nie istnieje` };

  const oldTask = agent.task;
  agent.status = 'done';
  agent.task = result || `Gotowe: ${oldTask}`;
  emit('agent:update', agent);

  // Agent → orchestrator: done
  const msg = {
    id: msgId++,
    from: agent.id,
    to: 'ruflo-orch',
    text: result || `Zakończono: ${oldTask}`,
    ts: new Date().toISOString(),
  };
  messages.push(msg);
  if (messages.length > 100) messages.shift();
  emit('message', msg);

  // Reset to idle after 5s
  setTimeout(() => {
    agent.status = 'idle';
    agent.task = null;
    emit('agent:update', agent);
  }, 5000);

  return { ok: true, agent: agent.id };
}

// ─── Send message between agents ────────────────────────────────────────────
function sendMessage(fromId, toId, text) {
  const from = agents.find(a => a.id === fromId);
  const to   = agents.find(a => a.id === toId);
  if (!from || !to) return { ok: false, error: 'Agent nie istnieje' };

  from.status = 'communicating';
  emit('agent:update', from);

  const msg = {
    id: msgId++,
    from: fromId,
    to: toId,
    text,
    ts: new Date().toISOString(),
  };
  messages.push(msg);
  if (messages.length > 100) messages.shift();
  emit('message', msg);

  setTimeout(() => {
    from.status = 'working';
    emit('agent:update', from);
  }, 2000);

  return { ok: true, msg };
}

// ─── Poll: fetch real data from ruflo CLI ────────────────────────────────────
function poll() {
  const agentRaw = runCLI('agent list');
  if (agentRaw) {
    const parsed = parseAgentTable(agentRaw);

    const oldMap = {};
    agents.forEach(a => { oldMap[a.id] = a; });

    if (parsed.length > 0) {
      parsed.unshift({
        id: 'ruflo-orch',
        name: 'Ruflo Orchestrator',
        type: 'coordinator',
        status: 'working',
        task: `Koordynuję ${parsed.length} prawdziwych agentów`,
        connections: [],
        real: true,
        color: '#f59e0b',
        icon: '⚡',
        tier: 1,
      });

      parsed.forEach(a => {
        if (a.id !== 'ruflo-orch' && !a.connections.includes('ruflo-orch')) {
          a.connections.push('ruflo-orch');
        }
      });

      // Inter-agent connections
      const byType = {};
      parsed.forEach(a => { byType[a.type] = a; });
      if (byType.coder && byType.reviewer) byType.coder.connections.push(byType.reviewer.id);
      if (byType.coder && byType.tester) byType.coder.connections.push(byType.tester.id);
      if (byType.reviewer && byType.tester) byType.reviewer.connections.push(byType.tester.id);
      if (byType.architect && byType.coder) byType.architect.connections.push(byType.coder.id);
      if (byType.coordinator && byType.architect) byType.coordinator.connections.push(byType.architect.id);
      if (byType['security-auditor'] && byType.coder) byType['security-auditor'].connections.push(byType.coder.id);
      if (byType['memory-specialist'] && byType.analyst) byType['memory-specialist'].connections.push(byType.analyst.id);
      if (byType.optimizer && byType['performance-engineer']) byType.optimizer.connections.push(byType['performance-engineer'].id);
      if (byType.analyst && byType.reviewer) byType.analyst.connections.push(byType.reviewer.id);
    }

    // Preserve tasks assigned by user (don't overwrite with null from CLI)
    parsed.forEach(a => {
      const old = oldMap[a.id];
      if (old && old.task && !a.task) {
        a.task = old.task;
        a.status = old.status;
      }
    });

    // Emit updates for changed agents
    parsed.forEach(a => {
      const old = oldMap[a.id];
      if (!old) {
        emit('agent:new', a);
      } else if (old.status !== a.status || old.task !== a.task) {
        emit('agent:update', a);
      }
    });

    agents = parsed;
  }

  // Swarm status
  const swarmRaw = runCLI('swarm status');
  if (swarmRaw) {
    swarmMetrics = parseSwarmStatus(swarmRaw);
  }
}

// ─── Start live monitoring (only polling, no auto-tasks) ────────────────────
function start(pollMs = 3000) {
  poll();
  pollInterval = setInterval(poll, pollMs);
  return pollInterval;
}

module.exports = { start, setBroadcast, getSnapshot, poll, assignTask, completeTask, sendMessage, agents: () => agents };
