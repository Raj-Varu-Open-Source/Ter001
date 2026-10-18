const { getDb } = require('../db');

function createPlaylist(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const finalName = trimmed || 'My Playlist';
  const db = getDb();
  const res = db.run('INSERT INTO playlists (name) VALUES (?)', [finalName]);
  return {
    id: res.lastInsertRowid,
    name: finalName,
    track_count: 0
  };
}

function listPlaylists() {
  const db = getDb();
  return db.all(`
    SELECT p.id, p.name, p.created_at, COUNT(pt.id) AS track_count
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
}

function getPlaylist(id) {
  const db = getDb();
  const playlist = db.get('SELECT * FROM playlists WHERE id = ?', [Number(id)]);
  if (!playlist) return null;

  const tracks = db.all(`
    SELECT m.id, m.filename, m.original_name, m.media_type, m.mime_type, m.file_size, m.duration, pt.position, pt.created_at as added_at
    FROM playlist_tracks pt
    JOIN media m ON pt.media_id = m.id
    WHERE pt.playlist_id = ?
    ORDER BY pt.position ASC, pt.created_at ASC
  `, [Number(id)]);

  return {
    ...playlist,
    tracks
  };
}

function addTrackToPlaylist(playlistId, mediaId) {
  const db = getDb();
  // Check if already in playlist
  const existing = db.get('SELECT id FROM playlist_tracks WHERE playlist_id = ? AND media_id = ?', [Number(playlistId), Number(mediaId)]);
  if (existing) {
    return existing;
  }
  const maxPos = db.get('SELECT MAX(position) as max_p FROM playlist_tracks WHERE playlist_id = ?', [Number(playlistId)]);
  const nextPos = (maxPos && maxPos.max_p !== null ? maxPos.max_p : 0) + 1;

  const res = db.run('INSERT INTO playlist_tracks (playlist_id, media_id, position) VALUES (?, ?, ?)',
    [Number(playlistId), Number(mediaId), nextPos]);
  return { id: res.lastInsertRowid };
}

function removeTrackFromPlaylist(playlistId, mediaId) {
  const db = getDb();
  const res = db.run('DELETE FROM playlist_tracks WHERE playlist_id = ? AND media_id = ?', [Number(playlistId), Number(mediaId)]);
  return { success: res.changes > 0 };
}

function deletePlaylist(id) {
  const db = getDb();
  db.run('DELETE FROM playlist_tracks WHERE playlist_id = ?', [Number(id)]);
  const res = db.run('DELETE FROM playlists WHERE id = ?', [Number(id)]);
  return { success: res.changes > 0 };
}

module.exports = {
  createPlaylist,
  listPlaylists,
  getPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist
};
