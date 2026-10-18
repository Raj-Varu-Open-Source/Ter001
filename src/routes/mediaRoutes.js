const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mediaService = require('../services/mediaService');
const storageService = require('../services/storageService');

const router = express.Router();
const dirs = storageService.ensureDirectories();

// Memory-safe upload configuration using Multer diskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dirs.tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = mediaService.sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});

const upload = multer({
  storage,
  limits: {
    // 5GB max upload limit per file
    fileSize: 5 * 1024 * 1024 * 1024
  }
});

// GET /api/media - list media items
router.get('/', (req, res) => {
  try {
    const { type, search } = req.query;
    const media = mediaService.listMedia({ type, search });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/media/:id - get media item details
router.get('/:id', (req, res) => {
  try {
    const media = mediaService.getMediaById(parseInt(req.params.id, 10));
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/upload - upload video or audio with optional thumbnail
router.post('/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.file || req.files.file.length === 0) {
      return res.status(400).json({ error: 'No media file uploaded' });
    }

    const uploadedFile = req.files.file[0];
    const mediaType = mediaService.detectMediaType(uploadedFile.originalname);

    if (mediaType === 'other') {
      // Remove temp file
      if (fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({ error: 'Unsupported media file type' });
    }

    const targetDir = mediaType === 'video' ? dirs.videosDir : dirs.musicDir;
    const finalFilename = Date.now() + '-' + mediaService.sanitizeFilename(uploadedFile.originalname);
    const finalPath = path.join(targetDir, finalFilename);

    // Move file from temp to target
    fs.renameSync(uploadedFile.path, finalPath);

    // Handle thumbnail if provided
    let thumbFilename = '';
    if (req.files.thumbnail && req.files.thumbnail.length > 0) {
      const thumbFile = req.files.thumbnail[0];
      thumbFilename = 'thumb-' + Date.now() + '.jpg';
      const thumbFinalPath = path.join(dirs.thumbnailsDir, thumbFilename);
      fs.renameSync(thumbFile.path, thumbFinalPath);
    }

    const record = mediaService.saveMediaRecord({
      filename: finalFilename,
      originalName: uploadedFile.originalname,
      mediaType,
      mimeType: uploadedFile.mimetype || mediaService.getMimeType(finalFilename),
      fileSize: uploadedFile.size,
      thumbnailPath: thumbFilename
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/media/:id/stream - stream video or audio with range support
router.get('/:id/stream', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const media = mediaService.getMediaById(id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const targetDir = media.media_type === 'video' ? dirs.videosDir : dirs.musicDir;
    const filePath = path.join(targetDir, media.filename);

    mediaService.streamMedia(filePath, req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/media/:id/download - direct attachment download
router.get('/:id/download', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const media = mediaService.getMediaById(id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const targetDir = media.media_type === 'video' ? dirs.videosDir : dirs.musicDir;
    const filePath = path.join(targetDir, media.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File on disk not found' });
    }

    res.download(filePath, media.original_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/media/:id/thumbnail - serve thumbnail
router.get('/:id/thumbnail', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const media = mediaService.getMediaById(id);
    if (!media || !media.thumbnail_path) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const thumbPath = path.isAbsolute(media.thumbnail_path)
      ? media.thumbnail_path
      : path.join(dirs.thumbnailsDir, media.thumbnail_path);

    if (!fs.existsSync(thumbPath)) {
      return res.status(404).json({ error: 'Thumbnail file not found' });
    }

    res.sendFile(thumbPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/:id - delete media
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = mediaService.deleteMedia(id, dirs);
    if (!success) {
      return res.status(404).json({ error: 'Media not found' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/rescan - trigger directory rescan
router.post('/rescan', async (req, res) => {
  try {
    const result = await mediaService.rescanStorage(dirs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
