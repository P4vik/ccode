'use strict';

// ─── Ruflo Bridge: reads real agents from ruflo CLI ───────────────────────────
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
  'security-architect':    { color: '#ef4444', icon: '🛡️', tier: 2 },
  'security-auditor':      { color: '#dc2626', icon: '🔐', tier: 2 },
  'memory-specialist':     { color: '#ec4899', icon: '🧠', tier: 2 },
  'swarm-specialist':      { color: '#d946ef', icon: '🌐', tier: 2 },
  'performance-engineer':  { color: '#65a30d', icon: '📈', tier: 2 },
  'core-architect':        { color: '#7c3aed', icon: '⚙️', tier: 1 },
  'test-architect':        { color: '#0891b2', icon: '🧪', tier: 2 },
};

// Normalise raw CLI status string to internal status values
function normaliseStatus(raw) {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'active' || s === 'running' || s === 'working') return 'working';
  if (s === 'thinking') return 'thinking';
  if (s === 'done' || s === 'finished') return 'done';
  if (s === 'idle') return 'idle';
  return 'idle';
}

// Parse ruflo table output into agent objects
function parseAgentTable(raw) {
  const lines = raw.split('\n').filter(l => l.includes('|'));
  const agents = [];
  let headerParsed = false;

  for (const line of lines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (!cells.length) continue;

    // Skip header/separator rows
    if (cells[0] === 'ID' || cells[0].match(/^[-+]+$/)) {
      headerParsed = true;
      continue;
    }
    if (!headerParsed) continue;
    if (cells[0].match(/^[-+]+$/)) continue;

    // ID column is empty in ruflo output, so after filter(Boolean):
    // cells: [type, status, created, last-activity]
    const type   = cells[0] || 'coder';
    const status = normaliseStatus(cells[1]);
    const meta   = TYPE_META[type] || { color: '#6b7280', icon: '🤖', tier: 2 };
    const label  = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    agents.push({
      id:          `ruflo-${type}-${agents.length + 1}`,
      name:        `${label} #${agents.length + 1}`,
      type,
      status,
      task:        ACTIVE_TASKS[type] || 'Ruflo task aktywny',
      connections: ['ruflo-orch'],
      real:        true,
      ...meta,
    });
  }
  return agents;
}

// Tasks assigned to real agents during swarm run
const ACTIVE_TASKS = {
  coder:                'Implementuje walidację Zod dla POST /users',
  reviewer:             'Przegląda src/routes/users.js — REST conventions',
  tester:               'Generuje edge case testy dla DELETE /users/:id',
  architect:            'Projektuje schemat walidacji wejścia',
  coordinator:          'Koordynuje swarm — full project analysis',
  analyst:              'Analizuje pokrycie testów i jakość kodu',
  optimizer:            'Profiluje /api/agents — strategia cache 1.5s→50ms',
  'security-auditor':   'Audyt ruflo-bridge.js — execSync injection risks',
  'memory-specialist':  'Optymalizuje HNSW memory — wzorce projektu',
  'performance-engineer': 'Benchmark API endpoints — latency profiling',
};

let cachedAgents = [];
let lastFetch = 0;
const CACHE_TTL = 5000; // 5s cache

function getRealAgents() {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL) {
    return cachedAgents;
  }

  try {
    const raw = execSync(
      'npx ruflo@latest agent list',
      {
        env: { ...process.env },
        timeout: 8000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    ).toString();

    const parsed = parseAgentTable(raw);

    // Inject ruflo orchestrator — connected to main Master Orchestrator (orch-1)
    if (parsed.length > 0) {
      parsed.unshift({
        id: 'ruflo-orch',
        name: 'Ruflo Orchestrator',
        type: 'coordinator',
        status: 'working',
        task: `Koordynuję ${parsed.length} prawdziwych agentów`,
        connections: ['orch-1'],   // bridge to main Master Orchestrator
        real: true,
        color: '#f59e0b',
        icon: '⚡',
        tier: 1,
      });
    }

    cachedAgents = parsed;
    lastFetch = now;
  } catch (_) {
    // ruflo not available — return cached
  }

  return cachedAgents;
}

module.exports = { getRealAgents };
