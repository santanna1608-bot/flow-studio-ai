import React, { useState } from 'react';
import { FileText, Wand2, Plus, Trash2, Copy, ArrowUp, ArrowDown, Sparkles, Clock, Video, Camera } from 'lucide-react';
import { SAMPLE_SCRIPTS, CAMERA_MOVEMENTS } from '../data/initialData';

export default function ScriptBreakdownEditor({
  scriptText,
  setScriptText,
  scenes,
  onUpdateScenes,
  characters,
  onNotify
}) {
  const [isProcessingBreakdown, setIsProcessingBreakdown] = useState(false);

  // Load sample scripts
  const handleLoadSample = (sample) => {
    setScriptText(sample.text);
    onNotify(`Roteiro de exemplo "${sample.title}" carregado!`, 'info');
  };

  // Breakdown Script Algorithm
  const handleBreakdownScript = () => {
    if (!scriptText.trim()) {
      onNotify('Por favor insira um roteiro ou ideia de texto para decompor em cenas.', 'error');
      return;
    }

    setIsProcessingBreakdown(true);

    setTimeout(() => {
      // Split text into lines / paragraphs
      const lines = scriptText
        .split(/\n+/)
        .map(l => l.trim())
        .filter(l => l.length > 5);

      const newScenes = [];
      const colors = [
        "from-blue-950 via-slate-900 to-amber-950",
        "from-amber-950 via-zinc-900 to-cyan-950",
        "from-slate-900 via-indigo-950 to-orange-950",
        "from-cyan-950 via-zinc-900 to-purple-950",
        "from-orange-950 via-amber-900 to-indigo-950",
        "from-purple-950 via-slate-900 to-emerald-950"
      ];

      lines.forEach((line, index) => {
        // Detect character tag in line (e.g. @Gabriel, @Elena)
        let detectedChar = characters[0]?.tag || '@Gabriel';
        for (const char of characters) {
          if (line.includes(char.tag)) {
            detectedChar = char.tag;
            break;
          }
        }

        // Camera movement random selection or heuristic
        const cam = CAMERA_MOVEMENTS[index % CAMERA_MOVEMENTS.length];

        // Clean line title
        let cleanText = line.replace(/^(Cena\s*\d+:?|Scene\s*\d+:?|Take\s*\d+:?)/i, '').trim();
        let shotTitle = cleanText.substring(0, 32);
        if (shotTitle.length === 32) shotTitle += '...';

        newScenes.push({
          id: `scene-${Date.now()}-${index}`,
          shotNumber: index + 1,
          title: shotTitle || `Tomada Cinematográfica ${index + 1}`,
          characterTag: detectedChar,
          cameraMovement: cam,
          prompt: line,
          duration: Math.min(8, Math.max(4, Math.round(line.split(' ').length * 0.4))), // 4s to 8s
          status: 'idle',
          progress: 0,
          thumbnailColor: colors[index % colors.length],
          visualStyleTag: `Take #${index + 1}`
        });
      });

      onUpdateScenes(newScenes);
      setIsProcessingBreakdown(false);
      onNotify(`Roteiro decomposto com sucesso em ${newScenes.length} cenas individuais!`, 'success');
    }, 800);
  };

  // Add individual scene
  const handleAddScene = () => {
    const nextNumber = scenes.length + 1;
    const newScene = {
      id: `scene-${Date.now()}`,
      shotNumber: nextNumber,
      title: `Tomada ${nextNumber}`,
      characterTag: characters[0]?.tag || '@Gabriel',
      cameraMovement: CAMERA_MOVEMENTS[0],
      prompt: `@Gabriel caminha lentamente com expressão dramática sob iluminação cinematográfica.`,
      duration: 5,
      status: 'idle',
      progress: 0,
      thumbnailColor: 'from-amber-950 via-zinc-900 to-slate-900',
      visualStyleTag: 'Nova Tomada'
    };

    onUpdateScenes([...scenes, newScene]);
    onNotify('Nova cena adicionada à lista!', 'info');
  };

  // Delete scene
  const handleDeleteScene = (id) => {
    if (scenes.length <= 1) {
      onNotify('O projeto deve ter ao menos 1 cena.', 'error');
      return;
    }
    const filtered = scenes.filter(s => s.id !== id);
    // Renumber
    const renumbered = filtered.map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
    onUpdateScenes(renumbered);
  };

  // Duplicate scene
  const handleDuplicateScene = (scene) => {
    const clone = {
      ...scene,
      id: `scene-${Date.now()}`,
      shotNumber: scene.shotNumber + 1,
      title: `${scene.title} (Cópia)`,
      status: 'idle',
      progress: 0
    };
    const index = scenes.findIndex(s => s.id === scene.id);
    const updated = [...scenes];
    updated.splice(index + 1, 0, clone);
    const renumbered = updated.map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
    onUpdateScenes(renumbered);
    onNotify('Cena duplicada!', 'info');
  };

  // Move scene up/down
  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;
    const updated = [...scenes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const renumbered = updated.map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
    onUpdateScenes(renumbered);
  };

  // Update specific field in a scene
  const handleSceneFieldChange = (id, field, value) => {
    onUpdateScenes(
      scenes.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const totalEstimatedDuration = scenes.reduce((sum, s) => sum + (s.duration || 5), 0);

  return (
    <div className="bg-[#12151c] border border-slate-800/80 rounded-2xl p-4 lg:p-5 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              4. Editor de Roteiro & Quebra de Cenas (Breakdown Script)
            </h2>
            <p className="text-xs text-slate-400">
              Cole o texto e decomponha em tomadas cinematográficas de até 10 segundos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Duração Total Estimada: <strong className="text-white">{totalEstimatedDuration}s</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Script Input Textarea & Breakdown Trigger (Col 5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Texto do Roteiro / Letra / Ideia de Vídeo:
              </label>

              {/* Quick load presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Exemplos:</span>
                {SAMPLE_SCRIPTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="text-[10px] text-amber-400/90 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors"
                  >
                    {sample.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Cole aqui seu roteiro, letra musical ou prompts separados por linhas. Use tags como @Gabriel ou @Elena para invocar personagens com consistência R2V..."
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Breakdown Script Action Button */}
          <button
            type="button"
            onClick={handleBreakdownScript}
            disabled={isProcessingBreakdown}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Wand2 className={`w-4 h-4 ${isProcessingBreakdown ? 'animate-spin' : ''}`} />
            <span>{isProcessingBreakdown ? 'Analisando Roteiro & Gerando Cenas...' : 'Breakdown Script (Gerar Cenas)'}</span>
          </button>
        </div>

        {/* Right: Decomposed Scene Sequence Cards (Col 7) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              Sequência de Cenas Decompostas ({scenes.length})
            </span>

            <button
              type="button"
              onClick={handleAddScene}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 text-amber-400" />
              <span>+ Adicionar Tomada</span>
            </button>
          </div>

          {/* Scrollable list of decomposed scene cards */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all group"
              >
                {/* Scene Card Header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-amber-500 text-black font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      #{scene.shotNumber}
                    </span>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => handleSceneFieldChange(scene.id, 'title', e.target.value)}
                      className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-amber-500 outline-none w-48 truncate"
                    />
                  </div>

                  {/* Actions: Reorder, Duplicate, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === scenes.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateScene(scene)}
                      className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                      title="Duplicar cena"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScene(scene.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      title="Excluir cena"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt Textarea */}
                <div className="mb-2">
                  <textarea
                    rows={2}
                    value={scene.prompt}
                    onChange={(e) => handleSceneFieldChange(scene.id, 'prompt', e.target.value)}
                    placeholder="Descrição da ação e composição da cena..."
                    className="w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-amber-500/60 resize-none font-mono"
                  />
                </div>

                {/* Scene Controls Row: Character Tag, Camera Angle, Duration Slider */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs items-center">
                  {/* Character R2V Tag Link */}
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-medium">Ref:</span>
                    <select
                      value={scene.characterTag || ''}
                      onChange={(e) => handleSceneFieldChange(scene.id, 'characterTag', e.target.value)}
                      className="bg-transparent text-cyan-400 font-mono text-xs outline-none cursor-pointer w-full font-bold"
                    >
                      {characters.map(c => (
                        <option key={c.id} value={c.tag} className="bg-slate-900 text-white">
                          {c.tag} ({c.name})
                        </option>
                      ))}
                      <option value="" className="bg-slate-900 text-slate-400">Sem personagem</option>
                    </select>
                  </div>

                  {/* Camera Movement Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 truncate">
                    <Camera className="w-3 h-3 text-amber-400 shrink-0" />
                    <select
                      value={scene.cameraMovement || CAMERA_MOVEMENTS[0]}
                      onChange={(e) => handleSceneFieldChange(scene.id, 'cameraMovement', e.target.value)}
                      className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer w-full truncate"
                    >
                      {CAMERA_MOVEMENTS.map(m => (
                        <option key={m} value={m} className="bg-slate-900 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration Slider (3s to 10s max per shot) */}
                  <div className="flex items-center justify-between gap-2 bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400">Duração:</span>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      step="1"
                      value={scene.duration || 5}
                      onChange={(e) => handleSceneFieldChange(scene.id, 'duration', parseInt(e.target.value))}
                      className="w-16 h-1 bg-slate-800 rounded-lg cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-xs font-bold text-amber-400 min-w-[20px] text-right">
                      {scene.duration || 5}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
