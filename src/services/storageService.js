const fs = require('fs');
const path = require('path');
const { config } = require('../config');

function ensureDirectories(baseDir = config.storageDir) {
  const resolvedBase = path.resolve(baseDir);
  const dirs = {
    baseDir: resolvedBase,
    videosDir: path.join(resolvedBase, 'videos'),
    musicDir: path.join(resolvedBase, 'music'),
    thumbnailsDir: path.join(resolvedBase, 'thumbnails'),
    tempDir: path.join(resolvedBase, 'temp')
  };

  for (const dirPath of Object.values(dirs)) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  return dirs;
}

async function getDiskUsage(targetPath = config.storageDir) {
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    ensureDirectories(resolvedPath);
  }

  try {
    if (typeof fs.promises.statfs === 'function') {
      const stats = await fs.promises.statfs(resolvedPath);
      const blockSize = stats.bsize || 4096;
      const totalBytes = Number(stats.blocks) * blockSize;
      const freeBytes = Number(stats.bavail) * blockSize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const percentUsed = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

      return {
        totalBytes,
        freeBytes,
        usedBytes,
        percentUsed,
        path: resolvedPath
      };
    }
  } catch (err) {
    // If statfs fails on specialized filesystems, fallback gracefully
  }

  // Fallback defaults if statfs is unavailable or errors
  return {
    totalBytes: 64 * 1024 * 1024 * 1024, // 64 GB placeholder
    freeBytes: 32 * 1024 * 1024 * 1024,
    usedBytes: 32 * 1024 * 1024 * 1024,
    percentUsed: 50,
    path: resolvedPath
  };
}

module.exports = {
  ensureDirectories,
  getDiskUsage
};
