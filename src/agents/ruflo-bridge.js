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
    const status = cells[1] || 'idle';
    const meta   = TYPE_META[type] || { color: '#6b7280', icon: '🤖', tier: 2 };
    const label  = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    agents.push({
      id:          `ruflo-${type}-${agents.length + 1}`,
      name:        `${label} #${agents.length + 1}`,
      type,
      status:      status,
      task:        status !== 'idle' ? 'Ruflo task aktywny' : null,
      connections: ['ruflo-orch'],
      real:        true,
      ...meta,
    });
  }
  return agents;
}

let cachedAgents = [];
let lastFetch = 0;
const CACHE_TTL = 5000; // 5s cache

function getRealAgents() {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL) return cachedAgents;

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

    // Inject a ruflo orchestrator node at tier 0 if we have agents
    if (parsed.length > 0) {
      parsed.unshift({
        id: 'ruflo-orch',
        name: 'Ruflo Orchestrator',
        type: 'coordinator',
        status: 'working',
        task: `Koordynuję ${parsed.length} agentów`,
        connections: [],
        real: true,
        color: '#f59e0b',
        icon: '👑',
        tier: 0,
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
