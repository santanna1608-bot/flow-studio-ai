import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { generateSpeech, generateAvatar, avatarStatus, listVoices } from '../server/speech.js';
import { alignmentWords, groupWords, parseSrt, toSrt } from '../src/utils/captions.js';
import { prepareFilmAudio } from '../src/utils/audioEngine.js';

test('legendas preservam tempos reais, pausas e ida e volta em SRT', () => {
  const alignment = { characters: [...'Oi mundo'], character_start_times_seconds: [0, .1, .2, 1, 1.1, 1.2, 1.3, 1.4], character_end_times_seconds: [.1, .2, .3, 1.1, 1.2, 1.3, 1.4, 1.5] };
  const words = alignmentWords(alignment); assert.deepEqual(words, [{ text: 'Oi', start: 0, end: .2 }, { text: 'mundo', start: 1, end: 1.5 }]);
  const cues = groupWords(words); assert.equal(cues[0].end, 1.5);
  assert.deepEqual(parseSrt(toSrt(cues)), [{ start: 0, end: 1.5, text: 'Oi mundo' }]);
  assert.throws(() => parseSrt('1\n00:00:02,000 --> 00:00:01,000\nOi'), /inválido/);
});
test('ElevenLabs: catálogo, fala e avatar usam chave no servidor, tempos e retomada', async () => {
  const original = globalThis.fetch, key = process.env.ELEVENLABS_API_KEY;
  const directory = await mkdtemp(join(tmpdir(), 'flow-speech-test-'));
  process.env.ELEVENLABS_API_KEY = 'test-secret'; let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls++; const path = String(url);
      if (!path.startsWith('https://storage.googleapis.com/')) assert.equal(options.headers['xi-api-key'], 'test-secret');
      if (path.includes('/v2/voices')) return Response.json({ voices: [{ voice_id: 'voice123', name: 'Voz', labels: { gender: 'female' } }] });
      if (path.includes('/with-timestamps')) { assert.equal(JSON.parse(options.body).text, 'Oi'); return Response.json({ audio_base64: Buffer.from('mp3').toString('base64'), alignment: { characters: ['O', 'i'], character_start_times_seconds: [0, .1], character_end_times_seconds: [.1, .2] } }); }
      if (path.endsWith('/flows/video')) { const request = JSON.parse(options.body); assert.equal(request.model_id, 'creatify-aurora'); assert.equal(request.audio.mime_type, 'audio/mpeg'); return Response.json({ id: 'avatar1', status: 'pending' }); }
      if (path.endsWith('/flows/video/avatar1')) return Response.json({ status: 'completed', content_url: 'https://storage.googleapis.com/test/result.mp4' });
      assert.equal(options.headers, undefined); return new Response(new Uint8Array([1, 2, 3]));
    };
    assert.equal((await listVoices()).voices[0].gender, 'female');
    await assert.rejects(generateSpeech({ text: '', voiceId: 'x' }, directory), /fala/);
    const speech = await generateSpeech({ text: 'Oi', voiceId: 'voice123' }, directory);
    assert.equal(speech.cues[0].text, 'Oi'); assert.match(speech.audioUrl, /^\/api\/media\/[a-f0-9]{64}\.mp3$/);
    assert.equal((await readFile(join(directory, speech.audioUrl.split('/').at(-1)))).toString(), 'mp3');
    await assert.rejects(generateAvatar({ image: 'https://private', audioUrl: speech.audioUrl }, directory), /imagem/);
    const job = await generateAvatar({ image: 'data:image/png;base64,YWJj', audioUrl: speech.audioUrl }, directory);
    const result = await avatarStatus(job.id, directory); assert.equal(result.done, true);
    const previous = calls; assert.deepEqual(await avatarStatus(job.id, directory), result); assert.equal(calls, previous);
    globalThis.fetch = async () => Response.json({ detail: 'test-secret' }, { status: 401 });
    await assert.rejects(listVoices(), e => !e.message.includes('test-secret') && /Chave/.test(e.message));
  } finally {
    globalThis.fetch = original; if (key === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = key;
    if (resolve(directory).startsWith(resolve(tmpdir()) + sep)) await rm(directory, { recursive: true, force: true });
  }
});
test('montagem de áudio posiciona a fala na cena e não repete narração curta', async () => {
  const original = globalThis.fetch;
  const buffer = (channels, length, rate) => { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { duration: length / rate, length, sampleRate: rate, numberOfChannels: channels, getChannelData: c => data[c] }; };
  const voice = buffer(1, 2, 4); voice.getChannelData(0).fill(.5);
  const ctx = { sampleRate: 4, createBuffer: buffer, decodeAudioData: async () => voice };
  globalThis.fetch = async () => new Response(new Uint8Array([1]));
  try {
    const mixed = await prepareFilmAudio(ctx, { narration: { audioUrl: '/test-narration', start: 0 }, scenes: [{ duration: 1 }, { duration: 1, speech: { audioUrl: '/test-dialogue' } }] });
    assert.deepEqual([...mixed.getChannelData(0)], [.5, .5, 0, 0, .5, .5, 0, 0]);
  } finally { globalThis.fetch = original; }
});
