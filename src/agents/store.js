'use strict';

// ─── Agent definitions ────────────────────────────────────────────────────────
const AGENT_TYPES = {
  orchestrator:      { color: '#f59e0b', icon: '👑', tier: 0 },
  planner:           { color: '#8b5cf6', icon: '🗺️', tier: 1 },
  coder:             { color: '#3b82f6', icon: '💻', tier: 2 },
  reviewer:          { color: '#10b981', icon: '🔍', tier: 2 },
  tester:            { color: '#06b6d4', icon: '🧪', tier: 2 },
  researcher:        { color: '#f97316', icon: '🔬', tier: 2 },
  'security-architect': { color: '#ef4444', icon: '🛡️', tier: 2 },
  'memory-specialist':  { color: '#ec4899', icon: '🧠', tier: 2 },
};

const STATUSES = ['idle', 'thinking', 'working', 'communicating', 'done'];

const TASKS = [
  'Analizuję strukturę kodu',
  'Generuję testy jednostkowe',
  'Przeglądam PR #1',
  'Szukam wzorców bezpieczeństwa',
  'Optymalizuję zapytania',
  'Synchronizuję pamięć',
  'Buduję plan implementacji',
  'Weryfikuję dependencje',
  'Refaktoryzuję moduł users',
  'Sprawdzam coverage testów',
  'Analizuję metryki wydajności',
  'Aktualizuję dokumentację',
];

// ─── Initial agent network ────────────────────────────────────────────────────
let agents = [
  { id: 'orch-1',   name: 'Orchestrator',        type: 'orchestrator',      status: 'working',       task: 'Koordynuję sieć agentów', connections: [] },
  { id: 'plan-1',   name: 'Planner Alpha',        type: 'planner',           status: 'thinking',      task: 'Buduję plan implementacji', connections: ['orch-1'] },
  { id: 'code-1',   name: 'Coder Prime',          type: 'coder',             status: 'working',       task: 'Refaktoryzuję moduł users', connections: ['orch-1', 'plan-1'] },
  { id: 'code-2',   name: 'Coder Beta',           type: 'coder',             status: 'idle',          task: null, connections: ['orch-1'] },
  { id: 'rev-1',    name: 'Reviewer',             type: 'reviewer',          status: 'communicating', task: 'Przeglądam PR #1', connections: ['code-1', 'orch-1'] },
  { id: 'test-1',   name: 'Tester',               type: 'tester',            status: 'working',       task: 'Generuję testy jednostkowe', connections: ['code-1', 'rev-1'] },
  { id: 'res-1',    name: 'Researcher',           type: 'researcher',        status: 'thinking',      task: 'Szukam wzorców bezpieczeństwa', connections: ['plan-1'] },
  { id: 'sec-1',    name: 'Security Architect',   type: 'security-architect',status: 'idle',          task: null, connections: ['orch-1', 'res-1'] },
  { id: 'mem-1',    name: 'Memory Specialist',    type: 'memory-specialist', status: 'working',       task: 'Synchronizuję pamięć', connections: ['orch-1', 'code-1', 'code-2'] },
];

let messages = [];   // { from, to, text, ts }
let msgId = 0;

function getAgents() { return agents; }

function getAgent(id) { return agents.find(a => a.id === id); }

function updateAgent(id, patch) {
  agents = agents.map(a => a.id === id ? { ...a, ...patch } : a);
  return getAgent(id);
}

function addMessage(from, to, text) {
  const msg = { id: msgId++, from, to, text, ts: new Date().toISOString() };
  messages.push(msg);
  if (messages.length > 50) messages.shift();
  return msg;
}

function getMessages(limit = 20) {
  return messages.slice(-limit);
}

function getSnapshot() {
  return {
    agents,
    messages: getMessages(),
    agentTypes: AGENT_TYPES,
    ts: new Date().toISOString(),
  };
}

module.exports = { getAgents, getAgent, updateAgent, addMessage, getMessages, getSnapshot, AGENT_TYPES, STATUSES, TASKS };
