const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('termux-start.sh dual process supervision', () => {
  const content = fs.readFileSync(path.join(__dirname, '../termux-start.sh'), 'utf8');
  assert.ok(content.includes('8080'), 'termux-start.sh should reference Trilium port 8080');
  assert.ok(content.includes('trap'), 'termux-start.sh should have a signal trap for clean shutdown');
  assert.ok(content.includes('POCKETHUB_PID') || content.includes('kill'), 'termux-start.sh should track and clean up child processes');
  assert.ok(content.includes('run-trilium.sh') || content.includes('setup-trilium.sh'), 'termux-start.sh should check for Trilium launcher');
  assert.ok(content.includes('kill -0'), 'termux-start.sh should verify process liveness with kill -0 before advertising URL');
});
