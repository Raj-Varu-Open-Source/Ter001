const express = require('express');
const path = require('path');
const fs = require('fs');
const notesRoutes = require('./routes/notesRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const systemRoutes = require('./routes/systemRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

function createApp(options = {}) {
  const app = express();

  const storageService = require('./services/storageService');
  const { config } = require('./config');
  const targetStorageDir = options.storageDir || config.storageDir;
  app.locals.dirs = storageService.ensureDirectories(targetStorageDir);

  // Middleware
  app.use(express.json());

  app.use(express.urlencoded({ extended: true }));

  // Static assets
  const publicDir = path.resolve(__dirname, '..', 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // API Routes
  app.use('/api/notes', notesRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/playlists', playlistRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // SPA fallback for HTML requests
  app.get('*', (req, res, next) => {
    if (req.accepts('html')) {
      const indexHtml = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
    }
    next();
  });

  // 404 handler for API routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

module.exports = { createApp };
