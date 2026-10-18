import React from 'react';
import { Sliders, Monitor, Smartphone, Sparkles, Check, Info } from 'lucide-react';
import { VIDEO_PRESETS } from '../data/initialData';

export default function PresetAndFormatSelector({
  selectedPresetId,
  onSelectPreset,
  isFreeform,
  onToggleFreeform,
  aspectRatio,
  onChangeAspectRatio
}) {
  const currentPreset = VIDEO_PRESETS.find(p => p.id === selectedPresetId) || VIDEO_PRESETS[0];

  return (
    <div className="bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              1. Projeto & Configuração
            </h2>
            <p className="text-xs text-slate-400">
              Defina o estilo visual da IA e o formato de saída do vídeo
            </p>
          </div>
        </div>

        {/* Freeform Toggle Switch */}
        <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          <label htmlFor="freeform-toggle" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
            Configuração Livre (Sem Preset)
          </label>
          <button
            id="freeform-toggle"
            type="button"
            role="switch"
            aria-checked={isFreeform}
            onClick={() => onToggleFreeform(!isFreeform)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isFreeform ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isFreeform ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Preset Cards Selector (Col 8) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Diretrizes de Estilo Visual (IA Presets)
            </span>
            {isFreeform && (
              <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Livre Ativo: Prompts do roteiro controlam 100% da arte
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {VIDEO_PRESETS.filter(p => p.id !== 'custom-free').map((preset) => {
              const isSelected = !isFreeform && selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset.id);
                    if (isFreeform) onToggleFreeform(false);
                  }}
                  className={`group relative text-left p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between h-28 overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/70 shadow-lg shadow-amber-500/10'
                      : isFreeform
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-100 hover:border-slate-700'
                      : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  {/* Subtle top indicator bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-opacity"
                    style={{ backgroundColor: preset.accent, opacity: isSelected ? 1 : 0.4 }}
                  />

                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/70 border border-slate-800/80">
                      {preset.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Preset Prompt Hint */}
          <div className="mt-3 bg-slate-950/70 border border-slate-800/70 rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-300 font-medium">Prompt Base Injetado: </span>
              <span className="font-mono text-[11px] text-amber-400/90">
                {isFreeform ? "Nenhum (Prompt Limpo do Roteiro)" : currentPreset.stylePrompt}
              </span>
            </div>
          </div>
        </div>

        {/* Video Aspect Ratio Selector (Col 4) */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Formato de Saída (Aspect Ratio)
            </span>
            <p className="text-xs text-slate-400 mb-3">
              Adaptação automática para Cinema/YouTube ou Redes Verticais
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* 16:9 Horizontal Widescreen */}
              <button
                type="button"
                onClick={() => onChangeAspectRatio("16:9")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  aspectRatio === "16:9"
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* 16:9 Aspect Visual Box */}
                <div
                  className={`w-14 h-8 rounded border-2 mb-2 flex items-center justify-center transition-all ${
                    aspectRatio === "16:9" ? 'border-amber-400 bg-amber-500/20' : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">16:9 Horizontal</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Widescreen HD</span>
                <span className="text-[9px] font-mono text-amber-400/90 mt-1">1920 × 1080</span>
              </button>

              {/* 9:16 Vertical Reels/TikTok */}
              <button
                type="button"
                onClick={() => onChangeAspectRatio("9:16")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  aspectRatio === "9:16"
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* 9:16 Aspect Visual Box */}
                <div
                  className={`w-7 h-11 rounded border-2 mb-2 flex items-center justify-center transition-all ${
                    aspectRatio === "9:16" ? 'border-amber-400 bg-amber-500/20' : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white">9:16 Vertical</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Reels / TikTok</span>
                <span className="text-[9px] font-mono text-amber-400/90 mt-1">1080 × 1920</span>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Renderizador:</span>
            <span className="font-mono text-emerald-400 font-semibold">Veo 2 / Omni Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
