const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initDb, closeDb } = require('../src/db');
const notesService = require('../src/services/notesService');

test('Notes Service', async (t) => {
  const testDbPath = path.join(__dirname, 'test-notes.db');
  initDb(testDbPath);

  t.after(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  await t.test('createNote with valid data', () => {
    const note = notesService.createNote({ title: 'My Idea', content: 'Details here', tags: 'ideas,dev' });
    assert.equal(note.title, 'My Idea');
    assert.equal(note.content, 'Details here');
    assert.ok(note.id > 0);
  });

  await t.test('createNote with empty title falls back to Untitled Note (Review Focus #3)', () => {
    const note = notesService.createNote({ title: '   ', content: 'Some text', tags: '' });
    assert.equal(note.title, 'Untitled Note');
  });

  await t.test('listNotes filters by search keyword', () => {
    notesService.createNote({ title: 'Grocery List', content: 'Milk, Eggs', tags: 'home' });
    const results = notesService.listNotes({ search: 'Grocery' });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Grocery List');
  });

  await t.test('updateNote updates content and timestamp', () => {
    const note = notesService.createNote({ title: 'Original', content: 'V1', tags: '' });
    const updated = notesService.updateNote(note.id, { title: 'Updated', content: 'V2', tags: 'v2' });
    assert.equal(updated.title, 'Updated');
    assert.equal(updated.content, 'V2');
  });

  await t.test('deleteNote removes note', () => {
    const note = notesService.createNote({ title: 'To Delete', content: 'Bye', tags: '' });
    const deleted = notesService.deleteNote(note.id);
    assert.equal(deleted, true);
    assert.equal(notesService.getNoteById(note.id), null);
  });
});
