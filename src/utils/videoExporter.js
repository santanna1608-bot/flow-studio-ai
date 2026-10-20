import { drawFrame, filmDuration, locateScene, prepareVisuals, clipPlaybackTime } from './film.js';
import { prepareAudioBuffer } from './audioEngine.js';
export function chooseRecordingType(Recorder = globalThis.MediaRecorder) {
  if (!Recorder) throw new Error('Este navegador não suporta gravação. Use Chrome ou Edge atualizado.');
  const mimeType = ['video/mp4;codecs=avc1.42001E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => Recorder.isTypeSupported(t));
  if (!mimeType) throw new Error('Nenhum formato de gravação compatível.');
  return { mimeType, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
}
export async function exportUnifiedFilm({ scenes, aspectRatio, currentTrack, captions, characters, accent, signal, exactExport, onProgress, onComplete, onError }) {
  let ctx, stream, source, visuals, timer, recorder, wakeLock, abortHandler, visibilityHandler;
  try {
    if (!scenes.length) throw new Error('Adicione ao menos uma cena.');
    signal?.throwIfAborted();
    const { mimeType, extension: recordedExtension } = chooseRecordingType(), canvas = document.createElement('canvas');
    let extension = recordedExtension;
    canvas.width = aspectRatio === '16:9' ? 1920 : 1080; canvas.height = aspectRatio === '16:9' ? 1080 : 1920;
    if (!canvas.captureStream) throw new Error('Este navegador não permite capturar vídeo.');
    const drawing = canvas.getContext('2d');
    ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
    const dest = ctx.createMediaStreamDestination(), buffer = await prepareAudioBuffer(ctx, currentTrack);
    visuals = await prepareVisuals(scenes, characters); signal?.throwIfAborted();
    if (document.hidden) throw new Error('Mantenha esta aba visível durante a exportação.');
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
    source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true; source.connect(dest);
    stream = canvas.captureStream(30); dest.stream.getTracks().forEach(t => stream.addTrack(t));
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000, audioBitsPerSecond: 192000 });
    const duration = filmDuration(scenes), chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    let activeMedia, fail;
    const stopped = new Promise((resolve, reject) => {
      let failure;
      fail = error => { failure = error; if (recorder.state !== 'inactive') recorder.stop(); else reject(error); };
      recorder.onerror = () => fail(new Error('Falha no codificador de vídeo.'));
      recorder.onstop = () => failure ? reject(failure) : resolve();
      abortHandler = () => fail(new DOMException('Exportação cancelada.', 'AbortError'));
      visibilityHandler = () => { if (document.hidden) fail(new Error('Exportação interrompida: mantenha a aba visível e tente novamente.')); };
      signal?.addEventListener('abort', abortHandler, { once: true }); document.addEventListener('visibilitychange', visibilityHandler);
    });
    const first = locateScene(scenes, 0);
    drawFrame(drawing, canvas.width, canvas.height, first.scene, 0, visuals.assets.get(first.scene.id), accent, captions, 0);
    const recordingStarted = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('O gravador não iniciou. Tente novamente.')), 15000);
      recorder.onstart = () => { clearTimeout(timeout); resolve(); };
    });
    recorder.start(250);
    await recordingStarted;
    signal?.throwIfAborted();
    source.start(); const startedAt = ctx.currentTime;
    const tick = () => {
      try {
        if (recorder.state === 'inactive') return;
        const time = ctx.currentTime - startedAt;
        if (time >= duration) { recorder.stop(); return; }
        const { scene, localTime } = locateScene(scenes, time), media = visuals.assets.get(scene.id);
        if (activeMedia !== media) { activeMedia?.pause?.(); activeMedia = media; }
        if (media?.tagName === 'VIDEO') {
          const target = clipPlaybackTime(localTime, media.duration);
          if (Math.abs(media.currentTime - target) > 0.25) media.currentTime = target;
          if (media.paused && !media.ended) media.play().catch(() => fail(new Error('Não foi possível reproduzir um clipe durante a exportação.')));
        }
        drawFrame(drawing, canvas.width, canvas.height, scene, localTime, media, accent, captions, time);
        onProgress(Math.min(94, Math.floor(time / duration * 94))); timer = setTimeout(tick, 1000 / 30);
      } catch (error) { fail(error); }
    };
    tick(); await stopped;
    if (!chunks.length) throw new Error('A gravação não produziu dados.');
    source.stop(); source = null;
    stream.getTracks().forEach(track => track.stop()); stream = null;
    visuals.dispose(); visuals = null;
    await ctx.close();
    let blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
    if (exactExport) {
      onProgress(95);
      const response = await fetch('/api/export/finalize?duration=' + duration, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, signal });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Falha na finalização do MP4.'); }
      blob = await response.blob(); extension = 'mp4';
    }
    const downloadUrl = URL.createObjectURL(blob);
    onProgress(100); onComplete({ blob, downloadUrl, extension, totalDuration: duration });
  } catch (error) { onError(error.message || 'Falha na exportação.'); }
  finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abortHandler);
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    try { source?.stop(); } catch { /* stopped */ }
    stream?.getTracks().forEach(t => t.stop()); visuals?.dispose();
    if (ctx && ctx.state !== 'closed') await ctx.close();
    try { await wakeLock?.release(); } catch { /* released */ }
  }
}
