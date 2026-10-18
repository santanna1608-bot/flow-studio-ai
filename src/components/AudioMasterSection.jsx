import React, { useState, useEffect, useRef } from 'react';
import { Music, Upload, Play, Pause, Volume2, VolumeX, Disc3, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
import { SAMPLE_AUDIO_TRACKS } from '../data/initialData';
import { masterAudioEngine } from '../utils/audioEngine';

export default function AudioMasterSection({
  currentTrack,
  onSelectTrack,
  onUploadCustomTrack,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onNotify
}) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // Handle volume changes
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    masterAudioEngine.setVolume(isMuted ? 0 : newVol);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    masterAudioEngine.setVolume(nextMute ? 0 : volume);
  };

  // Canvas Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const render = () => {
      const freqData = masterAudioEngine.getFrequencyData();
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let y = 10; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw frequency bars
      const barCount = 36;
      const barWidth = (width / barCount) - 3;

      for (let i = 0; i < barCount; i++) {
        const val = isPlaying
          ? (freqData[i % freqData.length] || 10) / 255
          : Math.sin(Date.now() * 0.002 + i * 0.3) * 0.15 + 0.2;

        const barHeight = Math.max(4, val * (height - 12));
        const x = i * (barWidth + 3);
        const y = (height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.5, '#ea580c');
        grad.addColorStop(1, '#06b6d4');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processAudioFile(file);
    e.target.value = '';
  };

  const processAudioFile = (file) => {
    if (!file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      onNotify('Por favor envie um arquivo de áudio válido (.mp3, .wav, .ogg, .m4a)', 'error');
      return;
    }

    const newTrack = {
      id: `custom-track-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Upload do Usuário',
      duration: 30, // fallback estimate
      bpm: 124,
      genre: 'Master Audio (Local)',
      type: 'custom',
      file: file
    };

    masterAudioEngine.loadAudioFile(file);
    onUploadCustomTrack(newTrack);
    onNotify(`Trilha sonora "${file.name}" carregada com sucesso!`, 'success');
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              3. Áudio & Música Mestre (Master Soundtrack)
            </h2>
            <p className="text-xs text-slate-400">
              Gerencie a trilha sonora base para sincronizar o ritmo dos cortes e beat-sync
            </p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/10 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Upload Trilha (.mp3 / .wav)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Track Selector & Presets (Col 4) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Biblioteca de Trilhas
            </span>

            <div className="space-y-1.5">
              {SAMPLE_AUDIO_TRACKS.map((track) => {
                const isSelected = currentTrack?.id === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track);
                      onNotify(`Trilha alterada para: ${track.name}`, 'info');
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/70 text-amber-300 font-semibold shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Disc3 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} />
                      <div className="truncate">
                        <p className="truncate text-white font-medium">{track.name}</p>
                        <p className="text-[10px] text-slate-400">{track.artist} • {track.genre}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                      {track.bpm} BPM
                    </span>
                  </button>
                );
              })}

              {currentTrack?.type === 'custom' && (
                <div className="p-2.5 rounded-lg border bg-orange-500/15 border-orange-500/70 text-orange-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Disc3 className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
                    <div className="truncate">
                      <p className="truncate font-bold text-white">{currentTrack.name}</p>
                      <p className="text-[10px] text-orange-300/80">Arquivo do Usuário</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-orange-950/80 px-1.5 py-0.5 rounded border border-orange-800">
                    Ativo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Drag & drop helper box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processAudioFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
              isDragOver ? 'border-orange-400 bg-orange-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <p className="text-[11px] text-slate-400">
              Arraste e solte seu arquivo de áudio aqui
            </p>
            <span className="text-[10px] text-orange-400 font-medium">MP3 ou WAV até 50MB</span>
          </div>
        </div>

        {/* Master Player & Waveform Visualizer (Col 8) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  Monitor de Áudio & Visualizador de Frequências
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-800/50 text-orange-400 text-[10px]">
                  {currentTrack?.bpm || 128} BPM • BEAT SYNC LOCK
                </span>
                <span className="text-slate-400 font-medium">
                  {formatTime(currentTime)} / {formatTime(duration || currentTrack?.duration || 28)}
                </span>
              </div>
            </div>

            {/* Live Canvas Waveform */}
            <div className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center p-2 shadow-inner">
              <canvas
                ref={canvasRef}
                width={700}
                height={90}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-500" />
                <span>FFT Spectrum 48kHz / Stereo AAC</span>
              </div>
            </div>

            {/* Scrubber timeline */}
            <div className="mt-3">
              <input
                type="range"
                min="0"
                max={duration || currentTrack?.duration || 28}
                step="0.1"
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>

          {/* Audio Controls Bar */}
          <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-800/80">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black flex items-center justify-center shadow-lg shadow-orange-500/20 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
              </button>

              <div>
                <p className="text-xs font-bold text-white truncate max-w-xs">{currentTrack?.name}</p>
                <p className="text-[11px] text-slate-400">{isPlaying ? "Reproduzindo trilha mestre..." : "Pausado"}</p>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-slate-400 hover:text-white transition-colors"
                title={isMuted ? "Desmutar" : "Mutar"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
