import React, { useState } from 'react';
import { Sparkles, Video, Film, Download, Layers } from 'lucide-react';

export default function Navbar({
  projectName,
  setProjectName,
  totalScenes,
  totalDuration,
  aspectRatio,
  isRendering,
  onOpenExport,
  onReset
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0d0f14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 text-black">
            <Film className="w-5 h-5 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                FLOW <span className="text-amber-500">STUDIO</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> VEO + OMNI FLASH
              </span>
            </div>

            {/* Editable Project Name */}
            {isEditingTitle ? (
              <input
                disabled={isRendering}
                type="text"
                placeholder="Nome do projeto"
                aria-label="Nome do projeto"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="bg-slate-900 text-slate-200 text-xs px-2 py-0.5 rounded border border-amber-500/50 outline-none w-48 font-medium"
              />
            ) : (
              <button
                disabled={isRendering}
                onClick={() => setIsEditingTitle(true)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 group font-medium transition-colors text-left"
                title="Clique para renomear projeto"
              >
                <span>{projectName || 'Nome do projeto'}</span>
                <span className="text-[10px] text-amber-500/70 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Studio Telemetry Badges */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300">Motor:</span>
            <span className="text-emerald-400 font-semibold">Veo + Omni / Local</span>
          </div>
          <div className="h-3 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Cenas:</span>
            <span className="text-amber-400 font-semibold">{totalScenes}</span>
          </div>
          <div className="h-3 w-px bg-slate-800"></div>
          <div className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">Duração:</span>
            <span className="text-cyan-400 font-semibold">{totalDuration}s ({aspectRatio})</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            disabled={isRendering}
            onClick={onReset}
            title="Limpar e criar novo projeto"
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-all"
          >
            Novo
          </button>

          <button
            disabled={isRendering || totalScenes === 0}
            onClick={onOpenExport}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Exportar Filme</span>
          </button>
        </div>
      </div>
    </header>
  );
}
