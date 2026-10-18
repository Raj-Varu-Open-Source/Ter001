const express = require('express');
const { getDiskUsage } = require('../services/storageService');

const router = express.Router();

// GET /api/system/storage - report disk space
router.get('/storage', async (req, res) => {
  try {
    const targetDir = (req.app && req.app.locals && req.app.locals.dirs && req.app.locals.dirs.baseDir) || undefined;
    const usage = await getDiskUsage(targetDir);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
