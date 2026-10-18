import React, { useState } from 'react';
import { Download, CheckCircle2, Film, Music, ShieldCheck, Sparkles, X, FileVideo, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportUnifiedFilm } from '../utils/videoExporter';

export default function MasterExportModal({
  isOpen,
  onClose,
  projectName,
  scenes,
  aspectRatio,
  currentTrack,
  onNotify
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState(null);

  if (!isOpen) return null;

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration || 5), 0);
  const readyScenesCount = scenes.filter(s => s.status === 'ready').length;
  const resolutionText = aspectRatio === '16:9' ? '1920 × 1080 (Full HD Widescreen)' : '1080 × 1920 (Full HD Vertical Reels)';
  const estimatedFileSize = Math.round(totalDuration * 1.85); // approx MB

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(5);
    setDownloadReadyUrl(null);

    exportUnifiedFilm({
      scenes,
      aspectRatio,
      onProgress: (prog) => {
        setExportProgress(prog);
      },
      onComplete: ({ downloadUrl, blob, totalDuration }) => {
        setIsExporting(false);
        setDownloadReadyUrl(downloadUrl);

        // Confetti celebration
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // fallback
        }

        // Auto trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${projectName.replace(/\s+/g, '_')}_MASTER_${aspectRatio.replace(':', 'x')}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        onNotify('Filme Master renderizado e download iniciado com sucesso!', 'success');
      },
      onError: (errMsg) => {
        setIsExporting(false);
        onNotify(`Falha na exportação: ${errMsg}`, 'error');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow ambient accent */}
        <div className="absolute -top-20 -left-20 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Exportação Master do Filme
              </h3>
              <p className="text-xs text-slate-400">
                Consolidação cronológica e muxing de áudio/vídeo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Project Specifications */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Especificações Técnicas de Saída
            </h4>

            <div className="grid grid-cols-2 gap-3 text-slate-300 font-mono">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Projeto:</span>
                <span className="font-bold text-white truncate block">{projectName}</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Resolução Master:</span>
                <span className="font-bold text-amber-400">{resolutionText}</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Cenas Prontas:</span>
                <span className="font-bold text-emerald-400">{readyScenesCount} / {scenes.length} tomadas</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Duração Consolidada:</span>
                <span className="font-bold text-white">{totalDuration} segundos</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Codec de Vídeo:</span>
                <span className="font-bold text-cyan-400">H.264 High Profile / MP4</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-0.5">Codec de Áudio:</span>
                <span className="font-bold text-orange-400">AAC Estéreo 320kbps (48kHz)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                Trilha: {currentTrack?.name || 'Sintetizador Master'}
              </span>
              <span className="font-mono text-slate-300">
                Tamanho Estimado: ~{estimatedFileSize} MB
              </span>
            </div>
          </div>

          {/* Export Progress Bar if exporting */}
          {isExporting && (
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Renderizando e codificando arquivo MP4...
                </span>
                <span className="font-mono text-white font-bold">{exportProgress}%</span>
              </div>

              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-1 font-mono">
                Gravando quadros cinematográficos e mixando stream de áudio sincronizado...
              </p>
            </div>
          )}

          {/* Success Download Link if already finished */}
          {downloadReadyUrl && !isExporting && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-bold text-white text-xs">Filme pronto para download!</p>
                  <p className="text-[11px] text-emerald-300/80">O download já foi iniciado automaticamente pelo navegador.</p>
                </div>
              </div>

              <a
                href={downloadReadyUrl}
                download={`${projectName.replace(/\s+/g, '_')}_MASTER.mp4`}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Novamente
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleStartExport}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isExporting ? 'Processando...' : 'DOWNLOAD FILM (.MP4)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
