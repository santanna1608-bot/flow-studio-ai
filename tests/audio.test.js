import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/utils/audioEngine.js';

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  createAnalyser() { return { connect() {}, frequencyBinCount: 64, getByteFrequencyData() {} }; }
  createGain() { return { gain: { value: 1 }, connect() {} }; }
  createBuffer(channels, length, rate) { return { duration: length / rate, getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { return { connect() {}, disconnect() {}, start(...args) { this.args = args; }, stop() {} }; }
  async resume() {}
}
globalThis.window = { AudioContext: FakeAudioContext };

test('buscar antes da primeira reprodução não cria contexto nem lança erro', async () => {
  const engine = new AudioEngine();
  await engine.seek(42);
  assert.equal(engine.ctx, null);
  assert.equal(engine.getCurrentTime(), 42);
});
test('relógio do filme ultrapassa 28 segundos e pausa sem perder o ponto', async () => {
  const engine = new AudioEngine();
  await engine.play();
  engine.ctx.currentTime = 35;
  assert.equal(engine.getCurrentTime(), 35);
  engine.pause(); engine.ctx.currentTime = 100;
  assert.equal(engine.getCurrentTime(), 35);
  await engine.play(); engine.ctx.currentTime = 103;
  assert.equal(engine.getCurrentTime(), 38);
});
test('volume ajustado antes do play permanece aplicado e troca de trilha reseta o relógio', async () => {
  const engine = new AudioEngine();
  engine.setVolume(0); await engine.play();
  assert.equal(engine.gainNode.gain.value, 0);
  engine.ctx.currentTime = 12;
  engine.loadTrack({ id: 'outro', bpm: 90 });
  assert.equal(engine.playing, false);
  assert.equal(engine.getCurrentTime(), 0);
  assert.equal(engine.source, null);
});
test('seek durante reprodução reinicia a fonte no ponto correto sem modular o relógio do filme', async () => {
  const engine = new AudioEngine(); await engine.play();
  await engine.seek(61);
  assert.equal(engine.getCurrentTime(), 61);
  assert.ok(engine.source.args[1] < engine.source.buffer.duration);
});
