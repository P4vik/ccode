'use strict';

const http      = require('http');
const app       = require('./app');
const rufloLive = require('./agents/ruflo-live');

const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);

// ─── Wire SSE broadcast from ruflo-live ─────────────────────────────────────
const sseClients = app.sseClients;

rufloLive.setBroadcast((msg) => {
  for (const res of sseClients) {
    res.write(`data: ${msg}\n\n`);
  }
});

// ─── Start live monitoring: poll ruflo CLI every 3s (no auto-tasks) ──────────
rufloLive.start(3000);

server.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`Tryb: LIVE — tylko prawdziwe agenty ruflo`);
});
