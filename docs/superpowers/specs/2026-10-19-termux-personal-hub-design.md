# Personal Knowledge & Media Hub (PocketHub) for Android Termux

## 1. Intent & The Why
The goal is to create a lightweight, self-hosted personal knowledge and media hub that runs directly on an Android smartphone via Termux in Node.js with SQLite. 

Many users want a combined solution offering rich note-taking (inspired by Trilium) and personal video/audio streaming and file storage (inspired by PeerTube's media playback and library management). However, existing solutions like PeerTube require heavy server infrastructures (PostgreSQL, Redis, ActivityPub federation, external transcoding) that are impractical or battery-draining on a smartphone. 

This project delivers a unified, zero-friction local server that runs smoothly on Android hardware. By turning on the phone's mobile hotspot, the user can connect from a laptop or secondary phone and access a responsive web interface to take notes, stream and manage downloaded videos, and listen to their music library with all files stored locally on the Android device.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Android Termux Native:** Runs smoothly in Termux using Node.js and SQLite with minimal CPU/RAM footprint.
- **Hotspot Web Access:** Accessible via standard web browsers over local Wi-Fi / Hotspot (`http://<phone-ip>:<port>`) on PC or mobile with no native client apps required.
- **Direct Local Access (No Password):** Opens straight into the dashboard with zero friction—no login screens, accounts, or password prompts needed.
- **Unified Media & Notes Interface (Option A):** Single-page web dashboard featuring a clean sidebar navigation with dedicated sections:
  1. **Notes:** Create, edit, tag, search, and manage notes with rich text formatting (headings, lists, checklists, bold/italic).
  2. **Videos:** Personal video library allowing upload, thumbnail preview, HTML5 streaming playback (seeking/scrubbing via HTTP 206 partial content), download back to client, and deletion.
  3. **Music:** Personal audio library with track listings, metadata (artist, album, title), and a persistent bottom audio player that continues playing across views.
  4. **System & Storage Indicator:** Real-time visibility into Android device storage space (used vs free).
- **Direct Android File Storage:** Media files are stored directly in Android storage (`~/storage/shared/PocketHub/` or configurable path) so they can also be accessed by native Android media players and file managers.
- **Zero Heavy Dependencies:** Pure Node.js + SQLite without external database daemons (no PostgreSQL, no Redis, no Docker, no external FFmpeg compilation required).

### Non-Goals
- **ActivityPub / Fediverse Federation:** No federated sharing, remote instances, or public Fediverse protocol support (PeerTube-style federation is explicitly excluded).
- **Heavy Server-Side Video Transcoding:** The server will not attempt live FFmpeg re-encoding of high-resolution video streams on the phone CPU; videos are served directly as uploaded (MP4, WebM, etc.) using native browser HTML5 video decoding.
- **Complex Developer Scripting / Code Execution:** No in-browser JS code execution engines or Trilium-style JS script nodes; notes focus on text, checklists, and organization.

### Anti-Goals
- **Battery Drain & Overheating:** Avoiding background daemons, continuous file watchers, or heavy CPU-bound tasks that cause thermal throttling on mobile devices.
- **Vendor / Cloud Lock-in:** No external cloud services or account requirements; entirely offline-capable over local Wi-Fi.
- **Complex Multi-Step Setup:** No complicated system package installations; installation should require only standard Termux packages (`pkg install nodejs sqlite`) and `npm start`.

---

## 3. Constraints
- **Runtime Environment:** Android Termux environment running ARM64 or ARMv7 Node.js.
- **Database:** SQLite (using native or prebuilt Node.js bindings compatible with Termux).
- **Filesystem Permissions:** Termux shared storage access via `termux-setup-storage` (to store files under `~/storage/shared/PocketHub`).
- **Network Interface:** Bound to `0.0.0.0` to permit connections from hotspot clients on the local subnet.
- **Browser Compatibility:** Works across modern desktop (Chrome, Firefox, Safari, Edge) and mobile browsers.

---

## 4. Architecture & Technical Decisions

### Access Control & Security (Decided by User)
- **Direct Access:** No authentication or password barrier. When connected to the hotspot/Wi-Fi network, navigating to the server URL immediately opens the workspace.

### Media Ingestion & Synchronization (Builder Call)
- **Primary Method:** Web drag-and-drop upload. Files are saved into `~/storage/shared/PocketHub/{videos,music}` and immediately catalogued in SQLite.
- **Direct Filesystem Ingestion:** A manual **"Rescan Library"** button is provided in Settings/Storage. If the user copies media files directly to the phone via USB, Syncthing, or downloads, clicking Rescan will scan the directory and index new files into SQLite. Continuous background file watchers (`inotify`) are avoided to conserve battery and avoid emulated storage bugs in Android.

### Video Thumbnail Generation (Builder Call)
- **Client-Side Snapshot on Upload:** When a video is selected in the browser for upload, the browser creates a hidden HTML5 `<video>` element, seeks to 1 second, and snapshots the frame to a `<canvas>` as a lightweight JPEG thumbnail. This is sent alongside the video in the upload request.
- **Zero Battery / Zero Dependency:** Generates crisp thumbnails without running FFmpeg on the phone CPU, preserving the pure Node.js + SQLite requirement.
- **Fallback for Direct Disk Files:** Uses HTML5 `<video preload="metadata">#t=1` preview or a clean video icon.

### Navigation & Layout
- **Sidebar:**
  - App Header: Name & Connection Status
  - Navigation links:
    - 📝 **Notes** (Default view)
    - 🎬 **Videos** (Video gallery)
    - 🎵 **Music** (Audio library)
  - Footer: Live phone storage gauge (e.g. "42 GB free")
- **Persistent Bottom Audio Bar:**
  - Controls: Play/Pause, Next/Prev, Progress bar with seek, Volume, Track title & Artist.
  - Keeps playing seamlessly while switching between Notes, Videos, and settings.
- **Main Content Area:**
  - Dynamically displays the selected section without page reloads.

### Section Details
1. **Notes Module:**
   - Note list with search filter and creation button.
   - Editor with rich text formatting (bold, italic, headers, bullet/numbered lists, checklists).
   - Tagging / categorization for organization.
   - SQLite table storing `id`, `title`, `content`, `tags`, `created_at`, `updated_at`.

2. **Videos Module:**
   - Upload drop-zone supporting drag-and-drop file uploads (with upload progress bar).
   - Video card grid displaying title, duration/size, thumbnail, and upload date.
   - Built-in video player modal or view with HTML5 controls (play, pause, seek, volume, speed, full-screen).
   - Actions per video: Watch, Download to client device, Delete from phone.
   - Backend streaming endpoint supporting HTTP Range requests (`206 Partial Content`) for instant scrubbing without downloading full files.

3. **Music Module:**
   - Audio file upload (MP3, M4A, FLAC, WAV).
   - Track list and album/artist group views.
   - Audio metadata reading (pure JS ID3 parser for title, artist, album, duration).
   - Actions: Play track, Queue next, Download, Delete.

4. **Storage & Server Management:**
   - Endpoint reporting disk space usage of the media storage directory.
   - Configurable storage path (defaulting to Android shared storage: `~/storage/shared/PocketHub`).

---

## 5. What is Left to the Builder
- **Server Framework:** Selection of Node.js web framework (e.g. Express) for routing, static file serving, and upload handling.
- **SQLite Driver:** Choosing between `sqlite3` and `better-sqlite3` (ensuring compatibility with Termux pre-built binaries or compilation environment).
- **Frontend Implementation:** Lightweight single-page architecture (modern vanilla JavaScript + Tailwind CSS or Alpine.js) packaged as static assets served by the Node.js backend.
- **Launch Script:** An easy startup script for Termux (`termux-start.sh`) that checks storage permissions, prints the phone's Wi-Fi hotspot IP address, and starts the Node server.
