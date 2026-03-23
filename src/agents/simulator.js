'use strict';

const store = require('./store');

// Use full COMM_PAIRS from store (covers all 60 agents)
const COMM_PAIRS = store.COMM_PAIRS;

const COMM_MESSAGES = [
  'Zadanie zakończone ✓', 'Potrzebuję danych z modułu X', 'Przekazuję wyniki analizy',
  'Gotowy do kolejnego tasku', 'Wykryto potencjalny problem', 'Synchronizuję stan',
  'Proszę o review kodu', 'Zatwierdzam implementację', 'Uruchamiam testy',
  'Znaleziono wzorzec bezpieczeństwa', 'Aktualizuję pamięć', 'Zlecam nowe zadanie',
  'Coverage: 94%', 'Commit gotowy do merge', 'Analiza zakończona',
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
    // Agenci się komunikują
    const pair = rand(COMM_PAIRS);
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
