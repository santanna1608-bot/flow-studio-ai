import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize, Repeat2, Download } from 'lucide-react';
import { drawFrame, filmDuration, locateScene, prepareVisuals, clipPlaybackTime } from '../utils/film';

const formatTime = seconds => Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + Math.floor(seconds % 60).toString().padStart(2, '0');
export default function MasterPlayer({ scenes, aspectRatio, isPlaying, onTogglePlay, currentTime, onSeek, onOpenExport, characters, accent, captions, onNotify, suspended }) {
  const [loop, setLoop] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const container = useRef(null), canvas = useRef(null), visuals = useRef(null), latest = useRef({});
  const duration = filmDuration(scenes), active = locateScene(scenes, currentTime);
  useEffect(() => { latest.current = { scenes, aspectRatio, currentTime, isPlaying, accent, captions, suspended }; }, [scenes, aspectRatio, currentTime, isPlaying, accent, captions, suspended]);
  useEffect(() => {
    let alive = true, prepared;
    // Loading state follows an external media preparation task.
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(true); setError('');
    prepareVisuals(scenes, characters).then(result => {
      prepared = result;
      if (!alive) { result.dispose(); return; }
      visuals.current = result; setLoading(false);
    }).catch(error => { if (alive) { setError(error.message); setLoading(false); } });
    return () => { alive = false; visuals.current = null; prepared?.dispose(); };
  }, [scenes, characters]);
  useEffect(() => {
    if (currentTime >= duration && isPlaying && duration > 0) {
      if (!loop) onTogglePlay();
      onSeek(0);
    }
  }, [currentTime, duration, isPlaying, loop, onTogglePlay, onSeek]);
  useEffect(() => {
    let id, activeMedia;
    const render = () => {
      const state = latest.current, target = canvas.current;
      if (target && state.scenes && !state.suspended) {
        const width = state.aspectRatio === '16:9' ? 1280 : 720, height = state.aspectRatio === '16:9' ? 720 : 1280;
        if (target.width !== width || target.height !== height) { target.width = width; target.height = height; }
        const { scene, localTime } = locateScene(state.scenes, state.currentTime);
        const media = visuals.current?.assets.get(scene?.id);
        if (activeMedia !== media) { activeMedia?.pause?.(); activeMedia = media; }
        if (media?.tagName === 'VIDEO') {
          const time = clipPlaybackTime(localTime, media.duration);
          if (Math.abs(media.currentTime - time) > (state.isPlaying ? 0.25 : 0.04)) media.currentTime = time;
          if (state.isPlaying && media.paused && !media.ended) media.play().catch(() => {});
          if (!state.isPlaying && !media.paused) media.pause();
        }
        drawFrame(target.getContext('2d'), width, height, scene, localTime, media, state.accent, state.captions, state.currentTime);
      }
      id = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(id); activeMedia?.pause?.(); };
  }, []);
  const jump = index => onSeek(scenes.slice(0, Math.max(0, index)).reduce((sum, s) => sum + s.duration, 0));
  const fullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current.requestFullscreen(); } catch { onNotify('Tela cheia não está disponível neste navegador.', 'error'); } };
  return <div ref={container} className="bg-[#12151c] border border-slate-800 rounded-2xl p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-bold uppercase">6. Montagem e pré-visualização</h2><span className="text-xs text-slate-400">Cena {scenes.length ? active.index + 1 : 0}/{scenes.length} · {aspectRatio}</span></div>
    <p className="text-xs text-slate-400">Música de fundo, narração e falas são misturadas. Sem fala substituta, usamos o áudio original decodificável do clipe. Cenas sem vídeo aparecem como storyboard.</p>
    <div className="flex justify-center">
      <div className={'relative overflow-hidden rounded-xl bg-black ' + (aspectRatio === '16:9' ? 'w-full max-w-3xl aspect-video' : 'w-[min(100%,320px)] aspect-[9/16]')}>
        <canvas aria-label="Prévia do filme" ref={canvas} className="w-full h-full object-contain" />
        {loading && <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs">Carregando mídia…</span>}
      </div>
    </div>
    {error && <p role="alert" className="text-red-300 text-xs">{error}</p>}
    <div className="flex gap-1 h-5">{scenes.map((s, i) => <button key={s.id} title={s.title} aria-label={'Ir para cena ' + s.shotNumber} onClick={() => jump(i)} style={{ flex: s.duration }} className={'rounded text-[10px] ' + (i === active.index ? 'bg-amber-500 text-black' : 'bg-slate-700')}>{i + 1}</button>)}</div>
    <input aria-label="Posição no filme" type="range" min="0" max={duration || 1} step="0.05" value={Math.min(currentTime, duration)} disabled={!scenes.length} onChange={e => onSeek(Number(e.target.value))} className="w-full accent-amber-500" />
    <div className="flex flex-wrap justify-between items-center gap-3 text-xs">
      <div className="flex gap-2 items-center">
        <button aria-label="Cena anterior" disabled={!scenes.length} onClick={() => jump(active.index - 1)} className="p-2 bg-slate-800 rounded"><SkipBack size={16} /></button>
        <button disabled={!scenes.length || loading || !!error} onClick={onTogglePlay} className="px-3 py-2 bg-amber-500 text-black rounded font-bold flex gap-2">{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? 'Pausar' : 'Reproduzir'}</button>
        <button aria-label="Próxima cena" disabled={active.index >= scenes.length - 1} onClick={() => jump(active.index + 1)} className="p-2 bg-slate-800 rounded"><SkipForward size={16} /></button>
        <button aria-label="Repetir filme" aria-pressed={loop} onClick={() => setLoop(!loop)} className={'p-2 rounded ' + (loop ? 'bg-amber-500 text-black' : 'bg-slate-800')}><Repeat2 size={16} /></button>
      </div>
      <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
      <div className="flex gap-2"><button aria-label="Tela cheia" onClick={fullscreen} className="p-2 bg-slate-800 rounded"><Maximize size={16} /></button><button disabled={!scenes.length} onClick={onOpenExport} className="flex gap-2 px-3 py-2 bg-emerald-500 text-black font-bold rounded"><Download size={16} />Exportar filme</button></div>
    </div>
  </div>;
}
