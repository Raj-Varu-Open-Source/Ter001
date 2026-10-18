# Trilium Dual-Service Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TriliumNext alongside PocketHub in Android Termux with a dual-service architecture, embedded iframe navigation, dynamic hostname port resolution, automated Termux installation, and unified multi-process lifecycle supervision.

**Architecture:** PocketHub operates on port 3000 for media streaming and storage, while Trilium operates on port 8080 for deep hierarchical note-taking. PocketHub's frontend provides an embedded viewport for Trilium that automatically calculates `http://${window.location.hostname}:8080`, with an "Open in New Tab ↗" button so music keeps playing continuously in the background. A Termux supervisor script (`termux-start.sh`) manages both processes and handles unified shutdown.

**Tech Stack:** Node.js, Express, HTML5/CSS3/Vanilla JS, Bash, PRoot-Distro (Debian ARM64 for Trilium server).

**Spec:** [`docs/superpowers/specs/2026-10-19-trilium-dual-service-integration-design.md`](file:///E:/My%20Custom%20softwares/TermuxCombine/docs/superpowers/specs/2026-10-19-trilium-dual-service-integration-design.md)

## Global Constraints

* Pure Node.js and SQLite for PocketHub with zero native C++ compilation required.
* Dynamic hostname resolution (`window.location.hostname:8080`) without hardcoded IP addresses.
* Continuous audio playback across view switches (switching to Trilium must never interrupt the `<audio>` element).
* Clean multi-process termination on `SIGINT` (`Ctrl + C`) without orphan background processes.
* Media and notes storage accessible in Android shared storage (`/sdcard/PocketHub/`).

## Review Focus

1. **Dynamic Host Resolution**: Connecting to PocketHub over a Wi-Fi hotspot (`192.168.43.1:3000`) must correctly resolve the Trilium iframe and external tab link to `192.168.43.1:8080` rather than defaulting to `localhost`.
2. **Audio Continuity**: Switching between Videos, Music, Quick Notes, and Trilium Notes must preserve audio playback state and keep audio playing.
3. **Graceful Termux Process Supervision**: Terminating `termux-start.sh` via `SIGINT` must kill both PocketHub and Trilium child processes without leaving port 8080 or port 3000 blocked.
4. **Offline / Not Installed State**: If the user opens the Trilium tab before running `setup-trilium.sh`, the dashboard must show a helpful fallback card with setup guidance instead of a broken white screen.
5. **Iframe Sandboxing & Permissions**: The iframe element must allow clipboard read/write and fullscreen so Trilium's rich editor functions normally.

---

### Task 1: Embedded Trilium View & Dynamic Host Navigation in PocketHub Frontend

**Files:**
* Modify: `public/index.html`
* Modify: `public/style.css`
* Modify: `public/app.js`
* Test: `tests/frontend-trilium.test.js`

**Interfaces:**
* Consumes: Express static asset pipeline (`public/`).
* Produces: `#nav-trilium` button, `#view-trilium` container, `#trilium-frame` iframe, and `#trilium-new-tab-btn` anchor.

- [ ] **Step 1: Write the failing test for frontend Trilium elements**

```javascript
// tests/frontend-trilium.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Frontend Trilium Integration Elements', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="nav-trilium"'), 'Index HTML should include #nav-trilium navigation button');
  assert.ok(html.includes('id="view-trilium"'), 'Index HTML should include #view-trilium section');
  assert.ok(html.includes('id="trilium-frame"'), 'Index HTML should include #trilium-frame iframe');
  assert.ok(html.includes('id="trilium-new-tab-link"'), 'Index HTML should include #trilium-new-tab-link');

  const js = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.ok(js.includes('8080'), 'App JS should configure port 8080 for Trilium navigation');
  assert.ok(js.includes('window.location.hostname'), 'App JS should use window.location.hostname for dynamic IP resolution');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend-trilium.test.js`  
Expected: FAIL with missing `#nav-trilium`

- [ ] **Step 3: Update `public/index.html` with Trilium Navigation and Viewport**

Add the sidebar nav item `#nav-trilium` and view container `#view-trilium` with header controls ("Open in New Tab ↗", "Reload 🔄", "Port 8080" badge) and responsive iframe with clipboard and fullscreen attributes.

- [ ] **Step 4: Update `public/style.css` for Trilium Embedded View**

Add styles for `#view-trilium`, `.trilium-header-bar`, `.trilium-iframe-container`, and responsive full-height layout.

- [ ] **Step 5: Update `public/app.js` with Dynamic Host Logic**

Implement `updateTriliumUrl()` to dynamically compute `http://${window.location.hostname}:8080` and set both `triliumFrame.src` and `triliumNewTabLink.href`. Ensure tab switching does not reload the iframe if already loaded, preserving editor state.

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/frontend-trilium.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/style.css public/app.js tests/frontend-trilium.test.js
git commit -m "feat: add embedded Trilium view with dynamic hostname resolution and new tab link"
```

---

### Task 2: Termux Trilium Setup Script (`setup-trilium.sh`)

**Files:**
* Create: `setup-trilium.sh`
* Test: `tests/setup-trilium.test.js`

**Interfaces:**
* Consumes: Android Termux environment, `proot-distro`.
* Produces: `/sdcard/PocketHub/trilium-data/` storage directory, `$HOME/PocketHub/run-trilium.sh` launcher script.

- [ ] **Step 1: Write the failing test for `setup-trilium.sh`**

```javascript
// tests/setup-trilium.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Trilium Termux Setup Script exists and is valid', () => {
  const scriptPath = path.join(__dirname, '../setup-trilium.sh');
  assert.ok(fs.existsSync(scriptPath), 'setup-trilium.sh should exist');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.ok(content.startsWith('#!/data/data/com.termux/files/usr/bin/bash') || content.startsWith('#!/bin/bash'));
  assert.ok(content.includes('proot-distro'), 'Script should utilize proot-distro for reliable ARM64 binary support');
  assert.ok(content.includes('8080'), 'Script should configure Trilium port 8080');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/setup-trilium.test.js`  
Expected: FAIL (`setup-trilium.sh` does not exist)

- [ ] **Step 3: Implement `setup-trilium.sh`**

Write `setup-trilium.sh` to:
1. Verify Termux environment.
2. Check for `proot-distro`, installing it via `pkg install -y proot-distro` if missing.
3. Install Debian inside `proot-distro` (`proot-distro install debian`).
4. Set up Node.js and download/extract the official precompiled `TriliumNotes-Server` ARM64 release inside the container.
5. Create shared data directory `/sdcard/PocketHub/trilium-data/` so user notes persist in phone storage.
6. Generate a simple `run-trilium.sh` command.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/setup-trilium.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add setup-trilium.sh tests/setup-trilium.test.js
git commit -m "feat: add setup-trilium.sh for automated ARM64 Termux installation"
```

---

### Task 3: Dual-Process Supervision in `termux-start.sh`

**Files:**
* Modify: `termux-start.sh`
* Test: `tests/termux-start.test.js`

**Interfaces:**
* Consumes: `src/server.js` (port 3000), `run-trilium.sh` / `proot-distro` (port 8080).
* Produces: Coordinated background processes with unified PID tracking, signal trap handling (`SIGINT`, `SIGTERM`), and clear console banners.

- [ ] **Step 1: Write the failing test for `termux-start.sh` dual supervision**

```javascript
// tests/termux-start.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('termux-start.sh dual process supervision', () => {
  const content = fs.readFileSync(path.join(__dirname, '../termux-start.sh'), 'utf8');
  assert.ok(content.includes('8080'), 'termux-start.sh should reference Trilium port 8080');
  assert.ok(content.includes('trap'), 'termux-start.sh should have a signal trap for clean shutdown');
  assert.ok(content.includes('POCKETHUB_PID') || content.includes('kill'), 'termux-start.sh should track and clean up child processes');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/termux-start.test.js`  
Expected: FAIL (missing 8080 and PID tracking in `termux-start.sh`)

- [ ] **Step 3: Update `termux-start.sh` with dual supervisor logic**

1. Add check for Trilium installation: if present, start Trilium in background (`TRILIUM_PID=$!`), if not, print a clean notice on how to run `./setup-trilium.sh`.
2. Start PocketHub in background (`POCKETHUB_PID=$!`).
3. Trap `SIGINT`, `SIGTERM`, `EXIT` to send termination signals to both child PIDs (`kill $POCKETHUB_PID $TRILIUM_PID 2>/dev/null || true`).
4. Print formatted access banner displaying both URLs:
   ```
   📱 PocketHub (Media & Storage): http://<ip>:3000
   📚 Trilium (Knowledge Base):    http://<ip>:8080
   ```
5. Wait on child processes with `wait`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/termux-start.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add termux-start.sh tests/termux-start.test.js
git commit -m "feat: upgrade termux-start.sh to supervise PocketHub and Trilium with unified shutdown"
```

---

### Task 4: Complete Test Suite & Documentation Verification

**Files:**
* Modify: `README.md`
* Verify: All tests in `tests/*.test.js`

- [ ] **Step 1: Update `README.md` with Trilium setup & usage guide**

Document:
1. Dual-service architecture overview.
2. How to run `./setup-trilium.sh` to enable full Trilium notes.
3. How to access Trilium directly (`:8080`) or embedded inside PocketHub (`:3000`).
4. Storage locations (`/sdcard/PocketHub/trilium-data/` for notes, `/sdcard/PocketHub/videos/` for videos).

- [ ] **Step 2: Run complete test suite**

Run: `node --test tests/*.test.js`  
Expected: All 28+ tests passing.

- [ ] **Step 3: Commit and Push**

```bash
git add README.md
git commit -m "docs: document Trilium dual-service setup and mobile usage"
git push origin main
```
