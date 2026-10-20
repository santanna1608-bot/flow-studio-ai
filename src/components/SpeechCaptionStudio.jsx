import { useState, useRef, useEffect } from 'react';
import { CAPTION_STYLES, parseSrt, toSrt } from '../utils/captions';
import { videoDuration } from '../utils/videoProviders';
import { requestJson as api } from '../utils/api';

const field = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm';
const button = 'px-3 py-2 rounded-lg bg-slate-700 text-xs disabled:opacity-40';
function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function VoiceForm({ value, onChange, voices, busy, onGenerate, label, maxCharacters = 5000 }) {
  const filtered = voices.filter(v => !value.gender || v.gender.toLowerCase() === value.gender);
  return <div className="space-y-3">
    <label className="block text-xs">{label}<textarea aria-label={label} className={field + ' mt-1'} rows={3} maxLength={maxCharacters} value={value.text || ''} onChange={e => onChange({ ...value, text: e.target.value, audioUrl: null, cues: [] })} placeholder="Digite somente o texto que será falado…" /><span className="text-slate-400">{(value.text || '').length}/{maxCharacters} caracteres</span></label>
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="text-xs">Tipo de voz<select aria-label={'Tipo de voz — ' + label} className={field + ' mt-1'} value={value.gender || ''} onChange={e => onChange({ ...value, gender: e.target.value, voiceId: '', audioUrl: null, cues: [] })}><option value="">Escolha</option><option value="male">Masculina</option><option value="female">Feminina</option><option value="neutral">Neutra</option></select></label>
      <label className="text-xs">Voz ElevenLabs<select aria-label={'Voz — ' + label} className={field + ' mt-1'} value={value.voiceId || ''} onChange={e => onChange({ ...value, voiceId: e.target.value, audioUrl: null, cues: [] })}><option value="">Selecione uma voz</option>{filtered.map(v => <option key={v.id} value={v.id}>{v.name}{v.accent ? ' · ' + v.accent : ''}</option>)}</select></label>
    </div>
    <button className={button + ' bg-cyan-700'} disabled={busy || !value.text?.trim() || !value.voiceId || value.text.length > maxCharacters} onClick={onGenerate}>Gerar voz — {label}</button>
    {value.audioUrl && <div className="flex flex-wrap items-center gap-3"><audio aria-label={'Ouvir — ' + label} controls src={value.audioUrl} className="max-w-full h-10" /><a className="text-xs text-cyan-300 underline" href={value.audioUrl} download="fala.mp3">Baixar MP3</a></div>}
  </div>;
}
export default function SpeechCaptionStudio({ scenes, onUpdateScenes, characters, narration, onNarration, captions, onCaptions, disabled, onBusy, onNotify }) {
  const [voices, setVoices] = useState([]), [next, setNext] = useState(null), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [srt, setSrt] = useState('');
  const polling = useRef(false);
  const [avatarRunning, setAvatarRunning] = useState(false);
  const [config, setConfig] = useState(null);
  useEffect(() => { let alive = true; api('/api/config').then(data => { if (alive) setConfig(data); }).catch(() => {}); return () => { alive = false; }; }, []);
  const maxCharacters = config?.maxSpeechCharacters || 5000;
  const duration = scenes.reduce((sum, s) => sum + (Number(s.duration) || 5), 0);
  const updateScene = (id, values) => onUpdateScenes(prev => prev.map(s => s.id === id ? { ...s, ...values } : s));
  const run = async task => { setBusy(true); onBusy(true); setStatus('Processando…'); try { await task(); setStatus('Concluído.'); } catch (e) { setStatus(e.message); onNotify(e.message, 'error'); } finally { setBusy(false); onBusy(false); } };
  const loadVoices = more => run(async () => { const data = await api('/api/speech/voices' + (more && next ? '?cursor=' + encodeURIComponent(next) : '')); setVoices(prev => more ? [...prev, ...data.voices.filter(v => !prev.some(p => p.id === v.id))] : data.voices); setNext(data.next); });
  const speak = (value, done) => run(async () => {
    const data = await api('/api/speech/generate', { text: value.text, voiceId: value.voiceId });
    const audio = new Audio(data.audioUrl);
    const length = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Tempo esgotado ao carregar a voz.')), 15000); audio.onloadedmetadata = () => { clearTimeout(timer); resolve(audio.duration); }; audio.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível carregar a voz gerada.')); }; });
    audio.removeAttribute('src'); audio.load();
    done({ ...value, ...data, duration: length });
    onNotify('Voz gerada. Ouça antes de aplicar ao filme.', 'success');
  });
  const applyCaptions = () => {
    const cues = (narration.cues || []).map(c => ({ ...c, start: c.start + (Number(narration.start) || 0), end: c.end + (Number(narration.start) || 0), words: c.words?.map(w => ({ ...w, start: w.start + (Number(narration.start) || 0), end: w.end + (Number(narration.start) || 0) })) }));
    let start = 0;
    for (const scene of scenes) { for (const cue of scene.speech?.cues || []) { if (cue.start >= scene.duration) continue; cues.push({ ...cue, start: start + cue.start, end: start + Math.min(cue.end, scene.duration), words: cue.words?.map(w => ({ ...w, start: start + w.start, end: start + w.end })) }); } start += Number(scene.duration) || 5; }
    if (!cues.length) { onNotify('Gere uma voz para obter legendas sincronizadas.', 'info'); return; }
    cues.sort((a, b) => a.start - b.start); onCaptions({ ...captions, cues }); setSrt(toSrt(cues)); onNotify('Legendas aplicadas. Escolha um estilo e confira os tempos no SRT.', 'success');
  };
  const avatar = scene => run(async () => {
    polling.current = true; setAvatarRunning(true);
    try {
    let id = scene.avatarOperation;
    if (!id) { const character = characters.find(c => c.tag === scene.characterTag); if (config?.maxReferenceBytes && (character?.avatarUrl?.split(',')[1]?.length || 0) * .75 > config.maxReferenceBytes) throw new Error('Nesta hospedagem, use uma imagem de personagem de até 1 MB.'); const data = await api('/api/lipsync/avatar', { image: character?.avatarUrl, audioUrl: scene.speech?.audioUrl }); id = data.id; updateScene(scene.id, { avatarOperation: id }); }
    setStatus('Lipsync em processamento. O pedido usa créditos ElevenLabs.');
    // One poll per ten seconds, as required by the provider. A pending ID is retained for resumption.
    const deadline = Date.now() + 20 * 60000;
    while (Date.now() < deadline && polling.current) {
      const data = await api('/api/lipsync/status?id=' + encodeURIComponent(id));
      if (data.done) { const length = await videoDuration(data.videoUrl); updateScene(scene.id, { generatedVideoUrl: data.videoUrl, videoFile: null, status: 'ready', sourceDuration: length, lipsynced: true, avatarOperation: null, needsRegeneration: false, generatedProvider: 'elevenlabs', operationName: null }); onNotify('Personagem com lipsync adicionado à cena.', 'success'); return; }
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    throw new Error('O lipsync ainda está processando. Use Retomar lipsync para consultar o mesmo pedido.');
    } finally { setAvatarRunning(false); polling.current = false; }
  });
  return <div><fieldset disabled={disabled || busy} className="bg-[#12151c] border border-slate-800 rounded-2xl p-5 space-y-5">
    <h2 className="font-bold text-sm uppercase">Vozes, legendas e lipsync — ElevenLabs</h2>
    <p className="text-xs text-slate-400">{config?.deployment === 'vercel' ? 'As chaves são configuradas nas variáveis de ambiente da hospedagem. Nesta versão, use falas de até 1.500 caracteres e imagens de até 1 MB. Baixe suas mídias antes de encerrar a sessão.' : 'Configure ELEVENLABS_API_KEY em .env.local e reinicie o servidor.'} As gerações usam créditos da sua conta. Os campos começam vazios.</p>
    <div className="flex gap-3"><button className={button} onClick={() => loadVoices(false)}>Carregar vozes da minha conta</button>{next && <button className={button} onClick={() => loadVoices(true)}>Mais vozes</button>}</div>
    <section className="border border-slate-800 rounded-xl p-4 space-y-3"><h3 className="text-sm font-bold">Narração do filme</h3>
      <VoiceForm label="Narração" value={narration} onChange={onNarration} voices={voices} busy={busy} maxCharacters={maxCharacters} onGenerate={() => speak(narration, onNarration)} />
      <button className={button} onClick={() => onNarration({})}>Limpar narração</button>
      <label className="block text-xs">Início da narração (segundos)<input aria-label="Início da narração" type="number" min="0" step="0.1" value={narration.start ?? ''} onChange={e => onNarration({ ...narration, start: e.target.value })} className={field + ' mt-1'} /></label>
      {narration.duration + (Number(narration.start) || 0) > duration && <p className="text-xs text-amber-300">A narração ultrapassa o filme e será cortada. Aumente a duração das cenas.</p>}
    </section>
    {scenes.map(scene => <section key={scene.id} className="border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold">Cena {scene.shotNumber} · {scene.title || 'Sem título'}</h3>
      <p className="text-xs text-slate-400">Personagem: {scene.characterTag || 'selecione no roteiro'}. Uma fala por cena; crie outras cenas para alternar personagens.</p>
      <fieldset disabled={!!scene.avatarOperation} className="space-y-3"><VoiceForm label={'Fala da cena ' + scene.shotNumber} value={scene.speech || {}} voices={voices} busy={busy} maxCharacters={maxCharacters} onChange={speech => updateScene(scene.id, { speech, lipsynced: false })} onGenerate={() => speak(scene.speech, speech => updateScene(scene.id, { speech, lipsynced: false }))} />
      <button className={button} onClick={() => updateScene(scene.id, { speech: {}, lipsynced: false })}>Limpar fala da cena {scene.shotNumber}</button></fieldset>
      {scene.speech?.duration > scene.duration && <p className="text-xs text-amber-300">A fala ultrapassa esta cena e será cortada na montagem. Aumente a duração da cena ou encurte o texto.</p>}
      <div className="flex flex-wrap gap-3"><button className={button} disabled={!scene.avatarOperation && (!scene.speech?.audioUrl || !characters.find(c => c.tag === scene.characterTag)?.avatarUrl?.startsWith('data:image/'))} onClick={() => avatar(scene)}>{scene.avatarOperation ? 'Retomar lipsync' : 'Gerar personagem falando a partir da imagem'}</button>
        <a className="text-xs text-cyan-300 underline self-center" href="https://elevenlabs.io/app/image-video" target="_blank" rel="noreferrer">Lipsync de vídeo pronto na ElevenLabs ↗</a></div>
      <p className="text-xs text-slate-400">Imagem + voz: Creatify Aurora via API, saída 720p. Vídeo pronto (incluindo Veo/Omni): baixe a fala e o clipe, faça o lipsync no painel ElevenLabs e importe o resultado nesta cena.</p>
      {scene.avatarOperation && <button className={button} onClick={() => { updateScene(scene.id, { avatarOperation: null }); onNotify('Vínculo removido. O pedido enviado pode continuar e consumir créditos. Uma nova geração enviará outro pedido.', 'info'); }}>Desvincular pedido de lipsync</button>}
      <label className="flex gap-2 items-center text-xs"><input type="checkbox" checked={!!scene.lipsynced} onChange={e => updateScene(scene.id, { lipsynced: e.target.checked })} />Usar áudio do clipe com lipsync (evita duplicar a fala)</label>
    </section>)}
    <section className="border border-slate-800 rounded-xl p-4 space-y-3"><h3 className="text-sm font-bold">Legendas</h3>
      <label className="text-xs block">Estilo de legenda<select aria-label="Estilo de legenda" className={field + ' mt-1'} value={captions.style} onChange={e => onCaptions({ ...captions, style: e.target.value })}><option value="">Sem legenda</option>{Object.entries(CAPTION_STYLES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <button className={button} onClick={applyCaptions}>Gerar legendas das vozes com tempos reais</button>
      <label className="text-xs block">Legendas em SRT — texto e tempos editáveis<textarea aria-label="Legendas em SRT" rows={6} className={field + ' mt-1 font-mono'} value={srt} onChange={e => setSrt(e.target.value)} placeholder="Cole seu SRT ou gere as legendas das vozes…" /></label>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={!srt.trim()} onClick={() => { try { onCaptions({ ...captions, cues: parseSrt(srt) }); onNotify('SRT aplicado ao filme.', 'success'); } catch (e) { onNotify(e.message, 'error'); } }}>Aplicar SRT editado</button><button className={button} disabled={!captions.cues.length} onClick={() => download(new Blob([toSrt(captions.cues)], { type: 'text/plain;charset=utf-8' }), 'legendas.srt')}>Baixar SRT</button><button className={button} onClick={() => { onCaptions({ style: '', cues: [] }); setSrt(''); }}>Limpar legendas</button></div>
      <p className="text-xs text-slate-400">O estilo aparece na prévia e fica gravado no vídeo exportado. SRT mantém somente texto e tempos. Karaokê usa tempos por palavra das vozes geradas; SRT importado exibe a frase inteira. Se alterar o áudio ou a duração das cenas, gere e aplique as legendas novamente. Evite sobrepor narração e falas.</p>
    </section>
    {status && <p role="status" className="text-xs text-cyan-200">{status}</p>}
  </fieldset>{avatarRunning && <button className={button + ' mt-3'} onClick={() => { polling.current = false; setStatus('Parando acompanhamento. O pedido ElevenLabs pode continuar; use Retomar lipsync.'); }}>Parar acompanhamento do lipsync</button>}</div>;
}
