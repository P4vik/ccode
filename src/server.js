'use strict';

const http      = require('http');
const { WebSocketServer } = require('ws');
const app       = require('./app');
const simulator = require('./agents/simulator');
const store     = require('./agents/store');

const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ─── WebSocket handler ────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  // Send full snapshot on connect
  ws.send(JSON.stringify({ type: 'snapshot', payload: store.getSnapshot() }));

  ws.on('message', (raw) => {
    try {
      const { type } = JSON.parse(raw);
      if (type === 'snapshot') {
        ws.send(JSON.stringify({ type: 'snapshot', payload: store.getSnapshot() }));
      }
    } catch (_) {}
  });
});

// ─── Broadcast to all connected clients ──────────────────────────────────────
simulator.setBroadcast((msg) => {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
});

simulator.start(1500);

server.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
});
