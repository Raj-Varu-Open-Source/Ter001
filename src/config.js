const path = require('path');
const os = require('os');
const fs = require('fs');

function resolveDefaultStorageDir() {
  if (process.env.STORAGE_DIR) {
    return process.env.STORAGE_DIR;
  }
  // Check if running on Android Termux with shared storage setup
  const termuxShared = path.join(os.homedir(), 'storage', 'shared');
  if (fs.existsSync(termuxShared)) {
    return path.join(termuxShared, 'PocketHub');
  }
  return path.resolve(__dirname, '..', 'data', 'PocketHub');
}

function resolveDefaultDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  return path.resolve(__dirname, '..', 'data', 'pockethub.db');
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  storageDir: resolveDefaultStorageDir(),
  dbPath: resolveDefaultDbPath()
};

module.exports = {
  config,
  resolveDefaultStorageDir,
  resolveDefaultDbPath
};
