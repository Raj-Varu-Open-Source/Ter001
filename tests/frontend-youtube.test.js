const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('YouTube 1:1 UI Elements and Tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="yt-category-chips"'), 'Should have YouTube category chips');
  assert.ok(html.includes('id="yt-video-grid"'), 'Should have YouTube video cards grid');
  assert.ok(html.includes('id="yt-watch-view"'), 'Should have YouTube 2-column watch view');
  assert.ok(html.includes('id="yt-up-next-list"'), 'Should have YouTube Up Next sidebar queue');
  assert.ok(html.includes('id="video-upload-section"'), 'Should have separate YouTube upload studio section');

  const css = fs.readFileSync(path.join(__dirname, '../public/css/app.css'), 'utf8');
  assert.ok(css.includes('#ff0000'), 'CSS must include YouTube red #ff0000');
  assert.ok(css.includes('.yt-duration-badge'), 'CSS must include yt-duration-badge');
  assert.ok(css.includes('.yt-watch-container'), 'CSS must include yt-watch-container');
});
