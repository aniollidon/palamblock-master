import { test } from 'node:test';
import assert from 'node:assert/strict';

test('la neteja funciona sense el visor i amb controls presents o incomplets', async () => {
  const savedWindow = globalThis.window;
  const savedDocument = globalThis.document;
  const elements = new Map();
  let backdropsRemoved = 0;
  let fullscreenExited = 0;
  const removedProperties = [];
  globalThis.window = new EventTarget();
  globalThis.document = {
    getElementById: id => elements.get(id) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [{ remove: () => { backdropsRemoved++; } }],
    body: {
      classList: { remove: () => {} },
      style: { removeProperty: property => removedProperties.push(property) },
    },
    fullscreenElement: null,
    exitFullscreen: () => {
      fullscreenExited++;
      return Promise.resolve();
    },
  };
  try {
    const { closeScreenshotsHistory } =
      await import('../src/renderer/js/views/screens/screenshots-history.js');

    assert.doesNotThrow(() => closeScreenshotsHistory());
    assert.equal(backdropsRemoved, 1);
    assert.deepEqual(removedProperties, ['overflow', 'padding-right']);

    const play = { innerHTML: '' };
    const fullscreenPlay = { innerHTML: '', title: '' };
    const overlay = { style: { display: 'block' } };
    elements.set('screenshotsHistPlayBtn', play);
    elements.set('screenshotsHistFsPlayBtn', fullscreenPlay);
    elements.set('screenshotsHistFullscreenOverlay', overlay);
    globalThis.document.fullscreenElement = {};
    assert.doesNotThrow(() => closeScreenshotsHistory());
    assert.match(play.innerHTML, /bi-play-fill/);
    assert.match(fullscreenPlay.innerHTML, /<svg/);
    assert.equal(fullscreenPlay.title, 'Reproduir');
    assert.equal(overlay.style.display, 'none');
    assert.equal(fullscreenExited, 1);

    elements.delete('screenshotsHistPlayBtn');
    elements.delete('screenshotsHistFullscreenOverlay');
    assert.doesNotThrow(() => closeScreenshotsHistory());
    elements.set('screenshotsHistPlayBtn', play);
    elements.delete('screenshotsHistFsPlayBtn');
    assert.doesNotThrow(() => closeScreenshotsHistory());
    assert.equal(backdropsRemoved, 4);
  } finally {
    globalThis.window = savedWindow;
    globalThis.document = savedDocument;
  }
});
