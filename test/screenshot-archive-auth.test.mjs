import { test } from 'node:test';
import assert from 'node:assert/strict';

test('una desconnexió permet acabar de consultar la còpia abans de mostrar el login', async () => {
  const savedWindow = globalThis.window;
  const savedDocument = globalThis.document;
  const events = new EventTarget();
  let clearCount = 0;
  events.electronAPI = { clearScreenshotArchives: async () => { clearCount++; } };
  globalThis.window = events;
  globalThis.document = { getElementById: () => ({}) };
  try {
    const { AuthManager } = await import('../src/renderer/js/core/auth-manager.js');
    const { setArchiveViewing, rememberArchive, localSessions } =
      await import('../src/renderer/js/views/screens/screenshot-archive.mjs');
    let shown = 0;
    const auth = new AuthManager({ electronAPI: {} });
    auth._modalInstance = { show: () => { shown++; } };
    rememberArchive({ id: 'one', name: 'one.pb.zip',
      session: { groupId: 'A', sessions: [], images: [] } }, 'usuari');
    setArchiveViewing(true);
    auth.showLogin();
    assert.equal(shown, 0);
    setArchiveViewing(false);
    assert.equal(shown, 1);
    events.dispatchEvent(new CustomEvent('auth:ready', {
      detail: { credentials: { username: 'altre' } },
    }));
    assert.equal(localSessions('A').length, 0);
    assert.equal(clearCount, 1);
  } finally {
    globalThis.window = savedWindow;
    globalThis.document = savedDocument;
  }
});
