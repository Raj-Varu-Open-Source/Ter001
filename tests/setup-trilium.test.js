const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Trilium Termux Setup Script exists and is valid', () => {
  const scriptPath = path.join(__dirname, '../setup-trilium.sh');
  assert.ok(fs.existsSync(scriptPath), 'setup-trilium.sh should exist');
  const content = fs.readFileSync(scriptPath, 'utf8');
  assert.ok(content.startsWith('#!/data/data/com.termux/files/usr/bin/bash') || content.startsWith('#!/bin/bash'), 'Script must have valid shebang');
  assert.ok(content.includes('proot-distro'), 'Script should utilize proot-distro for reliable ARM64 binary support');
  assert.ok(content.includes('8080'), 'Script should configure Trilium port 8080');
  assert.ok(content.includes('run-trilium.sh'), 'Script should generate run-trilium.sh launcher');
  assert.ok(content.includes('/root/trilium-data'), 'Script should use PRoot internal ext4 storage for SQLite data directory to prevent FUSE locking corruption');
  assert.ok(content.includes('TRILIUM_NETWORK_PORT'), 'Script should set TRILIUM_NETWORK_PORT environment variable');
});
