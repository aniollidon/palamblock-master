const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');

function storedZip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [filename, value] of files) {
    const name = Buffer.from(filename);
    const data = Buffer.isBuffer(value) ? value : Buffer.from(value);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + data.length;
  }
  const index = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, index, end]);
}

test('descarrega, valida, obre i cancel·la una còpia mitjançant IPC', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'palam-ipc-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const content = Buffer.from('capture');
  const timestamp = new Date(1767258000000).toISOString();
  const session = {
    id: 'sessio', groupId: 'grup', startedAt: timestamp, endedAt: timestamp, usersConnected: 1,
    sessions: [{ alumne: 'anna', machineId: 'm1', sessionId: 's1' }],
    images: [{ alumne: 'anna', machineId: 'm1', sessionId: 's1',
      filename: '1767258000000.jpg', size: content.length, timestamp, archivePath: 'images/0.jpg' }],
  };
  const archive = storedZip([
    ['manifest.json', JSON.stringify({ format: 'palamblock-screenshots', version: 1, session })],
    ['images/0.jpg', content],
  ]);
  let slow = false;
  let receivedHeaders;
  let receivedPath;
  let slowStarted;
  const started = new Promise(resolve => { slowStarted = resolve; });
  const server = http.createServer((req, res) => {
    receivedHeaders = req.headers;
    receivedPath = req.url;
    if (slow) {
      res.writeHead(200, { 'Content-Type': 'application/zip' });
      res.write('partial');
      slowStarted();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/zip' });
      res.end(archive);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const handlers = new Map();
  let target = path.join(root, 'desada.pb.zip');
  let proposedName;
  const electron = {
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    dialog: {
      showSaveDialog: async (_window, options) => {
        proposedName = options.defaultPath;
        return { canceled: false, filePath: target };
      },
      showOpenDialog: async () => ({ canceled: false, filePaths: [target] }),
    },
  };
  const originalLoad = Module._load;
  Module._load = function(request, ...args) {
    if (request === 'electron') return electron;
    return originalLoad.call(this, request, ...args);
  };
  try {
    require('../src/screenshot-archive-ipc').registerScreenshotArchiveIpc(() => null);
  } finally {
    Module._load = originalLoad;
  }
  const messages = [];
  const event = { sender: { isDestroyed: () => false, send: (_name, message) => messages.push(message) } };
  const options = { serverUrl: `http://127.0.0.1:${server.address().port}/prefix`, groupId: 'grup',
    sessionId: 'sessio', startedAt: timestamp, user: 'usuari', token: 'token-de-prova' };
  assert.equal(await handlers.get('screenshot-archive-export')(event, options), target);
  const date = new Date(timestamp);
  const localDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  assert.equal(proposedName, `captures-grup-${localDate}.pb.zip`);
  assert.equal(receivedHeaders.authorization, 'Bearer token-de-prova');
  assert.equal(receivedHeaders['x-palam-user'], 'usuari');
  assert.equal(receivedPath, '/prefix/api/v1/screenshots/groups/grup/sessions/sessio/export');
  const opened = await handlers.get('screenshot-archive-open')(event);
  assert.equal(opened.session.groupId, 'grup');
  const image = await handlers.get('screenshot-archive-image')(event, opened.id, 'images/0.jpg');
  assert.equal(image, `data:image/jpeg;base64,${content.toString('base64')}`);
  assert.ok(messages.some(message => message.text.includes('Validant')));
  await handlers.get('screenshot-archive-clear')();
  await assert.rejects(handlers.get('screenshot-archive-image')(event, opened.id, 'images/0.jpg'), /no està oberta/);

  const safeTarget = path.join(root, 'segura.pb.zip');
  target = safeTarget;
  await handlers.get('screenshot-archive-export')(event, { ...options, groupId: '  1r/ESO: A  ' });
  assert.equal(proposedName, `captures-1r_ESO_ A-${localDate}.pb.zip`);
  target = path.join(root, 'llarga.pb.zip');
  await handlers.get('screenshot-archive-export')(event, { ...options, groupId: 'à'.repeat(100) });
  assert.equal(Buffer.byteLength(proposedName, 'utf8') <= 255, true);
  assert.equal(proposedName.endsWith(`-${localDate}.pb.zip`), true);
  await assert.rejects(handlers.get('screenshot-archive-export')(event, { ...options, startedAt: 'invàlida' }), /data.*invàlida/);

  slow = true;
  target = path.join(root, 'cancel·lada.pb.zip');
  const pending = handlers.get('screenshot-archive-export')(event, options);
  await started;
  await handlers.get('screenshot-archive-cancel')();
  await assert.rejects(pending);
  const remaining = await fs.readdir(root);
  assert.equal(remaining.includes('cancel·lada.pb.zip'), false);
  assert.equal(remaining.some(name => name.endsWith('.partial')), false);
});
