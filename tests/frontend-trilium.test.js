const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Frontend Trilium Integration Elements', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="nav-trilium"'), 'Index HTML should include #nav-trilium navigation button');
  assert.ok(html.includes('id="view-trilium"'), 'Index HTML should include #view-trilium section');
  assert.ok(html.includes('id="trilium-frame"'), 'Index HTML should include #trilium-frame iframe');
  assert.ok(html.includes('id="trilium-new-tab-link"'), 'Index HTML should include #trilium-new-tab-link');

  const js = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
  assert.ok(js.includes('8080'), 'App JS should configure port 8080 for Trilium navigation');
  assert.ok(js.includes('window.location.hostname'), 'App JS should use window.location.hostname for dynamic IP resolution');
});
