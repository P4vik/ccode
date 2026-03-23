'use strict';

const express    = require('express');
const logger     = require('./middleware/logger');
const usersRoute = require('./routes/users');
const store       = require('./agents/store');
const rufloBridge = require('./agents/ruflo-bridge');

const app = express();

// ─── Middleware globalny ──────────────────────────────────────────────────────
app.use(express.json());
app.use(logger);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/users', usersRoute);

// ─── Agent API: simulated + real ruflo agents ─────────────────────────────────
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
