import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'flow-api-test-'));
process.env.FLOW_DATA_DIR = directory;
const { createApiMiddleware, buildVeoRequest } = await import('../server/api.js');
const originalFetch = globalThis.fetch;

test('validação do pedido Veo: Full HD, 8 segundos e referência oficial', () => {
  const payload = buildVeoRequest({ prompt: 'Uma cidade ao amanhecer', aspectRatio: '9:16', referenceImage: 'data:image/png;base64,YWJj' });
  assert.equal(payload.parameters.durationSeconds, 8);
  assert.equal(payload.parameters.resolution, '1080p');
  assert.equal(payload.instances[0].referenceImages[0].referenceType, 'asset');
  assert.equal(payload.instances[0].referenceImages[0].image.inlineData.mimeType, 'image/png');
  assert.throws(() => buildVeoRequest({ prompt: '', aspectRatio: '16:9' }), /prompt/);
  assert.throws(() => buildVeoRequest({ prompt: 'cidade', aspectRatio: '1:1' }), /Formato/);
  assert.throws(() => buildVeoRequest({ prompt: 'cidade', aspectRatio: '16:9', referenceImage: 'http://private/image' }), /referência/);
});
test('API: configuração sem segredo, geração, retomada, cache e reprodução com Range', async () => {
  const saved = { gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY, typesafe: process.env.TYPESAFE_API_KEY };
  const middleware = createApiMiddleware();
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, options) => { const response = await originalFetch(base + path, options); return { status: response.status, body: await response.json() }; };
  let providerCalls = 0, omniGenerationCalls = 0;
  globalThis.fetch = async (url, options) => {
    providerCalls++;
    if (String(url).endsWith('/interactions')) {
      omniGenerationCalls++;
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'gemini-omni-1.1-flash');
      assert.equal(payload.response_format.aspect_ratio, '9:16');
      return Response.json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'video', uri: 'files/omniOutput', mime_type: 'video/mp4' }] }] });
    }
    if (String(url).endsWith('/files/omniOutput')) return Response.json({ state: 'ACTIVE' });
    if (String(url).includes('/files/omniOutput:download')) return new Response(new Uint8Array([7, 8, 9]));
    if (String(url).endsWith(':predictLongRunning')) {
      assert.equal(JSON.parse(options.body).parameters.aspectRatio, '16:9');
      return Response.json({ name: 'models/veo-3.1-generate-preview/operations/test123' });
    }
    if (String(url).includes('/operations/')) return Response.json({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/test:download' } }] } } });
    if (String(url).includes('test:download')) return new Response(new Uint8Array([1, 2, 3, 4, 5, 6]));
    if (String(url).includes('typesafe.ai')) return Response.json({ model: 'test-model', answers: { character0: { choice: '@Piloto', confidence: 0.99 }, camera0: { choice: 'camera1', confidence: 0.9 } } });
    throw new Error('Chamada inesperada');
  };
  try {
    delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY;
    let result = await json('/api/veo/generate', { method: 'POST', body: JSON.stringify({ prompt: 'cidade', aspectRatio: '16:9' }) });
    assert.equal(result.status, 503);
    assert.equal(providerCalls, 0);
    process.env.GEMINI_API_KEY = 'test-only';
    result = await json('/api/config');
    assert.equal(result.body.veoConfigured, true); assert.ok(!JSON.stringify(result.body).includes('test-only'));
    assert.equal(result.body.omniConfigured, true);
    assert.equal(result.body.omniModel, 'gemini-omni-1.1-flash');
    const invalidOmni = await json('/api/omni/status?operation=invalid');
    assert.equal(invalidOmni.status, 400);
    result = await json('/api/veo/generate', { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}' });
    assert.equal(result.status, 403);
    result = await json('/api/veo/generate', { method: 'POST', body: JSON.stringify({ prompt: 'cidade', aspectRatio: '16:9' }) });
    assert.equal(result.status, 202);
    const statusUrl = '/api/veo/status?operation=' + encodeURIComponent(result.body.operationName);
    result = await json(statusUrl);
    assert.equal(result.body.done, true);
    const calls = providerCalls;
    await json(statusUrl); assert.equal(providerCalls, calls, 'Retomar não gera nem baixa novamente');
    const media = await originalFetch(base + result.body.videoUrl, { headers: { Range: 'bytes=2-4' } });
    assert.equal(media.status, 206); assert.equal(media.headers.get('Content-Range'), 'bytes 2-4/6');
    assert.deepEqual([...new Uint8Array(await media.arrayBuffer())], [3, 4, 5]);
    assert.equal((await originalFetch(base + result.body.videoUrl, { headers: { Range: 'bytes=99-' } })).status, 416);
    const omni = await json('/api/omni/generate', { method: 'POST', body: JSON.stringify({ prompt: 'Uma nave no céu.', aspectRatio: '9:16', duration: 6 }) });
    assert.equal(omni.status, 202);
    const omniStatusUrl = '/api/omni/status?operation=' + encodeURIComponent(omni.body.operationName);
    let omniStatus;
    for (let attempt = 0; attempt < 200; attempt++) {
      omniStatus = await json(omniStatusUrl);
      assert.equal(omniStatus.status, 200);
      if (omniStatus.body.done) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(omniStatus.body.done, true);
    assert.equal((await json(omniStatusUrl)).body.videoUrl, omniStatus.body.videoUrl);
    assert.equal(omniGenerationCalls, 1);
    const omniMedia = await originalFetch(base + omniStatus.body.videoUrl);
    assert.deepEqual([...new Uint8Array(await omniMedia.arrayBuffer())], [7, 8, 9]);
    process.env.TYPESAFE_API_KEY = 'test-only';
    result = await json('/api/breakdown', { method: 'POST', body: JSON.stringify({ lines: ['O piloto corre.'], characters: [{ tag: '@Piloto', name: 'Piloto', role: 'Protagonista' }], cameras: ['Wide', 'Tracking'] }) });
    assert.equal(result.status, 200); assert.equal(result.body.selections[0].characterTag, '@Piloto'); assert.equal(result.body.selections[0].cameraMovement, 'Tracking');
    globalThis.fetch = async () => Response.json({ error: { message: 'secret-test-only' } }, { status: 403 });
    result = await json('/api/veo/generate', { method: 'POST', body: JSON.stringify({ prompt: 'cidade', aspectRatio: '16:9' }) });
    assert.ok(!JSON.stringify(result.body).includes('secret-test-only'));
    assert.match(result.body.error, /Sem acesso/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ GEMINI_API_KEY: saved.gemini, GOOGLE_API_KEY: saved.google, TYPESAFE_API_KEY: saved.typesafe })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await new Promise(resolve => server.close(resolve));
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('flow-api-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
