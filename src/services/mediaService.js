const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');
const storageService = require('./storageService');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.webm', '.mkv', '.avi', '.mov', '.ogv']);
const MUSIC_EXTENSIONS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.opus', '.weba']);

const MIME_MAP = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.weba': 'audio/webm'
};

function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'unnamed_file';
  // Strip path traversal and directories, return single file basename
  const base = path.basename(filename).replace(/[\/\\]/g, '');
  const clean = base.replace(/\.{2,}/g, '_').trim();
  return clean.length > 0 ? clean : 'unnamed_file';
}

function sanitizeRelativePath(filePath) {
  if (typeof filePath !== 'string') return 'unnamed_file';
  const normalized = filePath.replace(/\\/g, '/');
  const safeParts = normalized
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .map(part => part.replace(/\.{2,}/g, '_').trim());
  return safeParts.join('/') || 'unnamed_file';
}

function detectMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (MUSIC_EXTENSIONS.has(ext)) return 'music';
  return 'other';
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function saveMediaRecord({ filename, originalName, mediaType, mimeType, fileSize, duration = 0, thumbnailPath = '' }) {
  const db = getDb();
  const safeFilename = sanitizeRelativePath(filename);
  const safeOriginal = sanitizeFilename(originalName || path.basename(filename));

  const result = db.run(
    `INSERT INTO media (filename, original_name, media_type, mime_type, file_size, duration, thumbnail_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [safeFilename, safeOriginal, mediaType, mimeType, fileSize, duration, thumbnailPath]
  );

  return getMediaById(result.lastInsertRowid);
}


function getMediaById(id) {
  const db = getDb();
  const media = db.get('SELECT * FROM media WHERE id = ?', [id]);
  return media || null;
}

function getMediaByFilename(filename) {
  const db = getDb();
  const media = db.get('SELECT * FROM media WHERE filename = ?', [filename]);
  return media || null;
}

function listMedia({ type, search } = {}) {
  const db = getDb();
  let query = 'SELECT * FROM media';
  const conditions = [];
  const params = [];

  if (type && type !== 'all') {
    conditions.push('media_type = ?');
    params.push(type);
  }

  if (search && search.trim().length > 0) {
    conditions.push('(original_name LIKE ? OR filename LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC, id DESC';
  return db.all(query, params);
}

function deleteMedia(id, customDirs) {
  const media = getMediaById(id);
  if (!media) return false;

  const dirs = customDirs || storageService.ensureDirectories();
  const targetDir = media.media_type === 'video' ? dirs.videosDir : dirs.musicDir;
  const filePath = path.join(targetDir, media.filename);

  // Delete physical file
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) { /* best effort */ }
  }

  // Delete thumbnail if present
  if (media.thumbnail_path) {
    const thumbPath = path.isAbsolute(media.thumbnail_path)
      ? media.thumbnail_path
      : path.join(dirs.thumbnailsDir, media.thumbnail_path);
    if (fs.existsSync(thumbPath)) {
      try { fs.unlinkSync(thumbPath); } catch (e) { /* best effort */ }
    }
  }

  const db = getDb();
  const result = db.run('DELETE FROM media WHERE id = ?', [id]);
  return result.changes > 0;
}

function findFilesRecursive(baseDir, currentRelative = '') {
  const currentPath = path.join(baseDir, currentRelative);
  if (!fs.existsSync(currentPath)) return [];

  let results = [];
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryRelative = currentRelative ? path.join(currentRelative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      results = results.concat(findFilesRecursive(baseDir, entryRelative));
    } else if (entry.isFile()) {
      results.push(entryRelative);
    }
  }

  return results;
}

async function rescanStorage(customDirs) {
  const dirs = customDirs || storageService.ensureDirectories();
  // Ensure directories exist
  for (const d of [dirs.videosDir, dirs.musicDir, dirs.thumbnailsDir]) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  let added = 0;
  let removed = 0;

  // Scan video files (including subdirectories)
  const videoFiles = findFilesRecursive(dirs.videosDir);
  for (const file of videoFiles) {
    const fullPath = path.join(dirs.videosDir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (detectMediaType(file) === 'video') {
        const existing = getMediaByFilename(file);
        if (!existing) {
          saveMediaRecord({
            filename: file,
            originalName: path.basename(file),
            mediaType: 'video',
            mimeType: getMimeType(file),
            fileSize: stat.size
          });
          added++;
        }
      }
    } catch (e) { /* skip unreadable */ }
  }

  // Scan music files (including subdirectories)
  const musicFiles = findFilesRecursive(dirs.musicDir);
  for (const file of musicFiles) {
    const fullPath = path.join(dirs.musicDir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (detectMediaType(file) === 'music') {
        const existing = getMediaByFilename(file);
        if (!existing) {
          saveMediaRecord({
            filename: file,
            originalName: path.basename(file),
            mediaType: 'music',
            mimeType: getMimeType(file),
            fileSize: stat.size
          });
          added++;
        }
      }
    } catch (e) { /* skip unreadable */ }
  }

  // Check for deleted files
  const allMedia = listMedia();
  for (const item of allMedia) {
    const dir = item.media_type === 'video' ? dirs.videosDir : dirs.musicDir;
    const itemPath = path.join(dir, item.filename);
    if (!fs.existsSync(itemPath)) {
      const db = getDb();
      db.run('DELETE FROM media WHERE id = ?', [item.id]);
      removed++;
    }
  }

  const remaining = listMedia().length;
  return { added, removed, total: remaining };
}

function streamMedia(filePath, req, res) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const mimeType = getMimeType(filePath);
  const rangeHeader = req.headers && req.headers.range;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const partialStart = parts[0];
    const partialEnd = parts[1];

    let start = parseInt(partialStart, 10);
    let end = partialEnd ? parseInt(partialEnd, 10) : total - 1;

    if (isNaN(start)) {
      start = total - parseInt(partialEnd, 10);
      end = total - 1;
    }

    // Invalid range check (Review Focus #1)
    if (isNaN(start) || isNaN(end) || start >= total || end >= total || start > end || start < 0) {
      res.writeHead(416, {
        'Content-Range': `bytes */${total}`,
        'Accept-Ranges': 'bytes'
      });
      res.end();
      return;
    }

    const chunkSize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.destroy();
      }
    });
    res.on('close', () => {
      stream.destroy();
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.destroy();
      }
    });
    res.on('close', () => {
      stream.destroy();
    });
    stream.pipe(res);
  }
}


module.exports = {
  sanitizeFilename,
  detectMediaType,
  getMimeType,
  saveMediaRecord,
  getMediaById,
  getMediaByFilename,
  listMedia,
  deleteMedia,
  rescanStorage,
  streamMedia
};
