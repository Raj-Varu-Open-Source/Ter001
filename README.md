# 📱 PocketHub — Personal Knowledge & Media Hub for Android Termux

PocketHub is a lightweight, self-hosted personal knowledge and media hub designed to run natively on Android smartphones using **Termux**, **Node.js**, and **SQLite**.

It combines the best aspects of hierarchical notes (inspired by **Trilium**) and personal video/audio streaming and storage (inspired by **PeerTube**), without the heavy server infrastructure (no PostgreSQL, no Redis, no ActivityPub federation, and no FFmpeg compilation required).

---

## 🌟 Key Features

- **📱 Android Termux Native:** Runs smoothly in Node.js on mobile ARM processors with minimal CPU, RAM, and battery usage.
- **⚡ Zero External Daemons:** Uses modern built-in SQLite (`node:sqlite` in Node v22+ or `better-sqlite3`), requiring no external database servers.
- **🌐 Hotspot / Local Web Access:** Turn on your phone's Wi-Fi hotspot and access the full web app from any computer or secondary phone browser (`http://<phone-ip>:3000`)—no native client apps required.
- **🔓 Direct Access (No Password):** Instant access on your personal network with zero login barriers.
- **📝 Rich Notes:** Write, format, tag, and search notes with instant filtering, bold/italic, headings, and checklists.
- **🎬 Video Streaming & Library:**
  - Drag-and-drop video uploads (MP4, WebM, MKV, AVI, MOV).
  - True HTTP 206 Partial Content range requests for instant scrubbing and seeking.
  - Client-side `<canvas>` thumbnail generation (captures video thumbnails in the browser with 0% phone CPU load and no FFmpeg).
  - One-click download back to client or delete from phone.
- **🎵 Persistent Music Player:**
  - Audio library supporting MP3, M4A, FLAC, WAV, and OGG.
  - Sticky bottom audio bar with continuous playback, play/pause, scrub slider, volume, and next/prev track.
  - Music keeps playing seamlessly while you switch tabs to write notes or browse videos.
- **💾 Direct Android Storage & Rescan:**
  - Stores all media in your phone's shared storage (`~/storage/shared/PocketHub/`) so Android's native Gallery, VLC, and file managers can access them directly.
  - Built-in **"Rescan Library"** button indexes files placed directly on your phone via USB or downloads without battery-draining background file watchers.
  - Live storage gauge showing used vs. free disk space.

---

## 🚀 Getting Started on Android Termux

### 1. Install Prerequisites in Termux
Open Termux on your Android phone and install Node.js and SQLite:
```bash
pkg update
pkg install nodejs sqlite
```

### 2. Grant Storage Access
To allow PocketHub to store media directly in your phone's main shared storage (e.g., Photos/Movies/Music accessible by your phone's file manager):
```bash
termux-setup-storage
```
*(Accept the Android storage permission prompt when it appears).*

### 3. Clone or Copy PocketHub
Navigate to your project directory:
```bash
cd TermuxCombine
```

### 4. Install Dependencies
```bash
npm install --omit=dev
```

### 5. Launch PocketHub
Run the included startup script:
```bash
chmod +x termux-start.sh
./termux-start.sh
```
Or start directly with Node:
```bash
npm start
```

---

## 💻 How to Access from Your Computer or Other Devices

1. Turn on your phone's **Mobile Hotspot**.
2. Connect your laptop, tablet, or another phone to your phone's Wi-Fi hotspot.
3. Look at the startup output in Termux. It will print your phone's local network address, for example:
   ```
   👉 http://192.168.43.1:3000
   ```
4. Open your web browser on your computer and navigate to that URL!

---

## 📁 Storage Folder Structure

On your Android phone, PocketHub stores files in:
```
/sdcard/PocketHub/   (mapped via ~/storage/shared/PocketHub/)
├── videos/          # Uploaded and synced video files
├── music/           # Uploaded and synced music tracks
├── thumbnails/      # Video thumbnail images
└── temp/            # Safe staging directory for chunked uploads
```

---

## 🧪 Running Automated Tests

To run the complete test suite (25 tests covering database operations, notes CRUD, media streaming, range requests, storage calculation, and frontend static assets):
```bash
npm test
```
