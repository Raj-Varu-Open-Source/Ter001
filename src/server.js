const os = require('os');
const { config } = require('./config');
const { initDb, closeDb } = require('./db');
const storageService = require('./services/storageService');
const { createApp } = require('./app');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Skip internal (127.0.0.1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }

  return addresses;
}

function startServer() {
  // 1. Initialize SQLite Database
  initDb(config.dbPath);
  console.log(`[PocketHub] SQLite Database initialized at: ${config.dbPath}`);

  // 2. Ensure Storage Directories
  const dirs = storageService.ensureDirectories(config.storageDir);
  console.log(`[PocketHub] Media storage directory: ${dirs.baseDir}`);

  // 3. Create Express App
  const app = createApp({ storageDir: config.storageDir });

  // 4. Listen on Host and Port
  const server = app.listen(config.port, config.host, () => {
    console.log('\n======================================================');
    console.log('  📱 PocketHub - Personal Media & Notes Hub is RUNNING');
    console.log('======================================================');
    console.log(`  Local:            http://localhost:${config.port}`);

    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
      console.log('  On your Hotspot/Wi-Fi:');
      for (const item of ips) {
        console.log(`    👉 http://${item.address}:${config.port}  (${item.interface})`);
      }
    } else {
      console.log(`  Hotspot/Wi-Fi:    http://<phone-ip>:${config.port}`);
    }
    console.log('======================================================\n');
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) {
      console.log('[PocketHub] Force exiting...');
      process.exit(0);
    }
    isShuttingDown = true;
    console.log('\n[PocketHub] Shutting down server gracefully...');

    // Close all connections immediately so HTTP keep-alive sockets don't hang the process (Node 18.2+)
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    } else if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    // Safety timeout: force exit if any socket or async task hangs longer than 1s
    const forceExitTimer = setTimeout(() => {
      try { closeDb(); } catch (_) {}
      process.exit(0);
    }, 1000);
    forceExitTimer.unref();

    server.close((err) => {
      clearTimeout(forceExitTimer);
      try { closeDb(); } catch (_) {}
      if (err) {
        console.error('[PocketHub] Error closing server:', err);
        process.exit(1);
      }
      console.log('[PocketHub] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
