import { drawCaptions } from './captions.js';
export const sceneDuration = s => Math.max(1, Number(s.duration) || 5);
export const filmDuration = scenes => scenes.reduce((sum, s) => sum + sceneDuration(s), 0);
export function locateScene(scenes, time) {
  let start = 0;
  for (let index = 0; index < scenes.length; index++) {
    if (time < start + sceneDuration(scenes[index]) || index === scenes.length - 1) return { scene: scenes[index], index, start, localTime: Math.max(0, time - start) };
    start += sceneDuration(scenes[index]);
  }
  return { scene: null, index: 0, start: 0, localTime: 0 };
}
export function drawFrame(ctx, w, h, scene, localTime, media, accent = '#f59e0b', captions, time = localTime) {
  ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, w, h);
  if (media && (media.videoWidth || media.naturalWidth)) {
    const mw = media.videoWidth || media.naturalWidth, mh = media.videoHeight || media.naturalHeight;
    const scale = Math.max(w / mw, h / mh) * (media.naturalWidth ? 1 + Math.min(1, localTime / sceneDuration(scene)) * 0.08 : 1);
    ctx.drawImage(media, (w - mw * scale) / 2, (h - mh * scale) / 2, mw * scale, mh * scale);
    if (media.videoWidth) { drawCaptions(ctx, w, h, time, captions); return; }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0a0c10'); gradient.addColorStop(1, accent);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff44';
    for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc((i * 137 + localTime * 12) % w, (i * 191) % h, 3, 0, 7); ctx.fill(); }
  }
  const p = w * 0.05, size = Math.round(w / 36), top = h * 0.58;
  ctx.fillStyle = '#000b'; ctx.fillRect(0, top, w, h - top);
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.fillText((scene?.shotNumber || 1) + '. ' + (scene?.title || 'Adicione uma cena'), p, top + size * 1.8, w - p * 2);
  ctx.font = Math.round(size * 0.75) + 'px sans-serif';
  let line = '', y = top + size * 3.2;
  for (const word of (scene?.prompt || 'Edite o roteiro para começar.').split(/\s+/)) {
    if (ctx.measureText(line + word).width > w - p * 2 && line) {
      ctx.fillText(line, p, y); y += size * 1.15; line = '';
      if (y > h - size * 2.5) break;
    }
    line += word + ' ';
  }
  if (y <= h - size * 2.5) ctx.fillText(line, p, y);
  ctx.fillStyle = '#ddd'; ctx.font = Math.round(size * 0.55) + 'px sans-serif';
  ctx.fillText('STORYBOARD • imagem e texto animados', p, h - size, w - p * 2);
  drawCaptions(ctx, w, h, time, captions);
}
export async function prepareVisuals(scenes, characters = []) {
  const assets = new Map(), urls = [];
  const dispose = () => { assets.forEach(m => { if (m.tagName === 'VIDEO') { m.pause(); m.removeAttribute('src'); m.load(); } }); urls.forEach(u => URL.revokeObjectURL(u)); };
  try {
    await Promise.all(scenes.map(async scene => {
      const url = scene.videoFile ? URL.createObjectURL(scene.videoFile) : scene.generatedVideoUrl;
      if (scene.videoFile) urls.push(url);
      if (url) {
        const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto';
        assets.set(scene.id, video);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => finish(new Error('Tempo esgotado ao carregar ' + scene.title)), 30000);
          const finish = error => { clearTimeout(timeout); video.onloadeddata = null; video.onerror = null; if (error) reject(error); else resolve(); };
          video.onloadeddata = () => finish();
          video.onerror = () => finish(new Error('Não foi possível carregar o vídeo da cena ' + scene.shotNumber + '. Importe ou gere novamente.'));
          video.src = url;
        });
      } else {
        const source = characters.find(c => c.tag === scene.characterTag)?.avatarUrl;
        if (!source?.startsWith('data:image/')) return;
        const image = new Image(); image.src = source; await image.decode(); assets.set(scene.id, image);
      }
    }));
    return { assets, dispose };
  } catch (error) { dispose(); throw error; }
}
