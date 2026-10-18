// Web Audio API Engine & Master Soundtrack Manager

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.sourceNode = null;
    this.analyserNode = null;
    this.gainNode = null;
    this.synthOscillators = [];
    this.isSynthesizing = false;
    this.synthTimer = null;
    this.currentTrackUrl = null;
    this.synthStartTime = 0;
    this.synthPauseOffset = 0;
    this.synthDuration = 28; // seconds
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.7, this.ctx.currentTime);

      try {
        this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
      } catch (err) {
        console.warn("MediaElementSource note:", err);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  loadAudioFile(fileOrUrl) {
    this.init();
    this.stopSynth();

    if (typeof fileOrUrl === "string") {
      this.currentTrackUrl = fileOrUrl;
      this.audioElement.src = fileOrUrl;
      this.audioElement.load();
    } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      if (this.currentTrackUrl && this.currentTrackUrl.startsWith("blob:")) {
        URL.revokeObjectURL(this.currentTrackUrl);
      }
      this.currentTrackUrl = URL.createObjectURL(fileOrUrl);
      this.audioElement.src = this.currentTrackUrl;
      this.audioElement.load();
    }
  }

  play(bpm = 128) {
    this.init();

    if (this.audioElement.src && !this.audioElement.src.endsWith("#synthesized")) {
      return this.audioElement.play().catch(e => console.warn("Audio play prevented:", e));
    } else {
      this.playSynthTrack(bpm);
    }
  }

  pause() {
    if (this.audioElement.src && !this.audioElement.src.endsWith("#synthesized")) {
      this.audioElement.pause();
    }
    if (this.isSynthesizing) {
      this.pauseSynth();
    }
  }

  seek(seconds) {
    if (this.audioElement.src && !this.audioElement.src.endsWith("#synthesized")) {
      this.audioElement.currentTime = seconds;
    } else {
      this.synthPauseOffset = seconds % this.synthDuration;
      this.synthStartTime = this.ctx.currentTime - this.synthPauseOffset;
    }
  }

  setVolume(volume) { // 0.0 to 1.0
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
    this.audioElement.volume = volume;
  }

  // Synthesizes a high-tech cinematic cyberpunk bassline & arpeggio
  playSynthTrack(bpm = 128) {
    if (this.isSynthesizing) return;
    this.isSynthesizing = true;
    this.synthStartTime = this.ctx.currentTime - this.synthPauseOffset;

    const beatInterval = 60 / bpm; // seconds per beat
    let currentStep = Math.floor(this.synthPauseOffset / (beatInterval / 4)) % 64;

    const notes = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98]; // A2 bassline
    const arpNotes = [440, 523.25, 659.25, 587.33, 440, 659.25, 783.99, 880];

    const playStep = () => {
      if (!this.isSynthesizing || !this.ctx) return;

      const now = this.ctx.currentTime;
      // Kick drum on 1, 5, 9, 13...
      if (currentStep % 4 === 0) {
        this.triggerDrum(now, 130, 30, 0.25, "sine");
      }
      // Hi-hat on offbeats
      if (currentStep % 2 === 1) {
        this.triggerNoise(now, 0.04);
      }
      // Bassline note every 2 steps
      if (currentStep % 2 === 0) {
        const noteIndex = Math.floor(currentStep / 4) % notes.length;
        this.triggerSynthNote(now, notes[noteIndex], 0.2, "sawtooth", 0.18);
      }
      // Synth Arpeggio
      if (currentStep % 2 === 0) {
        const arpIndex = (currentStep + 2) % arpNotes.length;
        this.triggerSynthNote(now, arpNotes[arpIndex], 0.12, "triangle", 0.09);
      }

      currentStep = (currentStep + 1) % 64;
      this.synthPauseOffset = (this.ctx.currentTime - this.synthStartTime) % this.synthDuration;
    };

    const intervalMs = (beatInterval / 4) * 1000;
    this.synthTimer = setInterval(playStep, intervalMs);
  }

  triggerDrum(time, startFreq, endFreq, duration, type = "sine") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    env.gain.setValueAtTime(0.35, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(env);
    env.connect(this.analyserNode || this.gainNode);
    osc.start(time);
    osc.stop(time + duration);
  }

  triggerSynthNote(time, freq, duration, type = "sawtooth", gainVal = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + duration);

    env.gain.setValueAtTime(gainVal, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.analyserNode || this.gainNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  triggerNoise(time, duration) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.06, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(env);
    env.connect(this.analyserNode || this.gainNode);

    noise.start(time);
  }

  pauseSynth() {
    this.isSynthesizing = false;
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  }

  stopSynth() {
    this.pauseSynth();
    this.synthPauseOffset = 0;
  }

  getFrequencyData() {
    if (!this.analyserNode) return new Uint8Array(32);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  getCurrentTime() {
    if (this.audioElement.src && !this.audioElement.src.endsWith("#synthesized")) {
      return this.audioElement.currentTime;
    }
    if (this.isSynthesizing && this.ctx) {
      return (this.ctx.currentTime - this.synthStartTime) % this.synthDuration;
    }
    return this.synthPauseOffset;
  }

  getDuration() {
    if (this.audioElement.src && !this.audioElement.src.endsWith("#synthesized") && this.audioElement.duration) {
      return this.audioElement.duration;
    }
    return this.synthDuration;
  }
}

export const masterAudioEngine = new AudioEngine();
