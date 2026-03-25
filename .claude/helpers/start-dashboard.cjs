'use strict';
// Starts the RuFlo dashboard if not already running on port 4200.
const net  = require('net');
const path = require('path');
const { spawn } = require('child_process');

const PORT    = 4200;
const ROOT    = path.resolve(__dirname, '..', '..');
const SERVER  = path.join(ROOT, 'src', 'dashboard', 'server.js');

function isPortInUse(port) {
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => { tester.close(); resolve(false); })
      .listen(port, '127.0.0.1');
  });
}

(async () => {
  const inUse = await isPortInUse(PORT);
  if (inUse) {
    process.stdout.write(`[dashboard] already running on :${PORT}\n`);
    process.exit(0);
  }

  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  process.stdout.write(`[dashboard] started on http://localhost:${PORT}\n`);
  process.exit(0);
})();
