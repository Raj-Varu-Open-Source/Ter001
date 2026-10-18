const fs = require('fs');
const path = require('path');
const { config } = require('./config');

let currentDb = null;
let currentDbPath = null;

function createDbConnection(dbFilePath) {
  // Ensure target directory exists
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let rawDb;
  // Try native node:sqlite first
  try {
    const { DatabaseSync } = require('node:sqlite');
    rawDb = new DatabaseSync(dbFilePath);
  } catch (err) {
    // Fallback to better-sqlite3 if node:sqlite is unavailable
    try {
      const Database = require('better-sqlite3');
      rawDb = new Database(dbFilePath);
    } catch (err2) {
      throw new Error(`Failed to initialize SQLite. Ensure Node v22+ (for built-in node:sqlite) or install better-sqlite3. Details: ${err.message}; ${err2.message}`);
    }
  }

  function normalizeParams(params) {
    if (params === undefined || params === null) return [];
    if (Array.isArray(params)) return params;
    return [params];
  }

  const wrapper = {
    raw: rawDb,
    get(sql, params) {
      const stmt = rawDb.prepare(sql);
      return stmt.get(...normalizeParams(params));
    },
    all(sql, params) {
      const stmt = rawDb.prepare(sql);
      return stmt.all(...normalizeParams(params));
    },
    run(sql, params) {
      const stmt = rawDb.prepare(sql);
      const res = stmt.run(...normalizeParams(params));
      return {
        changes: res.changes !== undefined ? Number(res.changes) : 0,
        lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0
      };
    },
    exec(sql) {
      return rawDb.exec(sql);
    },
    close() {
      if (rawDb && typeof rawDb.close === 'function') {
        rawDb.close();
      }
    }
  };

  return wrapper;
}

function initDb(dbFilePath = config.dbPath) {
  if (currentDb && currentDbPath === dbFilePath) {
    return currentDb;
  }
  if (currentDb) {
    closeDb();
  }

  currentDb = createDbConnection(dbFilePath);
  currentDbPath = dbFilePath;

  // Run schema initialization
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      media_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      duration REAL DEFAULT 0,
      thumbnail_path TEXT DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
  `);

  return currentDb;
}

function getDb() {
  if (!currentDb) {
    return initDb();
  }
  return currentDb;
}

function closeDb() {
  if (currentDb) {
    currentDb.close();
    currentDb = null;
    currentDbPath = null;
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  createDbConnection
};
