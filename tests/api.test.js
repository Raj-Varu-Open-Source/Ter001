const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { createApp } = require('../src/app');
const { initDb, closeDb } = require('../src/db');
const storageService = require('../src/services/storageService');

test('API Integration Tests', async (t) => {
  const testDir = path.join(__dirname, 'test-api-env');
  const testDb = path.join(testDir, 'api.db');
  storageService.ensureDirectories(testDir);
  initDb(testDb);

  const app = createApp({ storageDir: testDir });
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
    closeDb();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('GET /api/system/storage returns disk stats', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/system/storage`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalBytes > 0);
  });

  await t.test('POST and GET /api/notes workflow', async () => {
    const createRes = await fetch(`http://127.0.0.1:${port}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Integration Note', content: 'Testing full API', tags: 'api' })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.title, 'Integration Note');

    const getRes = await fetch(`http://127.0.0.1:${port}/api/notes/${created.id}`);
    assert.equal(getRes.status, 200);
    const note = await getRes.json();
    assert.equal(note.content, 'Testing full API');
  });

  await t.test('GET /api/media returns empty array initially', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/media`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
  });

  await t.test('Frontend static assets are served correctly', async () => {
    // Test index.html
    const indexRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(indexRes.status, 200);
    const html = await indexRes.text();
    assert.ok(html.includes('PocketHub'));
    assert.ok(html.includes('notes-view'));

    // Test CSS
    const cssRes = await fetch(`http://127.0.0.1:${port}/css/app.css`);
    assert.equal(cssRes.status, 200);
    const css = await cssRes.text();
    assert.ok(css.includes('--primary'));

    // Test JS
    const jsRes = await fetch(`http://127.0.0.1:${port}/js/app.js`);
    assert.equal(jsRes.status, 200);
    const js = await jsRes.text();
    assert.ok(js.includes('DOMContentLoaded'));
  });
});

