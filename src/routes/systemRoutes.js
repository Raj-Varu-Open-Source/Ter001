const express = require('express');
const { getDiskUsage } = require('../services/storageService');

const router = express.Router();

// GET /api/system/storage - report disk space
router.get('/storage', async (req, res) => {
  try {
    const usage = await getDiskUsage();
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
