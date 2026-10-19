import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { chooseRecordingType, exportUnifiedFilm } from '../utils/videoExporter';
import { filmDuration } from '../utils/film';

export default function MasterExportModal({ isOpen, onClose, projectName, scenes, aspectRatio, currentTrack, filmTrack, captions, characters, accent, onBusy, onNotify }) {
  const [exporting, setExporting] = useState(false), [progress, setProgress] = useState(0), [download, setDownload] = useState(null), [error, setError] = useState('');
  const abort = useRef(null), downloadRef = useRef(null), closeButton = useRef(null);
  const [exactExport, setExactExport] = useState(null);
  useEffect(() => {
    const request = new AbortController();
    fetch('/api/config', { signal: request.signal }).then(r => r.json()).then(config => setExactExport(!!config.exactExport)).catch(() => setExactExport(false));
    return () => request.abort();
  }, []);
  useEffect(() => () => { abort.current?.abort(); if (downloadRef.current) URL.revokeObjectURL(downloadRef.current); }, []);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    closeButton.current?.focus();
    const key = e => {
      if (e.key === 'Escape' && !exporting) onClose();
      if (e.key === 'Tab') {
        const nodes = [...document.querySelectorAll('[role="dialog"] button, [role="dialog"] a')].filter(n => !n.disabled);
        if (!nodes.length) return;
        if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [isOpen, exporting, onClose]);
  useEffect(() => {
    if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    downloadRef.current = null;
    // This reset synchronizes the download with the changed project.
    // eslint-disable-next-line react/set-state-in-effect
    setDownload(null); setError('');
  }, [scenes, aspectRatio, currentTrack, filmTrack, captions, projectName, characters, accent]);
  if (!isOpen) return null;
  let type, unsupported;
  try { type = chooseRecordingType(); } catch (error) { unsupported = error.message; }
  const duration = filmDuration(scenes), storyboards = scenes.filter(s => !s.generatedVideoUrl && !s.videoFile).length;
  const start = async () => {
    if (exporting || exactExport === null) return;
    setExporting(true); onBusy(true); setProgress(0); setError('');
    if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    downloadRef.current = null; setDownload(null);
    abort.current = new AbortController();
    await exportUnifiedFilm({ scenes, aspectRatio, currentTrack: filmTrack, captions, characters, accent, exactExport, signal: abort.current.signal, onProgress: setProgress,
      onComplete: ({ downloadUrl, extension }) => {
        // Control characters and reserved filename characters are intentionally removed.
        // eslint-disable-next-line no-control-regex
        const filename = (projectName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'Filme') + '_MASTER.' + extension;
        downloadRef.current = downloadUrl; setDownload({ url: downloadUrl, filename });
        const a = document.createElement('a'); a.href = downloadUrl; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        onNotify('Filme exportado. Download iniciado.', 'success');
      },
      onError: message => { setError(message); onNotify(message, 'error'); }
    });
    setExporting(false); onBusy(false); abort.current = null;
  };
  return <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="export-title" className="bg-[#12151c] border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-auto">
      <div className="flex items-center justify-between"><h2 id="export-title" className="font-bold">Exportar filme</h2><button ref={closeButton} aria-label="Fechar exportação" disabled={exporting} onClick={onClose} className="p-2"><X size={18} /></button></div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <dt className="text-slate-400">Projeto</dt><dd>{projectName}</dd>
        <dt className="text-slate-400">Resolução</dt><dd>{aspectRatio === '16:9' ? '1920 × 1080' : '1080 × 1920'} · {exactExport ? '30 fps' : 'até 30 fps'}</dd>
        <dt className="text-slate-400">Formato de saída</dt><dd>{exactExport === null ? 'Verificando codificador…' : exactExport ? 'MP4 • H.264 / AAC • finalização FFmpeg' : type?.mimeType || 'Indisponível'}</dd>
        <dt className="text-slate-400">Duração</dt><dd>{duration.toFixed(1)} segundos · {scenes.length} cenas</dd>
        <dt className="text-slate-400">Música de fundo</dt><dd>{currentTrack?.name || 'Sem música'} · repetição até o fim</dd>
        <dt className="text-slate-400">Vozes e legendas</dt><dd>Narração e falas na montagem · {captions?.style ? captions.cues.length + ' blocos de legenda' : 'sem legendas'}</dd>
      </dl>
      {scenes.some(s => s.needsRegeneration) && <p className="text-xs text-amber-300">Há clipes anteriores às últimas alterações. Gere novamente para aplicá-las ao vídeo.</p>}
      {storyboards > 0 && <p className="text-xs text-amber-300">{storyboards} cena(s) sem clipe serão exportadas como storyboard animado com texto e referências locais. Gere no Veo ou importe os clipes para exportar o filme com vídeo.</p>}
      <p className="text-xs text-slate-400">Gravação em tempo real: mantenha esta aba visível por aproximadamente {Math.ceil(duration)} segundos, mais o tempo de finalização. Música, narração e falas são misturadas; as legendas ficam gravadas no vídeo. {exactExport ? 'O FFmpeg finaliza o MP4 com a duração da montagem e 30 fps.' : 'Sem FFmpeg, duração e FPS dependem do navegador; o formato pode ser MP4 ou WebM.'}</p>
      {exporting && <div role="status"><progress aria-label="Progresso da exportação" value={progress} max="100" className="w-full accent-amber-500" /><p className="text-xs">{progress}% {progress >= 95 ? '· Finalizando MP4…' : ''}</p></div>}
      {(error || unsupported) && <p role="alert" className="text-xs text-red-300">{error || unsupported}</p>}
      {download && <a className="block text-sm text-emerald-300 underline" href={download.url} download={download.filename}>Baixar novamente: {download.filename}</a>}
      <div className="flex justify-end gap-3">
        {exporting ? <button className="text-xs text-slate-300" onClick={() => abort.current?.abort()}>Cancelar exportação</button> : <button onClick={onClose} className="text-xs text-slate-300">Fechar</button>}
        <button disabled={exporting || exactExport === null || !!unsupported || !scenes.length} onClick={start} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs flex gap-2 disabled:opacity-40"><Download size={16} />Exportar .{exactExport ? 'mp4' : type?.extension || 'vídeo'}</button>
      </div>
    </div>
  </div>;
}
