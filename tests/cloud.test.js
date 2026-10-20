import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createCloudHandler, seal, unseal } from '../server/cloud.js';
import entry from '../api/handler.js';

test('Vercel: catálogo, fala inline, Veo, Omni, lipsync e mídia funcionam sem disco compartilhado', async () => {
  const originalFetch = globalThis.fetch;
  const previous = Object.fromEntries(['GEMINI_API_KEY', 'ELEVENLABS_API_KEY', 'FLOW_MEDIA_SECRET'].map(k => [k, process.env[k]]));
  process.env.GEMINI_API_KEY = 'fake-google'; process.env.ELEVENLABS_API_KEY = 'fake-eleven'; process.env.FLOW_MEDIA_SECRET = 'fake-media';
  // Construct a fresh handler for every request, like separate serverless instances.
  const server = createServer(async (req, res) => {
    if (req.method === 'POST') { const chunks = []; for await (const chunk of req) chunks.push(chunk); req.body = JSON.parse(Buffer.concat(chunks).toString()); }
    if (req.url.startsWith('/api/handler?')) await entry(req, res);
    else await createCloudHandler()(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const json = async (path, input) => { const r = await originalFetch(base + path, input ? { method: 'POST', body: JSON.stringify(input) } : undefined); return { status: r.status, data: await r.json() }; };
  let calls = 0;
  globalThis.fetch = async (url, options = {}) => {
    calls++; const path = String(url);
    if (path.includes('/v2/voices')) return Response.json({ voices: [{ voice_id: 'voice1', name: 'Voz', labels: { gender: 'female' } }] });
    if (path.includes('/with-timestamps')) return Response.json({ audio_base64: Buffer.from('MP3').toString('base64'), alignment: { characters: ['O', 'i'], character_start_times_seconds: [0, .1], character_end_times_seconds: [.1, .2] } });
    if (path.endsWith('/flows/video')) { assert.equal(JSON.parse(options.body).audio.content_base64, Buffer.from('MP3').toString('base64')); return Response.json({ id: 'avatar1' }); }
    if (path.endsWith('/flows/video/avatar1')) return Response.json({ status: 'completed', content_url: 'https://storage.googleapis.com/eleven/result.mp4' });
    if (path.endsWith(':predictLongRunning')) return Response.json({ name: 'models/veo-3.1-generate-preview/operations/job1' });
    if (path.includes('/operations/job1')) return Response.json({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/veo1:download?alt=media' } }] } } });
    if (path.endsWith('/interactions')) return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'video', uri: 'files/omni1' }] }] });
    if (path.endsWith('/files/omni1')) return Response.json({ state: 'ACTIVE' });
    if (path.includes(':download')) { assert.equal(options.headers['x-goog-api-key'], 'fake-google'); assert.equal(options.headers.Range, 'bytes=0-2'); return new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { 'Content-Range': 'bytes 0-2/10', 'Content-Length': '3' } }); }
    if (path === 'https://storage.googleapis.com/eleven/result.mp4') { assert.equal(options.headers['xi-api-key'], undefined); assert.equal(options.headers['x-goog-api-key'], undefined); return new Response(new Uint8Array([4, 5, 6])); }
    throw new Error('Unexpected test request');
  };
  try {
    const config = (await json('/api/config')).data;
    assert.equal(config.deployment, 'vercel'); assert.equal(config.exactExport, false); assert.equal(config.elevenlabsConfigured, true);
    assert.ok(!JSON.stringify(config).includes('fake-'));
    assert.equal((await json('/api/speech/voices')).data.voices[0].name, 'Voz');
    assert.equal((await json('/api/handler?__flowPath=speech%2Fvoices')).data.voices[0].name, 'Voz');
    const before = calls;
    const large = await json('/api/speech/generate', { text: 'x'.repeat(1501), voiceId: 'voice1' });
    assert.equal(large.status, 400); assert.equal(calls, before);
    const speech = (await json('/api/speech/generate', { text: 'Oi', voiceId: 'voice1' })).data;
    assert.equal(speech.audioUrl, 'data:audio/mpeg;base64,TVAz'); assert.equal(speech.cues[0].text, 'Oi');
    const avatar = (await json('/api/lipsync/avatar', { image: 'data:image/png;base64,YWJj', audioUrl: speech.audioUrl })).data;
    const avatarResult = (await json('/api/lipsync/status?id=' + avatar.id)).data;
    assert.equal(avatarResult.done, true);
    assert.deepEqual([...new Uint8Array(await (await originalFetch(base + avatarResult.videoUrl)).arrayBuffer())], [4, 5, 6]);
    const veo = (await json('/api/veo/generate', { prompt: 'Cidade', aspectRatio: '9:16' })).data;
    const video = (await json('/api/veo/status?operation=' + encodeURIComponent(veo.operationName))).data;
    assert.equal(video.done, true); assert.ok(!video.videoUrl.includes('fake-google'));
    const range = await originalFetch(base + video.videoUrl, { headers: { Range: 'bytes=0-2' } });
    assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 0-2/10'); assert.equal((await range.arrayBuffer()).byteLength, 3);
    const omni = (await json('/api/omni/generate', { prompt: 'Cidade', aspectRatio: '9:16', duration: 8 })).data;
    assert.ok(omni.operationName.startsWith('omni-cloud-'));
    assert.equal((await json('/api/omni/status?operation=' + omni.operationName)).data.done, true);
    const token = seal({ kind: 'media', provider: 'google', uri: 'hidden-uri' });
    assert.ok(!token.includes('hidden-uri')); assert.equal(unseal(token, 'media').uri, 'hidden-uri');
    assert.throws(() => unseal(token, 'omni'), /inválido/);
    assert.equal((await json('/api/media?token=' + token.slice(0, -4) + 'AAAA')).status, 400);
    const cross = await originalFetch(base + '/api/speech/voices', { headers: { Origin: 'https://untrusted.test' } });
    assert.equal(cross.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, value] of Object.entries(previous)) { if (value === undefined) delete process.env[k]; else process.env[k] = value; }
    await new Promise(resolve => server.close(resolve));
  }
});
