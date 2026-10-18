const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const storageService = require('../src/services/storageService');

test('Storage Service', async (t) => {
  const testStorageDir = path.join(__dirname, 'test-storage');

  t.after(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  await t.test('ensureDirectories creates media directories', () => {
    const dirs = storageService.ensureDirectories(testStorageDir);
    assert.ok(fs.existsSync(dirs.videosDir));
    assert.ok(fs.existsSync(dirs.musicDir));
    assert.ok(fs.existsSync(dirs.thumbnailsDir));
  });

  await t.test('getDiskUsage returns numeric disk statistics', async () => {
    const usage = await storageService.getDiskUsage(testStorageDir);
    assert.ok(typeof usage.totalBytes === 'number');
    assert.ok(typeof usage.freeBytes === 'number');
    assert.ok(usage.totalBytes > 0);
  });
});
