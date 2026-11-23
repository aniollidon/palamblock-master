const { ipcMain, dialog } = require('electron');
const axios = require('axios');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { openArchive, MAX_TOTAL } = require('./screenshot-archive');

function archiveFilename(groupId, startedAt) {
  if (typeof groupId !== 'string' || !groupId.trim() || typeof startedAt !== 'string') {
    throw new Error('Falten el grup o la data de la sessió');
  }
  const date = new Date(startedAt);
  if (!Number.isFinite(date.getTime())) throw new Error('La data de la sessió és invàlida');
  const normalized = groupId.replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').trim().replace(/[. ]+$/g, '');
  if (!normalized) throw new Error('El nom del grup no és vàlid per al fitxer');
  let name = '';
  for (const character of normalized) {
    if (Buffer.byteLength(name + character, 'utf8') > 120) break;
    name += character;
  }
  name = name.replace(/[. ]+$/g, '');
  if (!name) throw new Error('El nom del grup no és vàlid per al fitxer');
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `captures-${name}-${year}-${month}-${day}.pb.zip`;
}

function registerScreenshotArchiveIpc(getWindow) {
  const archives = new Map();
  let operation = null;
  const progress = (event, text, current, total) => {
    if (!event.sender.isDestroyed()) event.sender.send('screenshot-archive-progress', { text, current, total });
  };
  const validationProgress = event => {
    let lastUpdate = 0;
    return (done, total) => {
      if (done === total || Date.now() - lastUpdate >= 200) {
        progress(event, 'Validant les captures...', done, total);
        lastUpdate = Date.now();
      }
    };
  };
  const run = async action => {
    if (operation) throw new Error('Ja hi ha una operació de còpia en curs');
    const controller = new AbortController();
    operation = controller;
    try { return await action(controller.signal); }
    finally { if (operation === controller) operation = null; }
  };

  ipcMain.handle('screenshot-archive-cancel', () => operation?.abort());
  ipcMain.handle('screenshot-archive-close', (_event, id) => {
    const archive = archives.get(id);
    if (archive) {
      archive.close();
      archives.delete(id);
    }
  });
  ipcMain.handle('screenshot-archive-clear', () => {
    operation?.abort();
    for (const archive of archives.values()) archive.close();
    archives.clear();
  });
  ipcMain.handle('screenshot-archive-export', (event, options) => run(async signal => {
    const result = await dialog.showSaveDialog(getWindow(), {
      title: 'Desar còpia de captures',
      defaultPath: archiveFilename(options.groupId, options.startedAt),
      filters: [{ name: 'Còpia PalamBlock', extensions: ['zip'] }],
    });
    if (result.canceled || !result.filePath || signal.aborted) return null;
    const target = result.filePath.endsWith('.pb.zip') ? result.filePath : `${result.filePath}.pb.zip`;
    const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${crypto.randomUUID()}.partial`);
    try {
      if (target !== result.filePath) {
        try {
          await fsp.access(target);
          const confirmation = await dialog.showMessageBox(getWindow(), {
            type: 'warning',
            buttons: ['Cancel·lar', 'Substituir'],
            defaultId: 0,
            cancelId: 0,
            message: `El fitxer ${path.basename(target)} ja existeix. El vols substituir?`,
          });
          if (confirmation.response !== 1 || signal.aborted) return null;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      progress(event, 'Preparant la còpia al servidor...');
      const base = new URL(options.serverUrl);
      if (!['http:', 'https:'].includes(base.protocol)) throw new Error('URL del servidor invàlida');
      const prefix = base.pathname.replace(/\/+$/, '');
      const url = new URL(`${prefix}/api/v1/screenshots/groups/${encodeURIComponent(options.groupId)}/sessions/${encodeURIComponent(options.sessionId)}/export`, base);
      let response;
      try {
        response = await axios.get(url.href, {
          responseType: 'stream', signal, maxRedirects: 0,
          headers: { Authorization: `Bearer ${options.token}`, 'X-Palam-User': options.user },
        });
      } catch (error) {
        if (signal.aborted) throw new Error('Operació cancel·lada');
        if (error.response?.data) error.response.data.destroy();
        const status = error.response?.status;
        if (status === 409) throw new Error('La sessió ha canviat; actualitza la llista i torna-ho a provar');
        if (status === 401 || status === 403) throw new Error('No tens autorització per descarregar aquesta sessió');
        throw new Error(`No s'ha pogut iniciar la descàrrega: ${error.message}`);
      }
      let received = 0;
      let lastUpdate = 0;
      const length = Number(response.headers['content-length']) || undefined;
      const meter = new Transform({
        transform(chunk, encoding, callback) {
          received += chunk.length;
          if (received > MAX_TOTAL) return callback(new Error('La còpia supera 50 GiB'));
          if (Date.now() - lastUpdate >= 200) {
            progress(event, 'Descarregant la còpia...', received, length);
            lastUpdate = Date.now();
          }
          callback(null, chunk);
        },
      });
      try {
        await pipeline(response.data, meter, fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 }), { signal });
      } catch (error) {
        if (signal.aborted) throw new Error('Operació cancel·lada');
        throw new Error(`Descàrrega interrompuda; pot faltar o haver canviat una captura: ${error.message}`);
      }
      progress(event, 'Comprovant la còpia...');
      const archive = await openArchive(temporary, {
        signal,
        onProgress: validationProgress(event),
      });
      archive.close();
      if (signal.aborted) throw new Error('Operació cancel·lada');
      await fsp.rename(temporary, target);
      return target;
    } finally {
      await fsp.rm(temporary, { force: true });
    }
  }));
  ipcMain.handle('screenshot-archive-open', (event, selectedPath) => run(async signal => {
    let file = selectedPath;
    if (!file) {
      const result = await dialog.showOpenDialog(getWindow(), {
        title: 'Obrir còpia de captures',
        properties: ['openFile'],
        filters: [{ name: 'Còpia PalamBlock', extensions: ['zip'] }],
      });
      if (result.canceled || !result.filePaths.length) return null;
      [file] = result.filePaths;
    }
    if (typeof file !== 'string' || !file.toLowerCase().endsWith('.pb.zip')) {
      throw new Error('Selecciona un fitxer amb extensió .pb.zip');
    }
    progress(event, 'Validant la còpia...');
    const archive = await openArchive(file, {
      signal,
      onProgress: validationProgress(event),
    });
    if (signal.aborted) {
      archive.close();
      throw new Error('Operació cancel·lada');
    }
    const id = crypto.randomUUID();
    archives.set(id, archive);
    return { id, session: archive.session, name: path.basename(file) };
  }));
  ipcMain.handle('screenshot-archive-image', async (_event, id, name) => {
    const archive = archives.get(id);
    if (!archive) throw new Error('La còpia ja no està oberta');
    const image = await archive.image(name);
    return `data:image/${name.endsWith('.webp') ? 'webp' : 'jpeg'};base64,${image.toString('base64')}`;
  });
}

module.exports = { registerScreenshotArchiveIpc };
