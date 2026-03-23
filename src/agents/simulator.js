'use strict';

const store = require('./store');

// Simulated agent pairs (all 60)
const SIM_COMM_PAIRS = store.COMM_PAIRS;

// Ruflo real agent communication pairs
const RUFLO_COMM_PAIRS = [
  ['ruflo-orch', 'ruflo-coder-1'],
  ['ruflo-orch', 'ruflo-reviewer-2'],
  ['ruflo-orch', 'ruflo-coordinator-5'],
  ['ruflo-coder-1', 'ruflo-reviewer-2'],
  ['ruflo-coder-1', 'ruflo-tester-3'],
  ['ruflo-reviewer-2', 'ruflo-tester-3'],
  ['ruflo-tester-3', 'ruflo-analyst-6'],
  ['ruflo-security-auditor-8', 'ruflo-orch'],
  ['ruflo-security-auditor-8', 'ruflo-architect-4'],
  ['ruflo-memory-specialist-9', 'ruflo-orch'],
  ['ruflo-optimizer-7', 'ruflo-performance-engineer-10'],
  ['ruflo-coordinator-5', 'ruflo-architect-4'],
  // Cross-cluster: ruflo ↔ simulated
  ['ruflo-orch',   'orch-1'],
  ['ruflo-coder-1',  'code-1'],
  ['ruflo-reviewer-2', 'rev-1'],
  ['ruflo-security-auditor-8', 'sec-1'],
  ['ruflo-memory-specialist-9', 'mem-1'],
  ['ruflo-performance-engineer-10', 'perf-1'],
];

const COMM_MESSAGES = [
  'Zadanie zakończone ✓', 'Potrzebuję danych z modułu X', 'Przekazuję wyniki analizy',
  'Gotowy do kolejnego tasku', 'Wykryto potencjalny problem', 'Synchronizuję stan',
  'Proszę o review kodu', 'Zatwierdzam implementację', 'Uruchamiam testy',
  'Znaleziono wzorzec bezpieczeństwa', 'Aktualizuję pamięć', 'Zlecam nowe zadanie',
  'Coverage: 94%', 'Commit gotowy do merge', 'Analiza zakończona',
  'Wynik security audit: brak CVE', 'HNSW index zaktualizowany', 'Routing do haiku',
  'Task przydzielony przez ruflo', 'Synchronizuję z orchestratorem',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randBool(p = 0.3) { return Math.random() < p; }

let broadcast = null;

function setBroadcast(fn) { broadcast = fn; }

function emit(type, payload) {
  if (broadcast) broadcast(JSON.stringify({ type, payload }));
}

// ─── Tick: co 1.5s jeden losowy event ────────────────────────────────────────
function tick() {
  const roll = Math.random();

  if (roll < 0.4) {
    // Agent zmienia status/task
    const agents = store.getAgents();
    const agent  = rand(agents);
    const status = rand(store.STATUSES);
    const task   = status === 'idle' ? null : rand(store.TASKS);
    store.updateAgent(agent.id, { status, task });
    emit('agent:update', store.getAgent(agent.id));

  } else if (roll < 0.75) {
    // Agenci się komunikują — 30% szans na ruflo cross-cluster
    const allPairs = Math.random() < 0.3 ? RUFLO_COMM_PAIRS : SIM_COMM_PAIRS;
    const pair = rand(allPairs);
    const text = rand(COMM_MESSAGES);
    const msg  = store.addMessage(pair[0], pair[1], text);
    emit('message', msg);

  } else {
    // Nowy agent dołącza lub odpada (blink)
    const agents = store.getAgents();
    const agent  = rand(agents);
    store.updateAgent(agent.id, { status: randBool(0.5) ? 'communicating' : 'working' });
    emit('agent:update', store.getAgent(agent.id));
  }
}

function start(intervalMs = 1500) {
  return setInterval(tick, intervalMs);
}

module.exports = { start, setBroadcast };
