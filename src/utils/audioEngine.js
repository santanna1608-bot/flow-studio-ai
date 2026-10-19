const cache = new Map(), fileCache = new WeakMap();
const mediaCache = new Map();
async function decodeMedia(ctx, source) {
  if (source instanceof Blob) {
    if (!fileCache.has(source)) fileCache.set(source, ctx.decodeAudioData(await source.arrayBuffer()).catch(e => { fileCache.delete(source); throw e; }));
    return fileCache.get(source);
  }
  if (!mediaCache.has(source)) mediaCache.set(source, fetch(source).then(r => { if (!r.ok) throw new Error('Não foi possível carregar o áudio.'); return r.arrayBuffer(); }).then(b => ctx.decodeAudioData(b)).catch(e => { mediaCache.delete(source); throw e; }));
  return mediaCache.get(source);
}
export async function prepareFilmAudio(ctx, { scenes, narration, music }) {
  const duration = scenes.reduce((sum, s) => sum + Math.max(1, Number(s.duration) || 5), 0);
  const rate = ctx.sampleRate || 44100, output = ctx.createBuffer(2, Math.max(1, Math.ceil(duration * rate)), rate);
  const mix = (buffer, start, length, gain, loop = false) => {
    const from = Math.max(0, Math.round(start * rate)), limit = Math.min(output.length, from + Math.round(length * rate));
    for (let c = 0; c < 2; c++) {
      const target = output.getChannelData(c), data = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      for (let i = from; i < limit; i++) { let at = Math.floor((i - from) * buffer.sampleRate / rate); if (loop) at %= data.length; if (at >= data.length) break; target[i] += data[at] * gain; }
    }
  };
  if (music) mix(await prepareAudioBuffer(ctx, music), 0, duration, .25, true);
  if (narration?.audioUrl) mix(await decodeMedia(ctx, narration.audioUrl), Number(narration.start) || 0, duration, 1);
  let start = 0;
  for (const scene of scenes) {
    const length = Math.max(1, Number(scene.duration) || 5);
    if (scene.speech?.audioUrl && !scene.lipsynced) mix(await decodeMedia(ctx, scene.speech.audioUrl), start, length, 1);
    else if (scene.videoFile || scene.generatedVideoUrl) {
      // Silent video containers cannot be decoded by Web Audio.
      let original;
      try { original = await decodeMedia(ctx, scene.videoFile || scene.generatedVideoUrl); } catch { /* clip has no decodable audio */ }
      if (original) mix(original, start, length, narration?.audioUrl ? .4 : 1);
    }
    start += length;
  }
  for (let c = 0; c < 2; c++) { const data = output.getChannelData(c); for (let i = 0; i < data.length; i++) data[i] = Math.max(-1, Math.min(1, data[i])); }
  return output;
}
export async function prepareAudioBuffer(ctx, track) {
  if (track?.kind === 'film') return prepareFilmAudio(ctx, track);
  if (!track) { const rate = ctx.sampleRate || 44100; return ctx.createBuffer(2, rate, rate); }
  if (track?.file instanceof Blob) {
    if (!fileCache.has(track.file)) fileCache.set(track.file, ctx.decodeAudioData(await track.file.arrayBuffer()).catch(error => { fileCache.delete(track.file); throw error; }));
    return fileCache.get(track.file);
  }
  const bpm = track?.bpm || 128, key = (track?.id || 'default') + ':' + bpm;
  if (cache.has(key)) return cache.get(key);
  const rate = 44100, beat = 60 / bpm, buffer = ctx.createBuffer(2, Math.ceil(rate * beat * 16), rate), notes = [110, 130.81, 146.83, 98];
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, phase = t % beat, note = notes[Math.floor(t / (beat * 4)) % notes.length];
      data[i] = Math.sin(2 * Math.PI * note * t) * Math.exp(-phase * 8) * 0.22
        + Math.sin(2 * Math.PI * (45 * phase + 9 * (1 - Math.exp(-phase * 20)))) * Math.exp(-phase * 20) * 0.24
        + Math.sin(2 * Math.PI * note * 4 * t) * Math.exp(-(t % (beat / 2)) * 15) * 0.08;
    }
  }
  cache.set(key, buffer); return buffer;
}
export class AudioEngine {
  constructor() { this.ctx = null; this.offset = 0; this.startedAt = 0; this.playing = false; this.source = null; this.volume = 0.8; this.track = null; this.revision = 0; }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Este navegador não suporta Web Audio.');
      this.ctx = new AudioCtx(); this.analyserNode = this.ctx.createAnalyser(); this.analyserNode.fftSize = 128;
      this.gainNode = this.ctx.createGain(); this.gainNode.gain.value = this.volume;
      this.analyserNode.connect(this.gainNode); this.gainNode.connect(this.ctx.destination);
    }
  }
  loadTrack(track) { this.pause(); this.offset = 0; this.track = track; this.revision++; }
  async play() {
    this.init(); const revision = ++this.revision;
    await this.ctx.resume();
    const buffer = await prepareAudioBuffer(this.ctx, this.track);
    if (revision !== this.revision) return false;
    this.stopSource(); this.source = this.ctx.createBufferSource(); this.source.buffer = buffer;
    this.source.loop = true; this.source.connect(this.analyserNode); this.source.start(0, this.offset % buffer.duration);
    this.startedAt = this.ctx.currentTime; this.playing = true; return true;
  }
  stopSource() { if (this.source) { try { this.source.stop(); } catch { /* already stopped */ } this.source.disconnect(); this.source = null; } }
  pause() { this.offset = this.getCurrentTime(); this.playing = false; this.revision++; this.stopSource(); }
  seek(seconds) { const wasPlaying = this.playing; this.pause(); this.offset = Math.max(0, Number(seconds) || 0); return wasPlaying ? this.play() : Promise.resolve(true); }
  getCurrentTime() { return this.offset + (this.playing && this.ctx ? this.ctx.currentTime - this.startedAt : 0); }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); if (this.gainNode) this.gainNode.gain.value = this.volume; }
  getFrequencyData() { const data = new Uint8Array(this.analyserNode?.frequencyBinCount || 64); this.analyserNode?.getByteFrequencyData(data); return data; }
}
export const masterAudioEngine = new AudioEngine();
