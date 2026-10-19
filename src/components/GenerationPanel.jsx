import { useState, useEffect, useRef } from 'react';
import { VIDEO_PROVIDERS, generationProvider, videoDuration } from '../utils/videoProviders';
import { Cpu, Sparkles, RefreshCw, Upload, Download, X } from 'lucide-react';

async function api(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Falha na comunicação com o servidor.');
  return result;
}
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(new DOMException('Acompanhamento cancelado.', 'AbortError')); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
  signal.addEventListener('abort', abort, { once: true });
});
export default function GenerationPanel({ scenes, onUpdateScenes, isRendering, setIsRendering, onNotify, aspectRatio, preset, characters, disabled, provider = 'veo', onChangeProvider }) {
  const [config, setConfig] = useState(null), [message, setMessage] = useState('Pronto para gerar vídeos ou importar clipes.');
  const [configError, setConfigError] = useState('');
  const controller = useRef(null);
  const selected = VIDEO_PROVIDERS[provider] || VIDEO_PROVIDERS.veo;
  useEffect(() => {
    const request = new AbortController();
    api('/api/config', { signal: request.signal }).then(setConfig).catch(error => { if (error.name !== 'AbortError') setConfigError('Não foi possível verificar a configuração. Recarregue a página ou confira se o servidor está ativo.'); });
    return () => { request.abort(); controller.current?.abort(); };
  }, []);
  const update = (id, values) => onUpdateScenes(prev => prev.map(s => s.id === id ? { ...s, ...values } : s));
  const generate = async targets => {
    if (isRendering || disabled || !targets.length) return;
    const abort = new AbortController(); controller.current = abort;
    setIsRendering(true);
    let activeId;
    try {
      for (const scene of targets) {
        activeId = scene.id;
        abort.signal.throwIfAborted();
        const targetProvider = generationProvider(scene, provider);
        const engine = VIDEO_PROVIDERS[targetProvider].label;
        update(scene.id, { status: 'rendering', error: null });
        setMessage('Cena ' + scene.shotNumber + ': enviando ao ' + engine + '…');
        const character = characters.find(c => c.tag === scene.characterTag);
        const prompt = [scene.prompt, scene.cameraMovement && 'Camera: ' + scene.cameraMovement, preset?.stylePrompt, character && 'Character ' + character.tag + ': ' + character.outfitPrompt].filter(Boolean).join('\n');
        let operationName = scene.operationName;
        if (!operationName) {
          const result = await api('/api/' + targetProvider + '/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
            body: JSON.stringify({ prompt, aspectRatio, duration: Math.min(8, scene.duration), referenceImage: character?.avatarUrl?.startsWith('data:image/') ? character.avatarUrl : undefined })
          });
          operationName = result.operationName;
          update(scene.id, { operationName, operationProvider: targetProvider });
        }
        setMessage('Cena ' + scene.shotNumber + ': aguardando ' + engine + '. Pode levar alguns minutos.');
        const deadline = Date.now() + 20 * 60 * 1000;
        let failures = 0;
        while (true) {
          abort.signal.throwIfAborted();
          let result;
          try {
            result = await api('/api/' + targetProvider + '/status?operation=' + encodeURIComponent(operationName), { signal: abort.signal });
            failures = 0;
          } catch (error) {
            if (error.name === 'AbortError' || ++failures > 2) throw error;
            await wait(10000, abort.signal); continue;
          }
          if (result.done) {
            const actualDuration = await videoDuration(result.videoUrl);
            update(scene.id, { status: 'ready', progress: 100, generatedVideoUrl: result.videoUrl, generatedProvider: targetProvider, duration: Math.min(scene.duration, actualDuration), sourceDuration: actualDuration, lipsynced: false, videoFile: null, operationName: null, operationProvider: null, generatedAspectRatio: aspectRatio, needsRegeneration: false }); break; }
          if (Date.now() > deadline) throw new Error(engine + ' ainda não concluiu. Use Retomar para consultar a mesma operação sem enviar outro pedido.');
          await wait(10000, abort.signal);
        }
      }
      setMessage('Vídeos recebidos e salvos no servidor local.');
      onNotify('Geração concluída. Vídeos disponíveis na montagem.', 'success');
    } catch (error) {
      if (activeId) update(activeId, { status: 'error', error: error.name === 'AbortError' ? 'Acompanhamento interrompido. O pedido já enviado pode continuar no Google; use Retomar.' : error.message });
      setMessage(error.name === 'AbortError' ? 'Acompanhamento interrompido. O Google pode continuar processando o pedido enviado.' : error.message);
      onNotify(error.name === 'AbortError' ? 'Acompanhamento interrompido; a cobrança do pedido enviado não é cancelada.' : error.message, 'error');
    } finally { setIsRendering(false); controller.current = null; }
  };
  const importVideo = async (scene, file) => {
    if (!file) return;
    if (!file.type.startsWith('video/') || file.size > 200 * 1024 * 1024) { onNotify('Envie um vídeo de até 200 MB.', 'error'); return; }
    const url = URL.createObjectURL(file), video = document.createElement('video');
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Tempo esgotado ao carregar o vídeo.')), 15000);
        video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
        video.onerror = () => { clearTimeout(timer); reject(new Error('Formato de vídeo não suportado.')); };
        video.src = url;
      });
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Duração de vídeo inválida.');
      update(scene.id, { videoFile: file, generatedVideoUrl: null, operationName: null, status: 'ready', progress: 100, duration: video.duration, sourceDuration: video.duration, lipsynced: false, generatedProvider: null, operationProvider: null, error: null, needsRegeneration: false });
      onNotify('Clipe importado e salvo no projeto.', 'success');
    } catch (error) { onNotify(error.message, 'error'); }
    finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
  };
  const pending = scenes.filter(s => (!s.generatedVideoUrl && !s.videoFile) || s.needsRegeneration);
  return <div className="bg-[#12151c] border border-slate-800 rounded-2xl p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase flex items-center gap-2"><Cpu size={18} />5. Vídeos — Veo e Omni Flash</h2>
      <div className="flex gap-2">
        {isRendering && <button onClick={() => controller.current?.abort()} className="px-3 py-2 bg-slate-700 rounded-lg text-xs flex gap-2"><X size={14} />Parar acompanhamento</button>}
        <button disabled={isRendering || disabled || !config?.[selected.configuration] || !pending.length || pending.some(scene => !scene.prompt.trim())}
          onClick={() => generate(pending)} className="px-4 py-2 bg-emerald-500 text-black rounded-lg font-bold text-xs disabled:opacity-40 flex items-center gap-2">
          <Sparkles size={15} />Gerar cenas pendentes — {selected.label}
        </button>
      </div>
    </div>
    <label className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
      Modelo de geração
      <select aria-label="Modelo de geração" value={provider} disabled={isRendering || disabled} onChange={e => onChangeProvider(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white">
        <option value="veo">Google Veo</option>
        <option value="omni">Gemini Omni Flash</option>
      </select>
      <span className="text-slate-400">{provider === 'omni' ? config?.omniModel : config?.model}</span>
    </label>
    <p className="text-xs text-slate-400">{provider === 'omni'
      ? 'Omni Flash cria um clipe a partir do prompt e da referência local. Pedimos Full HD e a duração da cena; a duração final é definida pelo modelo, e a montagem é ajustada ao clipe recebido.'
      : 'Veo gera clipes Full HD de 8 segundos; a montagem usa a duração da cena.'} Ambos usam GEMINI_API_KEY e créditos da sua conta Google. O acesso a cada modelo depende da sua conta e região. Referências enviadas por upload acompanham o pedido; URLs externas ficam apenas no cadastro.</p>
    {!config && !configError && <p className="text-xs text-slate-400" role="status">Verificando configuração dos modelos…</p>}
    {configError && <p className="text-xs text-amber-300" role="alert">{configError}</p>}
    {config && !config[selected.configuration] && <p className="text-xs text-amber-300" role="status">Configure GEMINI_API_KEY em .env.local e reinicie o servidor para habilitar Veo e Omni Flash. Você já pode importar clipes e exportar storyboards.</p>}
    <p role="status" className="text-xs text-slate-300">{message}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scenes.map(scene => <div key={scene.id} className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2">
        <p className="text-xs font-bold">#{scene.shotNumber} {scene.title}</p>
        <p className="text-xs text-slate-400">{scene.status === 'rendering' ? 'Processando no Google…' : scene.generatedVideoUrl || scene.videoFile ? 'Vídeo disponível' : 'Storyboard • sem vídeo'} · {scene.duration}s</p>
        {scene.generatedProvider && <p className="text-xs text-cyan-300">Gerado com {VIDEO_PROVIDERS[scene.generatedProvider]?.label || scene.generatedProvider}</p>}
        {scene.needsRegeneration && <p className="text-xs text-amber-300">O clipe anterior foi mantido. Gere novamente para aplicar as alterações.</p>}
        {scene.error && <p role="alert" className="text-xs text-red-300">{scene.error}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={isRendering || disabled || !config?.[selected.configuration] || !scene.prompt.trim()} onClick={() => generate([scene])} className="text-xs bg-slate-700 rounded px-2 py-1 disabled:opacity-40 flex gap-1"><RefreshCw size={12} />{scene.operationName ? 'Retomar ' + VIDEO_PROVIDERS[generationProvider(scene, provider)].label : (scene.generatedVideoUrl || scene.videoFile ? 'Gerar novamente — ' : 'Gerar no ') + selected.label}</button>
          <label className="text-xs bg-slate-700 rounded px-2 py-1 cursor-pointer flex gap-1"><Upload size={12} />Importar clipe<input aria-label={'Importar clipe da cena ' + scene.shotNumber} disabled={isRendering || disabled} type="file" accept="video/*" className="hidden" onChange={e => { importVideo(scene, e.target.files?.[0]); e.target.value = ''; }} /></label>
          {(scene.generatedVideoUrl || scene.videoFile) && <button disabled={isRendering || disabled} onClick={() => update(scene.id, { videoFile: null, generatedVideoUrl: null, generatedProvider: null, operationProvider: null, operationName: null, status: 'idle', progress: 0, error: null, needsRegeneration: false })} className="text-xs text-slate-300 underline">Remover clipe</button>}
          {scene.generatedVideoUrl && <a className="text-xs text-emerald-300 flex gap-1 items-center" href={scene.generatedVideoUrl} download={'Cena_' + scene.shotNumber + '.mp4'}><Download size={12} />Original MP4</a>}
        </div>
        {scene.operationName && <button disabled={isRendering || disabled} className="text-xs text-amber-300 underline" onClick={() => { update(scene.id, { operationName: null, status: 'idle', error: null }); onNotify('Operação desvinculada. Um novo clique em Gerar enviará um novo pedido ao Google.', 'info'); }}>Descartar vínculo com o pedido anterior</button>}
      </div>)}
    </div>
  </div>;
}
