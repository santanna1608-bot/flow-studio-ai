import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, RotateCcw, Volume2, VolumeX, Clapperboard, Sparkles, Layers } from 'lucide-react';
import { masterAudioEngine } from '../utils/audioEngine';

export default function MasterPlayer({
  scenes,
  aspectRatio, // "16:9" or "9:16"
  isPlaying,
  onTogglePlay,
  currentTime,
  onSeek,
  currentTrack,
  onOpenExport
}) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

  // Sync active scene index based on currentTime
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < scenes.length; i++) {
      const dur = scenes[i].duration || 5;
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + dur) {
        setActiveSceneIndex(i);
        return;
      }
      accumulatedTime += dur;
    }
    if (currentTime >= totalDuration && totalDuration > 0) {
      if (isLooping) {
        onSeek(0);
      } else if (isPlaying) {
        onTogglePlay();
        onSeek(0);
      }
    }
  }, [currentTime, scenes, totalDuration, isLooping, isPlaying, onSeek, onTogglePlay]);

  const activeScene = scenes[activeSceneIndex] || scenes[0];

  // Dynamic Cinematic Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const isHorizontal = aspectRatio === "16:9";
    canvas.width = isHorizontal ? 1280 : 720;
    canvas.height = isHorizontal ? 720 : 1280;

    let particleArray = [];
    for (let i = 0; i < 24; i++) {
      particleArray.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        color: i % 2 === 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(6, 182, 212, 0.4)"
      });
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Calculate progress within current active scene
      let sceneStartTime = 0;
      for (let i = 0; i < activeSceneIndex; i++) {
        sceneStartTime += (scenes[i].duration || 5);
      }
      const sceneDuration = activeScene?.duration || 5;
      const sceneProgress = Math.min(1, Math.max(0, (currentTime - sceneStartTime) / sceneDuration));

      // Draw Atmospheric Background Gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (activeSceneIndex % 3 === 0) {
        grad.addColorStop(0, "#080c16");
        grad.addColorStop(0.5, "#17102e");
        grad.addColorStop(1, "#07121e");
      } else if (activeSceneIndex % 3 === 1) {
        grad.addColorStop(0, "#190c02");
        grad.addColorStop(0.5, "#0d1b2a");
        grad.addColorStop(1, "#150921");
      } else {
        grad.addColorStop(0, "#021612");
        grad.addColorStop(0.5, "#101626");
        grad.addColorStop(1, "#180a06");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Camera motion simulation (Zoom and Pan)
      ctx.save();
      const zoom = 1 + sceneProgress * 0.08;
      const pan = Math.sin(sceneProgress * Math.PI) * 16;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2 + pan, -height / 2);

      // Render Floating Cinematic Light Particles
      particleArray.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Central volumetric lighting glow
      const radial = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, width * 0.4
      );
      radial.addColorStop(0, "rgba(245, 158, 11, 0.15)");
      radial.addColorStop(0.7, "rgba(6, 182, 212, 0.05)");
      radial.addColorStop(1, "transparent");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      // Horizontal Letterbox Cinema Bars
      if (isHorizontal) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, 40);
        ctx.fillRect(0, height - 40, width, 40);
      }

      // HUD Overlay: Scene Info
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "bold 22px 'JetBrains Mono', monospace";
      ctx.fillText(
        `TAKE [0${activeScene?.shotNumber || 1}] : ${(activeScene?.title || 'CENA').toUpperCase()}`,
        35,
        isHorizontal ? 80 : 60
      );

      ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`CAM: ${activeScene?.cameraMovement || 'Pan 35mm'}`, 35, isHorizontal ? 108 : 90);

      if (activeScene?.characterTag) {
        ctx.fillStyle = "#10b981";
        ctx.fillText(`R2V REF: ${activeScene.characterTag}`, 35, isHorizontal ? 132 : 114);
      }

      // Live Timecode & Master Audio Badge
      const mins = Math.floor(currentTime / 60).toString().padStart(2, '0');
      const secs = Math.floor(currentTime % 60).toString().padStart(2, '0');
      const ms = Math.floor((currentTime % 1) * 100).toString().padStart(2, '0');

      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(`TC ${mins}:${secs}:${ms} | 24 FPS CINEMA`, 35, height - (isHorizontal ? 55 : 40));

      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`AUDIO: ${currentTrack?.name || 'MASTER SYNTH'}`, width - 260, height - (isHorizontal ? 55 : 40));

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [aspectRatio, activeSceneIndex, activeScene, currentTime, scenes, currentTrack]);

  // Jump to specific scene
  const jumpToScene = (index) => {
    let targetTime = 0;
    for (let i = 0; i < index; i++) {
      targetTime += (scenes[i].duration || 5);
    }
    onSeek(targetTime);
  };

  const handlePrevScene = () => {
    if (activeSceneIndex > 0) {
      jumpToScene(activeSceneIndex - 1);
    } else {
      onSeek(0);
    }
  };

  const handleNextScene = () => {
    if (activeSceneIndex < scenes.length - 1) {
      jumpToScene(activeSceneIndex + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.warn);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-2xl relative flex flex-col justify-between ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 rounded-none bg-black' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              Sala de Montagem & Finalização (Master Player)
            </h2>
            <p className="text-xs text-slate-400">
              Pré-visualize o filme consolidado em ordem cronológica com áudio sincronizado
            </p>
          </div>
        </div>

        {/* Scene Indicator & Format Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-300">
            Cena <strong className="text-amber-400">{activeSceneIndex + 1}</strong> de {scenes.length}
          </span>
          <span className="text-xs font-mono bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-300">
            {aspectRatio} {aspectRatio === '16:9' ? 'Horizontal' : 'Vertical'}
          </span>
        </div>
      </div>

      {/* Center Video Frame Container */}
      <div className="flex-1 flex items-center justify-center py-2 min-h-[360px] lg:min-h-[440px]">
        <div
          className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-black transition-all duration-300 flex items-center justify-center ${
            aspectRatio === '16:9'
              ? 'w-full max-w-3xl aspect-video glow-amber'
              : 'w-[280px] sm:w-[320px] aspect-[9/16] glow-amber'
          }`}
        >
          {/* Canvas Rendering */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
          />

          {/* Quick Play/Pause Center Overlay on Hover */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute inset-0 w-full h-full bg-black/20 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/90 group-hover:scale-110 text-black flex items-center justify-center shadow-2xl transition-transform">
              {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
            </div>
          </button>

          {/* Active scene prompt caption */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-xl p-2.5 pointer-events-none">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-mono text-cyan-400 font-bold">
                {activeScene?.characterTag || '@Elenco'}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {activeScene?.cameraMovement}
              </span>
            </div>
            <p className="text-xs text-white line-clamp-1 italic">
              "{activeScene?.prompt}"
            </p>
          </div>
        </div>
      </div>

      {/* Timeline with Scene Markers */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        {/* Multi-scene segmented timeline bar */}
        <div className="relative w-full h-3 bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800 mb-2 cursor-pointer">
          {scenes.map((scene, idx) => {
            const sceneDur = scene.duration || 5;
            const widthPercent = (sceneDur / totalDuration) * 100;
            const isCurrent = idx === activeSceneIndex;

            return (
              <div
                key={scene.id}
                onClick={() => jumpToScene(idx)}
                style={{ width: `${widthPercent}%` }}
                title={`Cena #${scene.shotNumber}: ${scene.title} (${sceneDur}s)`}
                className={`h-full border-r border-slate-950 relative group transition-colors ${
                  isCurrent ? 'bg-amber-500/60' : 'bg-slate-800/70 hover:bg-slate-700'
                }`}
              >
                {/* Segment indicator label on hover */}
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] px-1.5 py-0.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                  #{scene.shotNumber} ({sceneDur}s)
                </span>
              </div>
            );
          })}

          {/* Current playhead marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-md shadow-white pointer-events-none transition-all"
            style={{ left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
          />
        </div>

        {/* Master Player Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Previous, Play/Pause, Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevScene}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Cena anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              <span>{isPlaying ? 'Pausar' : 'Reproduzir Filme'}</span>
            </button>

            <button
              type="button"
              onClick={handleNextScene}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Próxima cena"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-lg transition-colors ${
                isLooping ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title={isLooping ? "Repetição contínua ativada" : "Ativar repetição"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Timecode Counter */}
          <div className="text-center font-mono text-xs text-slate-300">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-500"> / </span>
            <span className="text-slate-400">{formatTime(totalDuration)}</span>
          </div>

          {/* Right: Fullscreen & Export Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Tela Cheia"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenExport}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exportar Master (.MP4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
