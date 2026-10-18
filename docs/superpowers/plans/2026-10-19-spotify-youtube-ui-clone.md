# 1:1 Spotify & YouTube UI Clones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PocketHub's media sections into 1:1 pixel-faithful clones of Spotify (playlists, track table, persistent player, separate upload) and YouTube (16:9 card grid, 2-column theater watch page, "Up Next" queue, separate studio upload), fully responsive on smartphones and Windows desktop.

**Architecture:** Adds SQLite-backed playlist management (`playlists` and `playlist_tracks` tables) with REST endpoints under `/api/playlists`. Completely revamps the HTML, CSS, and client-side controllers to mirror the authentic design tokens, layout grids, components, and interactions of Spotify and YouTube.

**Tech Stack:** Node.js, Express, SQLite (`node:sqlite` / `better-sqlite3`), Vanilla JS, HTML5/CSS3 (flexbox & grid).

**Spec:** [`docs/superpowers/specs/2026-10-19-spotify-youtube-ui-clone-design.md`](file:///E:/My%20Custom%20softwares/TermuxCombine/docs/superpowers/specs/2026-10-19-spotify-youtube-ui-clone-design.md)

## Global Constraints

* Pure Node.js and SQLite with zero external dependencies or daemons.
* Authentic design tokens: Spotify Green (`#1db954`), Spotify Dark (`#121212`, `#181818`, `#282828`); YouTube Red (`#ff0000`), YouTube Dark (`#0f0f0f`, `#272727`).
* Client-side canvas video thumbnail extraction (0% phone CPU load).
* Continuous background audio across view changes and playlist navigation.
* Responsive layouts: single-column on mobile ($\le 768\text{px}$), multi-column grids and 2-column watch mode on Windows desktop.

## Review Focus

1. **Playlist Integrity & Cascades**: Deleting a playlist must remove its playlist-track associations without deleting the underlying audio files; deleting an audio track must cascade-remove it from all playlists.
2. **Audio Continuity During Navigation**: Switching between "All Songs", "Playlists", "Upload", or YouTube videos must never stop or restart currently playing music.
3. **YouTube Theater Mode Transitions**: Clicking any video in the browse grid or "Up Next" sidebar must seamlessly transition the video player, update metadata and download/delete links, and recalculate "Up Next" items without full page reload.
4. **Mobile Layout Fluidity**: On screens $\le 768\text{px}$, the YouTube theater mode must stack the video player on top with related videos below, and the Spotify player bar must stay docked without overflowing viewport width.
5. **Separate Upload Isolation**: Uploading music or video files must occur in dedicated views without cluttering the browsing grid or playlist views.

---

### Task 1: Playlists Database Schema, Service & REST API

**Files:**
* Modify: `src/db.js`
* Create: `src/services/playlistService.js`
* Create: `src/routes/playlistRoutes.js`
* Modify: `src/app.js`
* Test: `tests/playlists.test.js`

**Interfaces:**
* Consumes: `src/db.js` `getDb()`, `media` table.
* Produces: `GET /api/playlists`, `POST /api/playlists`, `GET /api/playlists/:id`, `POST /api/playlists/:id/tracks`, `DELETE /api/playlists/:id/tracks/:mediaId`, `DELETE /api/playlists/:id`.

- [ ] **Step 1: Write failing tests for Playlist Service & API**

```javascript
// tests/playlists.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/playlists.test.js`  
Expected: FAIL (`playlistService` not found)

- [ ] **Step 3: Update `src/db.js` with `playlists` and `playlist_tracks` tables**

Add table creation and indexes for `playlists` and `playlist_tracks` with foreign keys.

- [ ] **Step 4: Implement `src/services/playlistService.js`**

Implement `createPlaylist`, `listPlaylists`, `getPlaylist`, `addTrackToPlaylist`, `removeTrackFromPlaylist`, `deletePlaylist`.

- [ ] **Step 5: Create `src/routes/playlistRoutes.js` and mount in `src/app.js`**

Mount `/api/playlists` with validation for missing names or duplicate tracks.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/playlists.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/db.js src/services/playlistService.js src/routes/playlistRoutes.js src/app.js tests/playlists.test.js
git commit -m "feat: add playlist database schema, service, and REST endpoints"
```

---

### Task 2: 🎵 1:1 Spotify UI Clone (Music Tab & Bottom Player)

**Files:**
* Modify: `public/index.html`
* Modify: `public/css/app.css`
* Modify: `public/js/music.js`
* Modify: `public/js/app.js`
* Test: `tests/frontend-spotify.test.js`

**Interfaces:**
* Consumes: `/api/playlists`, `/api/media?type=audio`, `/api/media/:id/stream`.
* Produces: Spotify library shelf, hero banner, Spotify track table (`#`, `Title`, `Duration`, `+ Playlist`), separate upload view, and Spotify bottom player bar.

- [ ] **Step 1: Write failing test for Spotify UI elements**

```javascript
// tests/frontend-spotify.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Spotify 1:1 UI Elements and Tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="spotify-library-shelf"'), 'Should have Spotify library shelf');
  assert.ok(html.includes('id="spotify-hero"'), 'Should have Spotify hero header');
  assert.ok(html.includes('id="spotify-track-table"'), 'Should have Spotify track data table');
  assert.ok(html.includes('id="music-upload-section"'), 'Should have separate music upload section');
  assert.ok(html.includes('id="player-shuffle-btn"'), 'Should have Spotify shuffle button');
  assert.ok(html.includes('id="player-repeat-btn"'), 'Should have Spotify repeat button');

  const css = fs.readFileSync(path.join(__dirname, '../public/css/app.css'), 'utf8');
  assert.ok(css.includes('#1db954'), 'CSS must include authentic Spotify green #1db954');
  assert.ok(css.includes('.spotify-track-row'), 'CSS must include spotify-track-row styling');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend-spotify.test.js`  
Expected: FAIL

- [ ] **Step 3: Update `public/index.html` for Spotify 1:1 Layout**

Structure `#music-view` into:
1. Sub-nav pills: `[ 🎵 All Songs ]`, `[ 📚 Playlists ]`, `[ ⬆️ Upload Music ]`.
2. Playlists sidebar shelf with `+ Create Playlist` button and modal.
3. Spotify Hero Banner with green/black gradient backdrop, big playlist cover, title, and track metadata.
4. Spotify Track Table with columns: `#`, `Title`, `Duration`, `Add to Playlist`, `Delete`.
5. Separate Upload section with clean dropzone.
6. Persistent Spotify Player Bar with green scrub bar, album art, and shuffle/repeat buttons.

- [ ] **Step 4: Update `public/css/app.css` with Spotify Theme Tokens & Styles**

Add `.spotify-hero`, `.spotify-table`, `.spotify-row`, `.spotify-btn-play`, green hover states, and responsive mobile player rules.

- [ ] **Step 5: Implement Spotify Client Controller in `public/js/music.js`**

Implement playlist loading, track table rendering, adding to playlist, shuffle/repeat state toggles, and view switching between All Tracks, Playlists, and Upload.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/frontend-spotify.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/css/app.css public/js/music.js public/js/app.js tests/frontend-spotify.test.js
git commit -m "feat: implement 1:1 Spotify UI clone with playlists, track table, and player bar"
```

---

### Task 3: 🎬 1:1 YouTube UI Clone (Videos Tab & Theater Watch Mode)

**Files:**
* Modify: `public/index.html`
* Modify: `public/css/app.css`
* Modify: `public/js/videos.js`
* Test: `tests/frontend-youtube.test.js`

**Interfaces:**
* Consumes: `/api/media?type=video`, `/api/media/:id/stream`.
* Produces: 16:9 YouTube video card grid, YouTube Watch Theater mode with "Up Next" sidebar queue, and separate YouTube Upload Studio.

- [ ] **Step 1: Write failing test for YouTube UI elements**

```javascript
// tests/frontend-youtube.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('YouTube 1:1 UI Elements and Tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="yt-category-chips"'), 'Should have YouTube category chips');
  assert.ok(html.includes('id="yt-video-grid"'), 'Should have YouTube video cards grid');
  assert.ok(html.includes('id="yt-watch-view"'), 'Should have YouTube 2-column watch view');
  assert.ok(html.includes('id="yt-up-next-list"'), 'Should have YouTube Up Next sidebar queue');
  assert.ok(html.includes('id="video-upload-section"'), 'Should have separate YouTube upload studio section');

  const css = fs.readFileSync(path.join(__dirname, '../public/css/app.css'), 'utf8');
  assert.ok(css.includes('#ff0000'), 'CSS must include YouTube red #ff0000');
  assert.ok(css.includes('.yt-duration-badge'), 'CSS must include yt-duration-badge');
  assert.ok(css.includes('.yt-watch-container'), 'CSS must include yt-watch-container');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend-youtube.test.js`  
Expected: FAIL

- [ ] **Step 3: Update `public/index.html` for YouTube 1:1 Layout**

Structure `#videos-view` into:
1. YouTube category pills: `[ All ]`, `[ ⬆️ Upload Studio ]`.
2. Browse Grid: 16:9 thumbnail cards with rounded corners, duration badge, avatar, title, and timestamp.
3. YouTube Watch Theater View: 2-column layout on desktop (large player on left with channel row, like/download/delete buttons, gray description box; "Up Next" sidebar on right); stacked layout on mobile.
4. Separate Upload Studio section with drag-and-drop and canvas thumbnail extraction.

- [ ] **Step 4: Update `public/css/app.css` with YouTube Dark Theme & Watch Mode**

Add `.yt-card`, `.yt-duration-badge`, `.yt-watch-container`, `.yt-up-next-card`, and mobile responsive stacking rules.

- [ ] **Step 5: Implement YouTube Client Controller in `public/js/videos.js`**

Implement video grid rendering, click-to-watch transition into theater mode, "Up Next" queue population, and studio upload view switching.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/frontend-youtube.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/css/app.css public/js/videos.js tests/frontend-youtube.test.js
git commit -m "feat: implement 1:1 YouTube UI clone with 16:9 cards, theater watch mode, and studio upload"
```

---

### Task 4: Complete Integration Verification & Documentation

**Files:**
* Modify: `README.md`
* Verify: All tests in `tests/*.test.js`

- [ ] **Step 1: Update `README.md` with Spotify & YouTube clone features**

Document Spotify playlists, persistent player bar, YouTube theater watch mode, and separate upload sections.

- [ ] **Step 2: Run complete test suite**

Run: `node --test tests/*.test.js`  
Expected: All 31+ tests passing.

- [ ] **Step 3: Commit and Push**

```bash
git add README.md
git commit -m "docs: document Spotify and YouTube 1:1 clone features"
git push origin main
```
