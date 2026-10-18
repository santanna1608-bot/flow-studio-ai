import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Clock, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function GenerationPanel({
  scenes,
  onUpdateScenes,
  isRendering,
  setIsRendering,
  onNotify
}) {
  const [renderStepText, setRenderStepText] = useState('Pronto para geração autônoma');
  const [activeRenderingSceneId, setActiveRenderingSceneId] = useState(null);
  const [globalProgress, setGlobalProgress] = useState(0);

  // Render all scenes sequentially
  const handleGenerateAll = () => {
    if (isRendering) return;
    setIsRendering(true);
    setGlobalProgress(0);

    const steps = [
      "Codificando Tokens & Semântica do Prompt...",
      "Injetando Matriz de Consistência R2V do Personagem...",
      "Processando Difusão Latente Temporal (Omni Flash Engine)...",
      "Interpolação de Movimento & Upscaling Neural 4K..."
    ];

    let currentSceneIdx = 0;
    const total = scenes.length;

    const renderNextScene = () => {
      if (currentSceneIdx >= total) {
        setIsRendering(false);
        setActiveRenderingSceneId(null);
        setRenderStepText('Todas as cenas foram geradas com sucesso!');
        setGlobalProgress(100);
        onNotify('Filme gerado com sucesso! Pronto para pré-visualização e montagem.', 'success');
        return;
      }

      const scene = scenes[currentSceneIdx];
      setActiveRenderingSceneId(scene.id);

      // Mark scene as rendering
      onUpdateScenes(prev =>
        prev.map(s => s.id === scene.id ? { ...s, status: 'rendering', progress: 15 } : s)
      );

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setRenderStepText(`Cena #${scene.shotNumber}: ${steps[stepIndex]}`);
          const sceneProg = Math.round(((stepIndex + 1) / steps.length) * 100);

          onUpdateScenes(prev =>
            prev.map(s => s.id === scene.id ? { ...s, progress: sceneProg } : s)
          );

          const totalProg = Math.round(((currentSceneIdx + (sceneProg / 100)) / total) * 100);
          setGlobalProgress(totalProg);

          stepIndex++;
        } else {
          clearInterval(stepInterval);
          // Mark scene as ready
          onUpdateScenes(prev =>
            prev.map(s => s.id === scene.id ? { ...s, status: 'ready', progress: 100 } : s)
          );
          currentSceneIdx++;
          setTimeout(renderNextScene, 300);
        }
      }, 500);
    };

    renderNextScene();
  };

  // Render a single scene
  const handleRenderSingle = (sceneId) => {
    if (isRendering) return;
    setIsRendering(true);
    setActiveRenderingSceneId(sceneId);

    const targetScene = scenes.find(s => s.id === sceneId);
    setRenderStepText(`Renderizando individualmente Cena #${targetScene?.shotNumber}...`);

    onUpdateScenes(prev =>
      prev.map(s => s.id === sceneId ? { ...s, status: 'rendering', progress: 20 } : s)
    );

    setTimeout(() => {
      onUpdateScenes(prev =>
        prev.map(s => s.id === sceneId ? { ...s, progress: 65 } : s)
      );
    }, 600);

    setTimeout(() => {
      onUpdateScenes(prev =>
        prev.map(s => s.id === sceneId ? { ...s, status: 'ready', progress: 100 } : s)
      );
      setIsRendering(false);
      setActiveRenderingSceneId(null);
      setRenderStepText('Cena individual renderizada com sucesso.');
      onNotify(`Cena #${targetScene?.shotNumber} atualizada!`, 'success');
    }, 1200);
  };

  const readyCount = scenes.filter(s => s.status === 'ready').length;

  return (
    <div className="bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              5. Painel de Geração & Renderização IA
            </h2>
            <p className="text-xs text-slate-400">
              Processamento autônomo via modelos neurais de difusão de vídeo (Omni Flash / Veo 2)
            </p>
          </div>
        </div>

        {/* Global Action Button: GENERATE FILM */}
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={isRendering || scenes.length === 0}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${isRendering ? 'animate-spin' : ''}`} />
          <span>{isRendering ? 'Renderizando Filme...' : 'GENERATE FILM (Renderizar Cenas)'}</span>
        </button>
      </div>

      {/* Progress & Live Telemetry Bar */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isRendering ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-mono text-slate-300 font-semibold">{renderStepText}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Cenas Prontas: <strong className="text-emerald-400">{readyCount}/{scenes.length}</strong></span>
            <span>Progresso Geral: <strong className="text-white">{globalProgress}%</strong></span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>

      {/* Scenes Mini-Monitor Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {scenes.map((scene) => {
          const isCurrentActive = activeRenderingSceneId === scene.id;
          const isDone = scene.status === 'ready';

          return (
            <div
              key={scene.id}
              className={`rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                isCurrentActive
                  ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : isDone
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-900 opacity-75'
              }`}
            >
              {/* Scene Number & Status Badge */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="font-mono text-[11px] font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                  #{scene.shotNumber}
                </span>

                {isDone ? (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Pronta
                  </span>
                ) : isCurrentActive ? (
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> {scene.progress}%
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Fila
                  </span>
                )}
              </div>

              {/* Title & Ref */}
              <div className="mb-2">
                <p className="text-[11px] font-bold text-white truncate">{scene.title}</p>
                <p className="text-[10px] text-cyan-400 font-mono truncate">{scene.characterTag || 'Cena Geral'}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{scene.duration}s</p>
              </div>

              {/* Individual Render Button */}
              <button
                type="button"
                disabled={isRendering}
                onClick={() => handleRenderSingle(scene.id)}
                className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-40"
              >
                {isDone ? 'Regenerar' : 'Renderizar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
