const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { initDb, closeDb } = require('../src/db');
const playlistService = require('../src/services/playlistService');

const TEST_DB = path.join(__dirname, 'test-playlists.db');

test.beforeEach(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  initDb(TEST_DB);
});

test.afterEach(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

test('Playlist CRUD and Track Associations', () => {
  const p = playlistService.createPlaylist('Chill Vibes');
  assert.equal(p.name, 'Chill Vibes');
  assert.ok(p.id > 0);

  const list = playlistService.listPlaylists();
  assert.equal(list.length, 1);
  assert.equal(list[0].track_count, 0);

  // Add a fake media track to DB
  const db = require('../src/db').getDb();
  const res = db.run("INSERT INTO media (filename, original_name, media_type, mime_type, file_size) VALUES (?, ?, ?, ?, ?)",
    ['song1.mp3', 'Song One.mp3', 'audio', 'audio/mpeg', 1024]);
  const mediaId = res.lastInsertRowid;

  playlistService.addTrackToPlaylist(p.id, mediaId);
  const detail = playlistService.getPlaylist(p.id);
  assert.equal(detail.tracks.length, 1);
  assert.equal(detail.tracks[0].original_name, 'Song One.mp3');

  playlistService.removeTrackFromPlaylist(p.id, mediaId);
  assert.equal(playlistService.getPlaylist(p.id).tracks.length, 0);

  playlistService.deletePlaylist(p.id);
  assert.equal(playlistService.listPlaylists().length, 0);
});

test('Playlist HTTP Endpoints Integration', async (t) => {
  const { createApp } = require('../src/app');
  const app = createApp();
  let server;
  let port;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  // POST /api/playlists
  const postRes = await fetch(`http://127.0.0.1:${port}/api/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Roadtrip Hits' })
  });
  assert.equal(postRes.status, 201);
  const created = await postRes.json();
  assert.equal(created.name, 'Roadtrip Hits');

  // GET /api/playlists
  const listRes = await fetch(`http://127.0.0.1:${port}/api/playlists`);
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.equal(list.length, 1);

  // DELETE /api/playlists/:id
  const delRes = await fetch(`http://127.0.0.1:${port}/api/playlists/${created.id}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);
});

