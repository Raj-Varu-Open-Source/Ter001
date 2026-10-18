const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Spotify 1:1 UI Elements and Tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.ok(html.includes('id="spotify-library-shelf"'), 'Should have Spotify library shelf');
  assert.ok(html.includes('id="spotify-hero"'), 'Should have Spotify hero header');
  assert.ok(html.includes('id="spotify-track-table"'), 'Should have Spotify track data table');
  assert.ok(html.includes('id="music-upload-section"'), 'Should have separate music upload section');
  assert.ok(html.includes('id="player-shuffle-btn"'), 'Should have Spotify shuffle button');
  assert.ok(html.includes('id="player-repeat-btn"'), 'Should have Spotify repeat button');

  const css = fs.readFileSync(path.join(__dirname, '../public/css/app.css'), 'utf8');
  assert.ok(css.includes('#1db954'), 'CSS must include authentic Spotify green #1db954');
  assert.ok(css.includes('.spotify-track-row'), 'CSS must include spotify-track-row styling');
});
