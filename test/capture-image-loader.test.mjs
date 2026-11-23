import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCaptureImageLoader } from '../src/renderer/js/views/screens/capture-image-loader.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('manté la captura anterior fins que la nova es descodifica', async () => {
  const read = deferred();
  const previews = [];
  const events = [];
  const image = { _archiveId: 'local' };
  const element = { src: 'captura-anterior' };
  const loader = createCaptureImageLoader({
    resolveUrl: () => read.promise,
    isCurrent: candidate => candidate === image,
    createImage: () => {
      const preview = {};
      previews.push(preview);
      return preview;
    },
  });

  loader.load(element, image, {
    onLoading: () => events.push('carregant'),
    onDisplayed: () => events.push('mostrada'),
  });
  assert.equal(element.src, 'captura-anterior');
  assert.deepEqual(events, ['carregant']);
  read.resolve('captura-nova');
  await flush();
  assert.equal(element.src, 'captura-anterior');
  assert.equal(previews[0].src, 'captura-nova');
  previews[0].onload();
  assert.equal(element.src, 'captura-nova');
  assert.deepEqual(events, ['carregant', 'mostrada']);
});

test('ignora lectures i descodificacions antigues, fins i tot en tornar a la mateixa captura', async () => {
  const reads = [deferred(), deferred(), deferred()];
  const previews = [];
  const shown = [];
  const a = { _archiveId: 'local', name: 'a' };
  const b = { _archiveId: 'local', name: 'b' };
  let current = a;
  let index = 0;
  const element = { src: 'anterior' };
  const loader = createCaptureImageLoader({
    resolveUrl: () => reads[index++].promise,
    isCurrent: image => image === current,
    createImage: () => {
      const preview = {};
      previews.push(preview);
      return preview;
    },
  });
  const load = image => loader.load(element, image, { onDisplayed: () => shown.push(image.name) });
  load(a);
  await flush();
  reads[0].resolve('a-antic');
  await flush();
  current = b;
  load(b);
  await flush();
  current = a;
  load(a);
  await flush();
  previews[0].onload();
  reads[1].resolve('b');
  reads[2].resolve('a-nou');
  await flush();
  assert.equal(previews.length, 2);
  assert.equal(element.src, 'anterior');
  previews[1].onload();
  assert.equal(element.src, 'a-nou');
  assert.deepEqual(shown, ['a']);
});

test('mostra errors actuals i ignora errors obsolets o peticions invalidades', async () => {
  const reads = [deferred(), deferred(), deferred()];
  let index = 0;
  const errors = [];
  const element = { src: 'anterior' };
  const image = { _archiveId: 'local' };
  const loader = createCaptureImageLoader({
    resolveUrl: () => reads[index++].promise,
    isCurrent: () => true,
    createImage: () => ({}),
  });
  const load = () => loader.load(element, image, { onError: error => errors.push(error.message) });
  load();
  await flush();
  load();
  await flush();
  reads[0].reject(new Error('obsolet'));
  reads[1].reject(new Error('error actual'));
  await flush();
  assert.deepEqual(errors, ['error actual']);
  assert.equal(element.src, 'anterior');
  load();
  await flush();
  loader.invalidate(element);
  reads[2].reject(new Error('invalidat'));
  await flush();
  assert.deepEqual(errors, ['error actual']);
});

test('manté la captura anterior i informa si la imatge nova no es pot descodificar', async () => {
  const element = { src: 'anterior' };
  const preview = {};
  const errors = [];
  const loader = createCaptureImageLoader({
    resolveUrl: () => 'imatge-invàlida',
    isCurrent: () => true,
    createImage: () => preview,
  });
  loader.load(element, { _archiveId: 'local' }, {
    onError: error => errors.push(error.message),
  });
  await flush();
  preview.onerror();
  assert.equal(element.src, 'anterior');
  assert.deepEqual(errors, ["No s'ha pogut descodificar la captura"]);
});

test('el carregador conserva l’actualització immediata de captures del servidor', () => {
  const element = { src: 'anterior' };
  let displayed = false;
  const loader = createCaptureImageLoader({
    resolveUrl: image => `https://server${image.url}`,
    isCurrent: () => true,
  });
  loader.load(element, { url: '/capture.jpg' }, { onDisplayed: () => { displayed = true; } });
  assert.equal(element.src, 'https://server/capture.jpg');
  assert.equal(displayed, true);
});
