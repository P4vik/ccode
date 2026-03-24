'use strict';

const express    = require('express');
const logger     = require('./middleware/logger');
const usersRoute = require('./routes/users');

// Live mode: real ruflo agents only (no simulated)
const rufloLive  = require('./agents/ruflo-live');

const app = express();

// ─── SSE clients ────────────────────────────────────────────────────────────
const sseClients = new Set();
app.sseClients = sseClients;

// Wire ruflo-live broadcast → SSE clients
rufloLive.setBroadcast((data) => {
  for (const res of sseClients) {
    res.write(`data: ${data}\n\n`);
  }
});

// ─── Middleware globalny ──────────────────────────────────────────────────────
app.use(express.json());
app.use(logger);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/users', usersRoute);

// ─── Agent SSE stream (real-time from ruflo CLI) ────────────────────────────
app.get('/api/agents/stream', (req, res) => {
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial full snapshot — real agents only
  const snapshot = rufloLive.getSnapshot();
  res.write(`data: ${JSON.stringify({ type: 'init', payload: snapshot })}\n\n`);

  sseClients.add(res);

  // Heartbeat every 20s
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ─── Agent API: REST fallback (real agents only) ────────────────────────────
app.get('/api/agents', (req, res) => {
  res.json(rufloLive.getSnapshot());
});

// ─── Task API: assign real tasks to agents ──────────────────────────────────
// POST /api/tasks  { description: "...", agent?: "coder" }
app.post('/api/tasks', (req, res) => {
  const { description, agent } = req.body;
  if (!description) return res.status(400).json({ error: 'Pole "description" jest wymagane.' });
  const result = rufloLive.assignTask(description, agent || null);
  if (!result.ok) return res.status(400).json(result);
  res.status(201).json(result);
});

// POST /api/tasks/complete  { agentId: "ruflo-coder-1", result?: "..." }
app.post('/api/tasks/complete', (req, res) => {
  const { agentId, result } = req.body;
  if (!agentId) return res.status(400).json({ error: 'Pole "agentId" jest wymagane.' });
  const r = rufloLive.completeTask(agentId, result || null);
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

// POST /api/messages  { from: "ruflo-orch", to: "ruflo-coder-1", text: "..." }
app.post('/api/messages', (req, res) => {
  const { from, to, text } = req.body;
  if (!from || !to || !text) return res.status(400).json({ error: 'Pola "from", "to", "text" są wymagane.' });
  const r = rufloLive.sendMessage(from, to, text);
  if (!r.ok) return res.status(400).json(r);
  res.status(201).json(r);
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
