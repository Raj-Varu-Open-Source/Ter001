# 📱 PocketHub — Personal Knowledge & Media Hub for Android Termux

PocketHub is a lightweight, self-hosted personal knowledge and media hub designed to run natively on Android smartphones using **Termux**, **Node.js**, and **SQLite**.

It combines the best aspects of hierarchical notes (inspired by **Trilium**) and personal video/audio streaming and storage (inspired by **PeerTube**), without the heavy server infrastructure (no PostgreSQL, no Redis, no ActivityPub federation, and no FFmpeg compilation required).

---

## 🌟 Key Features

- **📱 Android Termux Native:** Runs smoothly in Node.js on mobile ARM processors with minimal CPU, RAM, and battery usage.
- **⚡ Zero External Daemons:** Uses modern built-in SQLite (`node:sqlite` in Node v22+ or `better-sqlite3`), requiring no external database servers.
- **🌐 Hotspot / Local Web Access:** Turn on your phone's Wi-Fi hotspot and access the full web app from any computer or secondary phone browser (`http://<phone-ip>:3000`)—no native client apps required.
- 🔓 **Direct Access (No Password):** Instant access on your personal network with zero login barriers.
- 📚 **Full Trilium Notes Integration (Port 8080):**
  - Run the full, official **TriliumNext** server directly on your Android phone.
  - Deep hierarchical tree notes, code notes with syntax highlighting, drawing canvas, revision history, and attributes.
  - Embedded seamlessly inside PocketHub's web dashboard so your music keeps playing continuously in the background!
  - "Open in New Tab ↗" button to jump straight to `http://<phone-ip>:8080` anytime.
- 📝 **Quick Notes (Port 3000):** Built-in lightweight scratchpad for quick thoughts and todo lists without waiting for a full workspace.
- 🎬 **Video Streaming & Library:**
  - Drag-and-drop video uploads (MP4, WebM, MKV, AVI, MOV).
  - True HTTP 206 Partial Content range requests for instant scrubbing and seeking.
  - Client-side `<canvas>` thumbnail generation (captures video thumbnails in the browser with 0% phone CPU load and no FFmpeg).
  - One-click download back to client or delete from phone.
- 🎵 **Persistent Music Player:**
  - Audio library supporting MP3, M4A, FLAC, WAV, and OGG.
  - Sticky bottom audio bar with continuous playback, play/pause, scrub slider, volume, and next/prev track.
  - Music keeps playing seamlessly while you write notes in Trilium or browse videos.
- 💾 **Direct Android Storage & Rescan:**
  - Stores all media in your phone's shared storage (`~/storage/shared/PocketHub/`) so Android's native Gallery, VLC, and file managers can access them directly.
  - Built-in **"Rescan Library"** button indexes files placed directly on your phone via USB or downloads without battery-draining background file watchers.
  - Live storage gauge showing used vs. free disk space.

---

## 🚀 Getting Started on Android Termux

### 1. Install Prerequisites in Termux
Open Termux on your Android phone and install Node.js and Git:
```bash
pkg update -y
pkg install -y git nodejs
```

### 2. Grant Storage Access
To allow PocketHub to store media and notes directly in your phone's main shared storage:
```bash
termux-setup-storage
```
*(Accept the Android storage permission prompt when it appears).*

### 3. Clone PocketHub
```bash
git clone https://github.com/Raj-Varu-Open-Source/Ter001.git PocketHub
cd PocketHub
```

### 4. Install Dependencies
```bash
npm install --omit=dev
```

### 5. (Optional) Set Up Full Trilium Notes Server
To enable the full-featured Trilium hierarchical knowledge base on port `8080`:
```bash
chmod +x setup-trilium.sh
./setup-trilium.sh
```
*(This sets up an isolated PRoot Debian environment with native ARM64 SQLite support and persistent data in `/sdcard/PocketHub/trilium-data/`).*

### 6. Launch Services
Run the included dual-service startup script:
```bash
chmod +x termux-start.sh
./termux-start.sh
```
This automatically starts both PocketHub (`:3000`) and Trilium (`:8080`), displays connection URLs for your hotspot, and cleanly terminates both processes when you press `Ctrl + C`.

---

## 💻 How to Access from Your Computer or Other Devices

1. Turn on your phone's **Mobile Hotspot**.
2. Connect your laptop, tablet, or another phone to your phone's Wi-Fi hotspot.
3. Look at the startup output in Termux:
   ```
   📱 PocketHub (Media & Quick Notes): http://192.168.43.1:3000
   📚 Trilium Notes (Port 8080):       http://192.168.43.1:8080
   ```
4. Open your web browser on your computer:
   * Navigate to `http://192.168.43.1:3000` to access PocketHub. Click **"Trilium Notes"** in the sidebar to work in Trilium with background music playing!
   * Or navigate directly to `http://192.168.43.1:8080` for a dedicated Trilium window.

---

## 📁 Storage Folder Structure

On your Android phone, PocketHub stores files in:
```
/sdcard/PocketHub/   (mapped via ~/storage/shared/PocketHub/)
├── videos/          # Uploaded and synced video files
├── music/           # Uploaded and synced music tracks
├── trilium-data/    # Trilium database and notes backup (document.db)
├── thumbnails/      # Video thumbnail images
└── temp/            # Safe staging directory for chunked uploads
```

---

## 🧪 Running Automated Tests

To run the complete test suite (28 tests covering dual-service supervision, dynamic host resolution, database operations, notes CRUD, media streaming, range requests, and storage calculations):
```bash
node --test tests/*.test.js
```
