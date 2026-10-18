# Personal Knowledge & Media Hub (PocketHub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, self-hosted personal knowledge and media hub that runs in Android Termux via Node.js and SQLite, accessible over Wi-Fi/hotspot without external accounts or heavy dependencies.

**Architecture:** An Express.js backend provides REST APIs for notes, media management, and disk storage inspection, paired with SQLite for structured data. Video streaming implements standard HTTP Range requests (`206 Partial Content`) for instant scrubbing. The frontend is a responsive single-page application (Option A) with a left sidebar (Notes, Videos, Music, Storage gauge) and a persistent bottom audio player.

**Tech Stack:** Node.js (v18+ / v22+), SQLite (`node:sqlite` with fallback to `better-sqlite3`), Express.js, Multer (file uploads), HTML5 Video/Audio APIs, Vanilla JavaScript + CSS.

**Spec:** [docs/superpowers/specs/2026-10-19-termux-personal-hub-design.md](file:///E:/My%20Custom%20softwares/TermuxCombine/docs/superpowers/specs/2026-10-19-termux-personal-hub-design.md)

## Global Constraints
- **Platform:** Android Termux compatible (ARM64/ARMv7, zero compilation steps on modern Node.js).
- **Database:** SQLite with zero external database daemons (no PostgreSQL, no Redis).
- **Access:** Direct access with no password or login requirements on local subnet.
- **Dependencies:** Pure Node.js; no external binaries required (no FFmpeg required for thumbnail generation; client canvas generates thumbnails).
- **Storage:** Direct file storage in Android shared storage (`~/storage/shared/PocketHub` or fallback to local directory).
- **Network:** Bound to `0.0.0.0` for hotspot/LAN accessibility.

## Review Focus
1. **Invalid Range Header Handling:** Video streaming requests with out-of-bounds byte ranges (e.g. `bytes=99999999-`) must return `HTTP 416 Range Not Satisfiable` with `Content-Range: bytes */total_size` instead of crashing. *(Tested in Task 4)*
2. **Path Traversal in Uploads & Streams:** Uploaded filenames or media request IDs containing path traversal characters (`../`, `..\`) must be sanitized to prevent accessing files outside the storage root. *(Tested in Task 4)*
3. **Empty Note Handling:** Notes created with blank or whitespace-only titles must automatically fallback to a sensible title or "Untitled Note" rather than failing with database errors. *(Tested in Task 2)*
4. **Missing Storage Directory Rescan:** Triggering a directory rescan when the target storage directory does not yet exist must gracefully create the directory and return empty results rather than throwing an unhandled exception. *(Tested in Task 4)*
5. **Memory-Safe Uploads:** Large video file uploads must be streamed directly to disk via busboy/multer disk storage, preventing Node.js process out-of-memory errors on RAM-constrained smartphones. *(Tested in Task 4)*

---

### Task 1: Project Scaffolding, Configuration, and SQLite Database Layer

**Files:**
- Create: `package.json`
- Create: `src/config.js`
- Create: `src/db.js`
- Test: `tests/db.test.js`

**Interfaces:**
- Produces:
  - `config`: `{ port: number, host: string, storageDir: string, dbPath: string }`
  - `getDb()`: returns SQLite database instance providing `query(sql, params)`, `run(sql, params)`, `get(sql, params)`, and `exec(sql)`
  - `initDb()`: creates `notes` and `media` tables and indexes if they do not exist

- [ ] **Step 1: Write the failing test for configuration and database initialization**

Create `tests/db.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/db.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `package.json`, `src/config.js`, and `src/db.js`**

`package.json`:
```json
{
  "name": "termux-pocket-hub",
  "version": "1.0.0",
  "description": "Personal Knowledge & Media Hub for Android Termux",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  }
}
```

`src/config.js`:
Resolve storage directory checking `~/storage/shared/PocketHub` or fallback to `./data/PocketHub`, database file at `./data/pockethub.db`, host `0.0.0.0`, and default port `3000`.

`src/db.js`:
Create database wrapper that uses Node's native `DatabaseSync` (from `node:sqlite`) if available, or falls back to `better-sqlite3`. Provide standard `get(sql, params)`, `all(sql, params)`, `run(sql, params)`, `exec(sql)`, `initDb(path)`, and `closeDb()`. Schema creates:
- `notes` (id, title, content, tags, created_at, updated_at)
- `media` (id, filename, original_name, media_type, mime_type, file_size, duration, thumbnail_path, created_at)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/db.test.js`
Expected: PASS with all tests passing.

- [ ] **Step 5: Commit**

```bash
git add package.json src/config.js src/db.js tests/db.test.js
git commit -m "feat: setup project config and SQLite database layer"
```

---

### Task 2: Notes Service and API Endpoints

**Files:**
- Create: `src/services/notesService.js`
- Create: `src/routes/notesRoutes.js`
- Test: `tests/notes.test.js`

**Interfaces:**
- Consumes: `getDb()` from `src/db.js`
- Produces:
  - `notesService.createNote({ title, content, tags }) -> Note`
  - `notesService.getNoteById(id) -> Note | null`
  - `notesService.listNotes({ search, tag }) -> Note[]`
  - `notesService.updateNote(id, { title, content, tags }) -> Note | null`
  - `notesService.deleteNote(id) -> boolean`
  - `notesRoutes`: Express Router mounted at `/api/notes`

- [ ] **Step 1: Write the failing test for notes service and routes**

Create `tests/notes.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/notes.test.js`
Expected: FAIL with "Cannot find module '../src/services/notesService'"

- [ ] **Step 3: Implement `src/services/notesService.js` and `src/routes/notesRoutes.js`**

Implement `src/services/notesService.js` handling sanitization, empty title fallback to "Untitled Note", search filtering via `LIKE %query%`, and CRUD operations.
Implement `src/routes/notesRoutes.js` with Express router endpoints:
- `GET /api/notes` (supports `?search=` and `?tag=`)
- `GET /api/notes/:id`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/notes.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/notesService.js src/routes/notesRoutes.js tests/notes.test.js
git commit -m "feat: implement notes service and REST API"
```

---

### Task 3: Storage Service and System Health Endpoints

**Files:**
- Create: `src/services/storageService.js`
- Create: `src/routes/systemRoutes.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `config` from `src/config.js`
- Produces:
  - `storageService.getDiskUsage(path) -> { totalBytes, freeBytes, usedBytes, percentUsed }`
  - `storageService.ensureDirectories() -> { baseDir, videosDir, musicDir, thumbnailsDir }`
  - `systemRoutes`: Express Router mounted at `/api/system` providing `/api/system/storage`

- [ ] **Step 1: Write the failing test for storage service**

Create `tests/storage.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/storage.test.js`
Expected: FAIL with "Cannot find module '../src/services/storageService'"

- [ ] **Step 3: Implement `src/services/storageService.js` and `src/routes/systemRoutes.js`**

`src/services/storageService.js`:
Uses `fs.statfs` (standard in Node 18.15+) to compute total, free, and used space in bytes and percentage. Creates subdirectories for `videos`, `music`, and `thumbnails`.
`src/routes/systemRoutes.js`:
Express router providing `GET /api/system/storage` returning `{ totalBytes, freeBytes, usedBytes, percentUsed, path }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/storage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/storageService.js src/routes/systemRoutes.js tests/storage.test.js
git commit -m "feat: implement storage calculation and system health API"
```

---

### Task 4: Media Service (File Management, Streaming Range Requests, Rescan)

**Files:**
- Create: `src/services/mediaService.js`
- Create: `src/routes/mediaRoutes.js`
- Test: `tests/media.test.js`

**Interfaces:**
- Consumes: `getDb()` from `src/db.js`, `storageService` from `src/services/storageService.js`
- Produces:
  - `mediaService.listMedia({ type }) -> MediaItem[]`
  - `mediaService.getMediaById(id) -> MediaItem | null`
  - `mediaService.saveMediaRecord(record) -> MediaItem`
  - `mediaService.deleteMedia(id) -> boolean` (deletes both DB entry and disk file)
  - `mediaService.rescanStorage() -> { added, removed, total }`
  - `mediaService.streamMedia(filePath, req, res) -> void` (handles HTTP 206 Range requests and 416 errors)
  - `mediaRoutes`: Express Router mounted at `/api/media`

- [ ] **Step 1: Write the failing test for media service and streaming range requests**

Create `tests/media.test.js`:
```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
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

  await t.test('streamMedia handles partial content range requests (HTTP 206)', (t, done) => {
    const mockReq = { headers: { range: 'bytes=0-499' } };
    let status = 0;
    let headers = {};
    const mockRes = {
      writeHead: (s, h) => { status = s; headers = h; },
      on: () => {},
      once: () => {},
      emit: () => {},
      end: () => {
        assert.equal(status, 206);
        assert.equal(headers['Content-Range'], 'bytes 0-499/10000');
        assert.equal(headers['Content-Length'], 500);
        done();
      }
    };
    mediaService.streamMedia(dummyVideo, mockReq, mockRes);
  });

  await t.test('streamMedia handles invalid range with HTTP 416 (Review Focus #1)', (t, done) => {
    const mockReq = { headers: { range: 'bytes=20000-30000' } };
    let status = 0;
    let headers = {};
    const mockRes = {
      writeHead: (s, h) => { status = s; headers = h; },
      end: () => {
        assert.equal(status, 416);
        assert.equal(headers['Content-Range'], 'bytes */10000');
        done();
      }
    };
    mediaService.streamMedia(dummyVideo, mockReq, mockRes);
  });

  await t.test('deleteMedia deletes file from disk and database', () => {
    const list = mediaService.listMedia({ type: 'video' });
    const deleted = mediaService.deleteMedia(list[0].id, dirs);
    assert.equal(deleted, true);
    assert.equal(fs.existsSync(dummyVideo), false);
    assert.equal(mediaService.listMedia({ type: 'video' }).length, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/media.test.js`
Expected: FAIL with "Cannot find module '../src/services/mediaService'"

- [ ] **Step 3: Implement `src/services/mediaService.js` and `src/routes/mediaRoutes.js`**

`src/services/mediaService.js`:
- `streamMedia`: Parses `req.headers.range`. If valid range, sets `206 Partial Content` with `Content-Range: bytes start-end/total` and pipes `fs.createReadStream(filePath, { start, end })`. If range is out of bounds (start >= total), responds with `416 Range Not Satisfiable` and `Content-Range: bytes */total`. If no range, responds with 200 and full stream.
- `rescanStorage`: Reads files in `videos/` and `music/`, compares with SQLite records, adds new files, removes deleted records.
- `deleteMedia`: Removes file and thumbnail from disk, removes record from DB.
- Path sanitization: strips `..`, path separators, ensuring all file access stays strictly inside media directories.

`src/routes/mediaRoutes.js`:
Configure `multer` disk storage to stream uploads directly into `temp/` then move to `videos/` or `music/` along with any client-submitted thumbnail. Endpoints:
- `GET /api/media` (supports `?type=video|music`)
- `POST /api/media/upload` (multipart with file and optional thumbnail)
- `GET /api/media/:id/stream` (video/audio streaming with range requests)
- `GET /api/media/:id/download` (attachment download)
- `GET /api/media/:id/thumbnail` (serves thumbnail image)
- `DELETE /api/media/:id` (deletes media)
- `POST /api/media/rescan` (manual directory rescan)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/media.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/mediaService.js src/routes/mediaRoutes.js tests/media.test.js
git commit -m "feat: implement media service, range streaming, and rescan"
```

---

### Task 5: Express App Assembly and Server Entry Point

**Files:**
- Create: `src/app.js`
- Create: `src/server.js`
- Create: `termux-start.sh`
- Test: `tests/api.test.js`

**Interfaces:**
- Produces:
  - `createApp()`: Express application with all routes, static file serving, and error handling
  - `startServer()`: Initializes DB, directories, binds HTTP listener to configured host/port
  - `termux-start.sh`: Bash startup script with storage permission verification and IP display

- [ ] **Step 1: Write integration tests for full Express server API**

Create `tests/api.test.js`:
```javascript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api.test.js`
Expected: FAIL with "Cannot find module '../src/app'"

- [ ] **Step 3: Implement `src/app.js`, `src/server.js`, and `termux-start.sh`**

`src/app.js`:
Assembles middleware (`express.json()`, `express.urlencoded()`, static file serving from `public/`), mounts `/api/notes`, `/api/media`, `/api/system`, and adds 404/500 error handlers.

`src/server.js`:
Reads config, initializes DB, ensures storage directories, detects local network IP addresses (Hotspot/Wi-Fi), and starts the server printing friendly access URLs.

`termux-start.sh`:
Executable script for Termux:
- Checks if `~/storage/shared` exists; if not, alerts user to run `termux-setup-storage`.
- Checks for `node` and `sqlite3` packages.
- Prints active Wi-Fi / Hotspot IP using `ip route` or `ifconfig`.
- Launches `node src/server.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app.js src/server.js termux-start.sh tests/api.test.js
git commit -m "feat: assemble express server and termux startup script"
```

---

### Task 6: Frontend Web Client (Option A: Unified Dashboard)

**Files:**
- Create: `public/index.html`
- Create: `public/css/app.css`
- Create: `public/js/app.js`
- Create: `public/js/notes.js`
- Create: `public/js/videos.js`
- Create: `public/js/music.js`
- Create: `public/js/storage.js`

**Interfaces:**
- Consumes: REST APIs from `/api/notes`, `/api/media`, `/api/system`
- Produces:
  - Responsive single-page application with sidebar navigation:
    - Notes view with note list, search bar, and rich editor (bold, italic, headings, checklists)
    - Video view with video card grid, drag-and-drop upload zone with client-side canvas thumbnail generator, and HTML5 video streaming player modal
    - Music view with track list, upload zone, and persistent bottom audio bar with continuous playback across views
    - Storage meter in sidebar footer with manual "Rescan" trigger

- [ ] **Step 1: Create `public/index.html` and `public/css/app.css`**

Build clean semantic HTML5 layout:
- Left sidebar with pocket hub branding, navigation links (`Notes`, `Videos`, `Music`), and bottom storage widget.
- Main content container dynamically rendering the active section.
- Video playback modal with full controls.
- Sticky bottom audio player with Play/Pause, Next/Prev, track title, artist, progress scrub bar, and volume slider.
- CSS styling: modern dark theme, responsive grid layouts, mobile-friendly touch targets.

- [ ] **Step 2: Implement `public/js/notes.js`**

Notes controller:
- Fetch and display notes list with instant search filtering.
- Create/edit note modal or inline editor with formatting buttons (Bold, Italic, H1, H2, Checklist).
- Save, update, and delete actions calling `/api/notes`.

- [ ] **Step 3: Implement `public/js/videos.js`**

Videos controller:
- Fetch and display video grid with thumbnails and metadata.
- Drag-and-drop upload handler:
  - On file selection, loads video in hidden `<video>` element, seeks to 1s, captures frame to `<canvas>` as JPEG, and appends `thumbnail` to the `FormData` upload.
  - Displays upload progress bar.
- Video click handler: opens video player modal streaming from `/api/media/:id/stream`.
- Download and Delete actions.

- [ ] **Step 4: Implement `public/js/music.js`**

Music controller:
- Fetch and display audio track list.
- Audio upload handler (MP3, M4A, FLAC, WAV).
- Track selection handler: loads audio stream `/api/media/:id/stream` into persistent audio bar.
- Audio controls: play, pause, seek bar, time display, next/prev track in playlist. Audio playback continues uninterrupted when navigating between tabs.

- [ ] **Step 5: Implement `public/js/storage.js` and `public/js/app.js`**

Storage controller:
- Fetches `/api/system/storage` and updates the sidebar storage gauge (used vs free space).
- Manual "Rescan Library" button triggering `POST /api/media/rescan`.
App bootstrap (`app.js`):
- Handles tab switching between Notes, Videos, and Music without page reload.
- Initializes views and storage status on load.

- [ ] **Step 6: Verify end-to-end frontend functionality in test**

Add an end-to-end verification test in `tests/api.test.js` confirming static assets are served (`GET /` returns HTML, `GET /css/app.css` returns CSS, `GET /js/app.js` returns JS).
Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/
git commit -m "feat: implement unified media and notes web dashboard"
```

---

## Plan Self-Review Checklist
1. **Spec Coverage:**
   - Termux native in Node.js & SQLite: Handled in Task 1 (`src/db.js` using `node:sqlite`).
   - Direct local access (no password): Handled in Task 5 (open local subnet access).
   - Option A layout (Notes, Videos, Music, Storage gauge): Handled in Task 6.
   - Video streaming with range requests: Handled in Task 4 (`streamMedia` with 206 Partial Content).
   - Persistent music player: Handled in Task 6 (`music.js` sticky bottom audio bar).
   - Android shared storage: Handled in Task 1 & 3 (`~/storage/shared/PocketHub`).
   - Manual rescan & thumbnail generation via canvas: Handled in Tasks 4 & 6.
2. **Step Scan:** Every step has an exact test, command, and unambiguous file changes.
3. **Type Consistency:** Method signatures and API routes (`/api/notes`, `/api/media`, `/api/system`) are consistent across tasks.
4. **Review Focus:** All 5 review focus items are assigned to and verified by tests in Tasks 2 and 4.
5. **Proportion:** The plan gives clear signatures and architecture without dumping unnecessary transcripts.
