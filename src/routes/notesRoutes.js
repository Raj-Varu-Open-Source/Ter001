const express = require('express');
const notesService = require('../services/notesService');

const router = express.Router();

// GET /api/notes - list notes with optional search & tag
router.get('/', (req, res) => {
  try {
    const { search, tag } = req.query;
    const notes = notesService.listNotes({ search, tag });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notes/:id - get single note
router.get('/:id', (req, res) => {
  try {
    const note = notesService.getNoteById(parseInt(req.params.id, 10));
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes - create note
router.post('/', (req, res) => {
  try {
    const { title, content, tags } = req.body || {};
    const note = notesService.createNote({ title, content, tags });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notes/:id - update note
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, content, tags } = req.body || {};
    const note = notesService.updateNote(id, { title, content, tags });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notes/:id - delete note
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = notesService.deleteNote(id);
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
