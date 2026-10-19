import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { buildOmniRequest, extractOmniVideo, omniFileId, createOmniService } from '../server/omni.js';
import { generationProvider } from '../src/utils/videoProviders.js';

test('Omni usa Interactions, URI, Full HD e a mesma chave do servidor', () => {
  const request = buildOmniRequest({ prompt: 'Uma nave no céu.', aspectRatio: '9:16', duration: 6 });
  assert.equal(request.model, 'gemini-omni-1.1-flash');
  assert.deepEqual(request.response_format, { type: 'video', aspect_ratio: '9:16', resolution: '1080p', delivery: 'uri' });
  assert.match(request.input, /6 seconds/);
  assert.equal(request.background, false);
  assert.equal(request.store, false);
  assert.equal(request.stream, false);
  assert.ok(!('duration_seconds' in request));
  const reference = buildOmniRequest({ prompt: 'A pessoa caminha.', aspectRatio: '16:9', referenceImage: 'data:image/jpeg;base64,YWJj' });
  assert.equal(reference.input[0].mime_type, 'image/jpeg');
  assert.equal(reference.input[1].type, 'text');
  assert.throws(() => buildOmniRequest({ prompt: '', aspectRatio: '16:9' }), /prompt/);
  assert.throws(() => buildOmniRequest({ prompt: 'céu', aspectRatio: '1:1' }), /Formato/);
  assert.throws(() => buildOmniRequest({ prompt: 'céu', aspectRatio: '16:9', duration: 90 }), /duração/);
  assert.throws(() => buildOmniRequest({ prompt: 'céu', aspectRatio: '16:9', referenceImage: 'https://private.example' }), /referência/);
});

test('resposta REST usa apenas conteúdo de saída e URI é restrita ao Google', () => {
  const video = { type: 'video', uri: 'files/video-123' };
  assert.equal(extractOmniVideo({ steps: [{ type: 'user_input', content: [{ type: 'video', uri: 'files/entrada' }] }, { type: 'model_output', content: [video] }] }), video);
  assert.equal(extractOmniVideo({ output_video: video }), video);
  assert.equal(extractOmniVideo({ steps: [{ type: 'user_input', content: [video] }] }), undefined);
  assert.equal(omniFileId('files/video-123'), 'video-123');
  assert.equal(omniFileId('https://generativelanguage.googleapis.com/v1beta/files/video-123:download?alt=media'), 'video-123');
  assert.throws(() => omniFileId('https://untrusted.example/files/video-123'), /inesperado/);
  assert.throws(() => omniFileId('files/../private'), /inesperado/);
});

test('retomar respeita o provedor da operação mesmo após trocar o seletor', () => {
  assert.equal(generationProvider({ operationName: 'omni-abc' }, 'veo'), 'omni');
  assert.equal(generationProvider({ operationName: 'models/veo-3.1-generate-preview/operations/abc' }, 'omni'), 'veo');
  assert.equal(generationProvider({}, 'omni'), 'omni');
  assert.equal(generationProvider({}, 'unknown'), 'veo');
});

test('Omni: consulta local, processamento, cache e retomada sem duplicar geração', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flow-omni-test-'));
  let finishGeneration, generatedRequests = 0, fileRequests = 0, downloads = 0;
  const dependencies = {
    mediaDirectory: directory,
    requestGoogle: async (path, options) => {
      if (path === 'interactions') {
        generatedRequests++;
        assert.equal(JSON.parse(options.body).response_format.delivery, 'uri');
        return new Promise(resolve => { finishGeneration = resolve; });
      }
      assert.equal(path, 'files/output123'); fileRequests++;
      return { state: fileRequests === 1 ? 'PROCESSING' : 'ACTIVE' };
    },
    cacheVideo: async (id, uri, path) => { downloads++; assert.match(uri, /files\/output123:download\?alt=media$/); await writeFile(path, new Uint8Array([1, 2, 3])); }
  };
  try {
    const service = createOmniService(dependencies);
    const result = await service.generate({ prompt: 'Uma nave no céu.', aspectRatio: '16:9' });
    assert.equal(result.provider, 'omni');
    assert.equal((await service.status(result.operationName)).stage, 'generating');
    const restarted = createOmniService(dependencies);
    await assert.rejects(() => restarted.status(result.operationName), /reiniciou/);
    assert.equal(generatedRequests, 1);
    finishGeneration({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'video', mime_type: 'video/mp4', uri: 'files/output123' }] }] });
    let status;
    for (let i = 0; i < 50; i++) {
      status = await service.status(result.operationName);
      if (status.stage === 'processing') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(status.done, false);
    assert.equal(status.stage, 'processing');
    status = await service.status(result.operationName);
    assert.equal(status.done, true);
    assert.match(status.videoUrl, /^\/api\/media\/[a-f0-9]{64}\.mp4$/);
    assert.equal((await restarted.status(result.operationName)).videoUrl, status.videoUrl);
    assert.equal(generatedRequests, 1);
    assert.equal(downloads, 1);
    assert.equal(fileRequests, 2);
    await assert.rejects(() => service.status('../../secret'), /inválida/);
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('flow-omni-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('Omni aceita vídeo inline e registra falhas sem declarar vídeo pronto', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flow-omni-test-'));
  try {
    const service = createOmniService({ mediaDirectory: directory, requestGoogle: async () => ({ output_video: { mime_type: 'video/mp4', data: 'YWJj' } }) });
    const inline = await service.generate({ prompt: 'Uma nave.', aspectRatio: '16:9' });
    let ready;
    for (let i = 0; i < 50; i++) { ready = await service.status(inline.operationName); if (ready.done) break; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.equal(ready.done, true);
    const failed = createOmniService({ mediaDirectory: directory, requestGoogle: async () => ({ status: 'completed', steps: [] }) });
    const missing = await failed.generate({ prompt: 'Uma nave.', aspectRatio: '16:9' });
    let error;
    for (let i = 0; i < 50; i++) {
      try { await failed.status(missing.operationName); } catch (failure) { error = failure; break; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.match(error?.message || '', /não retornou vídeo/);
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('flow-omni-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
