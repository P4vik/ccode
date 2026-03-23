'use strict';

const express    = require('express');
const logger     = require('./middleware/logger');
const usersRoute = require('./routes/users');
const store       = require('./agents/store');
const rufloBridge = require('./agents/ruflo-bridge');
const app = express();

// ─── SSE clients (exported for server.js broadcast integration) ─────────────
const sseClients = new Set();
app.sseClients = sseClients;

// ─── Middleware globalny ──────────────────────────────────────────────────────
app.use(express.json());
app.use(logger);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/users', usersRoute);

// ─── Agent SSE stream ───────────────────────────────────────────────────────
app.get('/api/agents/stream', (req, res) => {
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial full snapshot
  const snapshot   = store.getSnapshot();
  const realAgents = rufloBridge.getRealAgents();
  const initPayload = {
    ...snapshot,
    agents:    [...snapshot.agents, ...realAgents],
    realCount: realAgents.length,
    simCount:  snapshot.agents.length,
  };
  res.write(`data: ${JSON.stringify({ type: 'init', payload: initPayload })}\n\n`);

  sseClients.add(res);

  // Heartbeat every 20s to keep connection alive
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ─── Agent API: simulated + real ruflo agents (REST fallback) ───────────────
app.get('/api/agents', (req, res) => {
  const snapshot   = store.getSnapshot();
  const realAgents = rufloBridge.getRealAgents();

  // Merge: real agents shown separately with real:true flag
  const allAgents = [...snapshot.agents, ...realAgents];

  res.json({
    ...snapshot,
    agents: allAgents,
    realCount: realAgents.length,
    simCount:  snapshot.agents.length,
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ścieżka ${req.method} ${req.originalUrl} nie istnieje.` });
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Wewnętrzny błąd serwera.' });
});

module.exports = app;
