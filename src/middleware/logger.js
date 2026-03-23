'use strict';

function logger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms        = Date.now() - start;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const color     = res.statusCode >= 500 ? '\x1b[31m'   // czerwony
                    : res.statusCode >= 400 ? '\x1b[33m'   // żółty
                    : res.statusCode >= 300 ? '\x1b[36m'   // cyjan
                    :                         '\x1b[32m';  // zielony
    const reset     = '\x1b[0m';

    console.log(
      `${color}[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms${reset}`
    );
  });

  next();
}

module.exports = logger;
