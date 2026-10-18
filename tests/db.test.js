const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initDb, getDb, closeDb } = require('../src/db');
const { config } = require('../src/config');

test('Database Layer', async (t) => {
  const testDbPath = path.join(__dirname, 'test.db');
  process.env.DB_PATH = testDbPath;

  t.after(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  await t.test('initDb creates notes and media tables', () => {
    initDb(testDbPath);
    const db = getDb();
    
    // Check notes table exists
    const notesTable = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'");
    assert.ok(notesTable, 'notes table should exist');

    // Check media table exists
    const mediaTable = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='media'");
    assert.ok(mediaTable, 'media table should exist');
  });

  await t.test('can insert and retrieve a note', () => {
    const db = getDb();
    const result = db.run(
      'INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)',
      ['Test Note', '# Hello World', 'test,note']
    );
    assert.ok(result.lastInsertRowid > 0);

    const note = db.get('SELECT * FROM notes WHERE id = ?', [result.lastInsertRowid]);
    assert.equal(note.title, 'Test Note');
    assert.equal(note.content, '# Hello World');
  });
});
