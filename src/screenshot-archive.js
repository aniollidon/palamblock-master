const fs = require('node:fs/promises');
const yauzl = require('yauzl');

const MAX_IMAGES = 50_000;
const MAX_TOTAL = 50 * 1024 ** 3;
const MAX_IMAGE = 16 * 1024 ** 2;
const MAX_MANIFEST = 64 * 1024 ** 2;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function openZip(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true, autoClose: false, validateEntrySizes: true }, (error, zip) => {
      if (error) reject(error);
      else resolve(zip);
    });
  });
}

function readEntry(zip, entry, signal, collect) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Operació cancel·lada'));
    zip.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      let size = 0;
      let crc = 0xffffffff;
      const chunks = [];
      const abort = () => stream.destroy(new Error('Operació cancel·lada'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      stream.on('data', chunk => {
        size += chunk.length;
        if (size > entry.uncompressedSize) return stream.destroy(new Error('Mida de l’entrada incorrecta'));
        for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
        if (collect) chunks.push(chunk);
      });
      stream.once('error', error => {
        signal?.removeEventListener('abort', abort);
        reject(error);
      });
      stream.once('end', () => {
        signal?.removeEventListener('abort', abort);
        if (size !== entry.uncompressedSize || ((crc ^ 0xffffffff) >>> 0) !== entry.crc32) {
          return reject(new Error(`Entrada ZIP corrupta: ${entry.fileName}`));
        }
        resolve(collect ? Buffer.concat(chunks) : null);
      });
    });
  });
}

function validateManifest(manifest, entries) {
  const session = manifest?.session;
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4096;
  const optionalText = value => value == null || (typeof value === 'string' && value.length <= 4096);
  if (manifest?.format !== 'palamblock-screenshots' || manifest.version !== 1 ||
      !text(session?.groupId) || !text(session.id) ||
      !Number.isSafeInteger(session.usersConnected) || session.usersConnected < 0 ||
      !Array.isArray(session.sessions) || session.sessions.length > MAX_IMAGES ||
      !Array.isArray(session.images) || !session.images.length || session.images.length > MAX_IMAGES ||
      !Number.isFinite(Date.parse(session.startedAt)) || !Number.isFinite(Date.parse(session.endedAt)) ||
      Date.parse(session.endedAt) < Date.parse(session.startedAt)) {
    throw new Error('El manifest de la sessió és invàlid o incompatible');
  }
  for (const individual of session.sessions) {
    if (!individual || !text(individual.alumne) || !text(individual.machineId) ||
        !text(individual.sessionId) || !optionalText(individual.user) ||
        !optionalText(individual.displayName) || !optionalText(individual.userLabel)) {
      throw new Error('El manifest conté trams individuals invàlids');
    }
  }
  const used = new Set();
  let previousTime = -Infinity;
  for (const image of session.images) {
    const time = Date.parse(image?.timestamp);
    if (!image || !text(image.alumne) || !text(image.machineId) ||
        !text(image.sessionId) || !optionalText(image.userLabel) ||
        !Number.isFinite(time) || time < previousTime ||
        time < Date.parse(session.startedAt) || time > Date.parse(session.endedAt) ||
        !/^images\/\d+\.(?:jpg|webp)$/.test(image.archivePath) ||
        used.has(image.archivePath) || !entries.has(image.archivePath) ||
        image.size !== entries.get(image.archivePath).uncompressedSize) {
      throw new Error('El manifest conté captures invàlides o absents');
    }
    previousTime = time;
    used.add(image.archivePath);
  }
  if (entries.size !== used.size + 1) throw new Error('El ZIP conté entrades inesperades');
  return session;
}

async function openArchive(file, { signal, onProgress = () => {} } = {}) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > MAX_TOTAL) throw new Error('El ZIP no és vàlid o supera 50 GiB');
  const zip = await openZip(file);
  try {
    const entries = new Map();
    let total = 0;
    await new Promise((resolve, reject) => {
      const abort = () => reject(new Error('Operació cancel·lada'));
      signal?.addEventListener('abort', abort, { once: true });
      zip.on('error', reject);
      zip.on('entry', entry => {
        const validName = entry.fileName === 'manifest.json' || /^images\/\d+\.(?:jpg|webp)$/.test(entry.fileName);
        const limit = entry.fileName === 'manifest.json' ? MAX_MANIFEST : MAX_IMAGE;
        if (!validName || entries.has(entry.fileName) || entries.size >= MAX_IMAGES + 1 ||
            entry.uncompressedSize <= 0 || entry.uncompressedSize > limit ||
            (total += entry.uncompressedSize) > MAX_TOTAL || (entry.generalPurposeBitFlag & 1)) {
          return reject(new Error('El ZIP conté entrades invàlides o supera els límits'));
        }
        entries.set(entry.fileName, entry);
        zip.readEntry();
      });
      zip.once('end', () => {
        signal?.removeEventListener('abort', abort);
        resolve();
      });
      if (signal?.aborted) abort();
      else zip.readEntry();
    });
    const manifestEntry = entries.get('manifest.json');
    if (!manifestEntry) throw new Error('Falta el manifest de la sessió');
    const manifest = JSON.parse((await readEntry(zip, manifestEntry, signal, true)).toString('utf8'));
    const session = validateManifest(manifest, entries);
    let checked = 0;
    for (const image of session.images) {
      await readEntry(zip, entries.get(image.archivePath), signal, false);
      onProgress(++checked, session.images.length);
    }
    if (signal?.aborted) throw new Error('Operació cancel·lada');
    return {
      session,
      async image(name) {
        const current = await fs.stat(file);
        if (current.size !== stat.size || current.mtimeMs !== stat.mtimeMs) {
          throw new Error('El fitxer de la còpia ha canviat; torna’l a obrir');
        }
        const entry = entries.get(name);
        if (!entry || !name.startsWith('images/')) throw new Error('Captura no trobada');
        return readEntry(zip, entry, null, true);
      },
      close() { zip.close(); },
    };
  } catch (error) {
    zip.close();
    throw error;
  }
}

module.exports = { openArchive, validateManifest, MAX_IMAGES, MAX_TOTAL, MAX_IMAGE };
