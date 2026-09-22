const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const { recognizeImage } = require('../src/services/ocr.service');
const { imageFromRequest, recognizePlate } = require('../src/controllers/ocr.controller');

const recognized = { plate: 'ABC123', status: 'recognized', confidence: 'high', ocrConfidence: 97, candidates: [] };
afterEach(() => mock.restoreAll());

test('accepts mobile upload and web base64 without writing files', () => {
  const buffer = Buffer.from('test-image');
  assert.deepEqual(imageFromRequest({ file: { buffer } }), buffer);
  assert.deepEqual(imageFromRequest({ body: { imageBase64: `data:image/jpeg;base64,${buffer.toString('base64')}` } }), buffer);
  for (const imageBase64 of [null, {}, '%%%=', 'data:image/svg+xml;base64,AAAA']) {
    assert.throws(() => imageFromRequest({ body: { imageBase64 } }), { status: 400 });
  }
  assert.throws(() => imageFromRequest({ body: { imageBase64: 'A'.repeat(7 * 1024 * 1024) } }), { status: 413 });
});

test('forwards image bytes and preserves result contract', async () => {
  mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8001/recognize');
    assert.deepEqual(options.body, Buffer.from('image'));
    return new Response(JSON.stringify(recognized));
  });
  assert.deepEqual(await recognizeImage(Buffer.from('image')), recognized);
});

test('no plate is a successful result, not a vehicle lookup or server error', async () => {
  const empty = { ...recognized, plate: null, status: 'no_plate', confidence: 'low', ocrConfidence: 0 };
  mock.method(global, 'fetch', async () => new Response(JSON.stringify(empty)));
  let output;
  await recognizePlate({ file: { buffer: Buffer.from('image') } }, { json: value => { output = value; } });
  assert.deepEqual(output, empty);
});

test('rejects malformed or inconsistent results', async () => {
  for (const result of [{}, { ...recognized, plate: 'BAD' }, { ...recognized, status: 'review_required' }, { ...recognized, ocrConfidence: 101 }]) {
    mock.method(global, 'fetch', async () => new Response(JSON.stringify(result)));
    await assert.rejects(recognizeImage(Buffer.from('image')), { status: 503 });
    mock.restoreAll();
  }
});

test('maps unavailable and busy service to actionable errors', async () => {
  mock.method(global, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(recognizeImage(Buffer.from('image')), { status: 503 });
  mock.restoreAll();
  mock.method(global, 'fetch', async () => new Response('{}', { status: 429 }));
  await assert.rejects(recognizeImage(Buffer.from('image')), { status: 429 });
});

test('aborts slow inference instead of hanging', async () => {
  const previous = process.env.OCR_TIMEOUT_MS;
  process.env.OCR_TIMEOUT_MS = '5';
  mock.method(global, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  try {
    await assert.rejects(recognizeImage(Buffer.from('image')), { status: 504 });
  } finally {
    if (previous === undefined) delete process.env.OCR_TIMEOUT_MS;
    else process.env.OCR_TIMEOUT_MS = previous;
  }
});