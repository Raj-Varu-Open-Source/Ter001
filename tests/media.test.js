const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');
const { initDb, closeDb } = require('../src/db');
const storageService = require('../src/services/storageService');
const mediaService = require('../src/services/mediaService');

test('Media Service & Range Streaming', async (t) => {
  const testDir = path.join(__dirname, 'test-media-env');
  const testDb = path.join(testDir, 'test.db');
  const dirs = storageService.ensureDirectories(testDir);
  initDb(testDb);

  // Create a dummy video file of 10,000 bytes
  const dummyVideo = path.join(dirs.videosDir, 'sample.mp4');
  fs.writeFileSync(dummyVideo, Buffer.alloc(10000, 1));

  t.after(() => {
    closeDb();
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('rescanStorage discovers files placed directly on disk', async () => {
    const result = await mediaService.rescanStorage(dirs);
    assert.equal(result.added, 1);
    const list = mediaService.listMedia({ type: 'video' });
    assert.equal(list.length, 1);
    assert.equal(list[0].filename, 'sample.mp4');
  });

  await t.test('sanitizeFilename prevents path traversal (Review Focus #2)', () => {
    const safe = mediaService.sanitizeFilename('../../etc/passwd.mp4');
    assert.ok(!safe.includes('..'));
    assert.ok(!safe.includes('/'));
    assert.ok(!safe.includes('\\'));
    assert.equal(safe, 'passwd.mp4');
  });

  await t.test('streamMedia handles partial content range requests (HTTP 206)', (t, done) => {
    const mockReq = { headers: { range: 'bytes=0-499' } };
    const mockRes = new PassThrough();
    let status = 0;
    let headers = {};

    mockRes.writeHead = (s, h) => {
      status = s;
      headers = h;
    };

    let bytesReceived = 0;
    mockRes.on('data', (chunk) => {
      bytesReceived += chunk.length;
    });

    mockRes.on('end', () => {
      assert.equal(status, 206);
      assert.equal(headers['Content-Range'], 'bytes 0-499/10000');
      assert.equal(headers['Content-Length'], 500);
      assert.equal(bytesReceived, 500);
      done();
    });

    mediaService.streamMedia(dummyVideo, mockReq, mockRes);
  });

  await t.test('streamMedia handles invalid range with HTTP 416 (Review Focus #1)', (t, done) => {
    const mockReq = { headers: { range: 'bytes=20000-30000' } };
    const mockRes = new PassThrough();
    let status = 0;
    let headers = {};

    mockRes.writeHead = (s, h) => {
      status = s;
      headers = h;
    };

    mockRes.on('finish', () => {
      assert.equal(status, 416);
      assert.equal(headers['Content-Range'], 'bytes */10000');
      done();
    });

    mediaService.streamMedia(dummyVideo, mockReq, mockRes);
  });

  await t.test('deleteMedia deletes file from disk and database', () => {
    const item = mediaService.getMediaByFilename('sample.mp4');
    assert.ok(item, 'sample.mp4 should exist before deletion');

    const deleted = mediaService.deleteMedia(item.id, dirs);
    assert.equal(deleted, true);
    assert.equal(fs.existsSync(dummyVideo), false);
    assert.equal(mediaService.getMediaById(item.id), null);
  });


  await t.test('rescanStorage handles missing directory gracefully (Review Focus #4)', async () => {
    const nonExistentDirs = {
      baseDir: path.join(testDir, 'non-existent'),
      videosDir: path.join(testDir, 'non-existent', 'videos'),
      musicDir: path.join(testDir, 'non-existent', 'music'),
      thumbnailsDir: path.join(testDir, 'non-existent', 'thumbnails')
    };
    const result = await mediaService.rescanStorage(nonExistentDirs);
    assert.ok(typeof result.added === 'number');
    assert.ok(fs.existsSync(nonExistentDirs.videosDir));
  });
});
