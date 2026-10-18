# 🎨 Design Specification: 1:1 Spotify & YouTube UI Clones for PocketHub

*Date: October 19, 2026*  
*Author: Antigravity & Raj Varu*  
*Target Environment: Android Termux (Node.js + SQLite) / Cross-Platform Responsive Web (Mobile & Windows)*

---

## 1. Executive Summary

This specification defines the 1:1 pixel-faithful visual redesign of PocketHub into authentic clones of **Spotify** (for Music) and **YouTube** (for Videos), optimized for both mobile devices and Windows desktop screens.

---

## 2. 🎵 Spotify 1:1 Clone Specification (Music)

### 2.1 Theme & Design Tokens
* **Backgrounds**: Deep black `#121212` (main), `#181818` (cards & bottom bar), `#282828` (hover states & dividers), `#000000` (sidebar shelf).
* **Accents**: Authentic Spotify Green `#1db954`, hover `#1ed760`, active `#1aa34a`.
* **Typography & Shapes**:
  * Circular green floating play button with black triangle icon (`56px` with shadow).
  * Rounded pill tags (`border-radius: 500px`) for filters.
  * Subtle hover states with white text contrast and `#b3b3b3` secondary text.

### 2.2 Layout & Components
1. **Left Shelf (Your Library)**:
   * Header: "Your Library" with `+ Create Playlist` button.
   * Filter pills: `Playlists`, `Artists`, `Downloaded`.
   * List of playlists with custom playlist icons and track counts.
2. **Main View (Spotify Header & Playlist/Song Table)**:
   * **Hero Header**: Gradient backdrop fading to `#121212`, large square playlist/album art, "PLAYLIST" label, massive bold title, and summary line (e.g. `PocketHub • 24 songs, 1 hr 12 min`).
   * **Action Bar**:
     * Big circular green play button (`56px`).
     * Heart / Like toggle button.
     * 3-dot dropdown menu (`Add to queue`, `Delete`).
     * Search filter input with glass icon.
   * **Spotify Track Table**:
     * Headers: `#` | `Title` | `Artist` | `Date Added` | `⏱️ Duration`.
     * Rows: Track index replaces with Play icon on hover. Currently playing track highlights in Spotify Green (`#1db954`). Includes `+` button to add track to any custom playlist.
3. **Dedicated "Upload Music" Section**:
   * Styled like Spotify Local Files / Studio with drag-and-drop staging and batch upload progress.
4. **Persistent Spotify Bottom Now Playing Bar**:
   * **Height**: `88px` on desktop, `#181818` background, `#282828` top border.
   * **Left**: 56x56 album art with rounded corners, track title, artist name, and green heart icon.
   * **Center**:
     * Top controls: Shuffle toggle, Previous, Circular Play/Pause (`36px` white circle with black icon), Next, Repeat toggle.
     * Bottom scrubber: Current time, Spotify green scrub progress slider with hover thumb, total duration.
   * **Right**: Speaker volume icon (click to mute) and responsive volume slider.

---

## 3. 🎬 YouTube 1:1 Clone Specification (Videos)

### 3.1 Theme & Design Tokens
* **Backgrounds**: YouTube Dark `#0f0f0f` (main), `#272727` (card hover, chips), `#212121` (player container), `#3f3f3f` (borders).
* **Accents**: YouTube Red `#ff0000` (logo badge, scrubber progress), pure white `#f1f1f1` titles, muted `#aaaaaa` metadata.
* **Top Category Chips**: Horizontal scrollable pill row: `All`, `Recently uploaded`, `Long videos`, `+ Upload Video`.

### 3.2 Video Browse Grid
* 16:9 aspect ratio video thumbnails with `12px` rounded corners.
* Bottom-right duration badge (`rgba(0,0,0,0.8)` background, white monospace text, `4px` radius).
* Video card meta row:
  * 36x36 circular channel avatar.
  * Title in 2-line clamp (`#f1f1f1`, font-weight 600).
  * Channel name (`PocketHub Phone`) and upload date (`3 hours ago`).

### 3.3 YouTube 1:1 Watch Page (Theater Mode)
When clicking any video card, the UI transforms into the authentic YouTube watch page:
* **Desktop (2-Column Layout)**:
  * **Left Column (70%)**:
    * Large 16:9 video player with native controls and YouTube-red scrub styling.
    * Video title in large bold font (`20px`).
    * Channel action bar: Channel avatar, Channel Name, "Subscribe" button, `👍 Like` button, `⬇️ Download` button, `🗑️ Delete` button.
    * Description box: Grey rounded box (`#272727`) with view count, date, and description.
  * **Right Column (30%)**:
    * "Up Next" sidebar with compact horizontal video cards (thumbnail on left, title & views on right). Clicking any video switches instantly.
* **Smartphones (Stacked Layout)**:
  * Video player docks at the top.
  * Title and action bar directly beneath the player.
  * "Up Next" recommendations stack below.

---

## 4. SQLite Data Schema

```sql
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  UNIQUE(playlist_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
```

### REST Endpoints
* `GET /api/playlists`: Returns all playlists with track counts.
* `POST /api/playlists`: Creates a new playlist (`{ name }`).
* `GET /api/playlists/:id`: Returns playlist details and associated tracks.
* `POST /api/playlists/:id/tracks`: Adds track (`{ media_id }`) to playlist.
* `DELETE /api/playlists/:id/tracks/:mediaId`: Removes track from playlist.
* `DELETE /api/playlists/:id`: Deletes playlist.
