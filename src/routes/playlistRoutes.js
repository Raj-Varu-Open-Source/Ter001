const express = require('express');
const playlistService = require('../services/playlistService');

const router = express.Router();

// List all playlists
router.get('/', (req, res) => {
  try {
    const list = playlistService.listPlaylists();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new playlist
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    const playlist = playlistService.createPlaylist(name);
    res.status(201).json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get playlist by ID with tracks
router.get('/:id', (req, res) => {
  try {
    const playlist = playlistService.getPlaylist(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add track to playlist
router.post('/:id/tracks', (req, res) => {
  try {
    const { media_id } = req.body;
    if (!media_id) {
      return res.status(400).json({ error: 'media_id is required' });
    }
    const result = playlistService.addTrackToPlaylist(req.params.id, media_id);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove track from playlist
router.delete('/:id/tracks/:mediaId', (req, res) => {
  try {
    const result = playlistService.removeTrackFromPlaylist(req.params.id, req.params.mediaId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete playlist
router.delete('/:id', (req, res) => {
  try {
    const result = playlistService.deletePlaylist(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
