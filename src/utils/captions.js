export const CAPTION_STYLES = { classic: 'Clássica', box: 'Caixa escura', social: 'Destaque amarelo', karaoke: 'Karaokê por palavra' };
export function alignmentWords(alignment) {
  if (!Array.isArray(alignment?.characters)) return [];
  const words = []; let text = '', start = 0, end = 0;
  alignment.characters.forEach((char, i) => {
    if (/\s/.test(char)) { if (text) words.push({ text, start, end }); text = ''; }
    else { if (!text) start = alignment.character_start_times_seconds[i]; text += char; end = alignment.character_end_times_seconds[i]; }
  });
  if (text) words.push({ text, start, end });
  return words.filter(w => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start);
}
export function groupWords(words, count = 6) {
  const cues = [];
  for (let i = 0; i < words.length; i += count) { const group = words.slice(i, i + count); cues.push({ start: group[0].start, end: group.at(-1).end, text: group.map(w => w.text).join(' '), words: group }); }
  return cues;
}
const timestamp = n => { const ms = Math.round(Math.max(0, n) * 1000); return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map(x => String(x).padStart(2, '0')).join(':') + ',' + String(ms % 1000).padStart(3, '0'); };
export function toSrt(cues) { return cues.map((c, i) => `${i + 1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`).join('\n'); }
export function parseSrt(text) {
  const number = s => s.split(/[:,.]/).reduce((n, v, i) => n + Number(v) * [3600, 60, 1, .001][i], 0);
  const cues = text.trim().split(/\r?\n\s*\r?\n/).map(block => {
    const match = block.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})[^\n]*\r?\n([\s\S]+)/);
    return match && { start: number(match[1]), end: number(match[2]), text: match[3].trim() };
  });
  if (!cues.length || cues.some(c => !c || c.end <= c.start || !c.text)) throw new Error('SRT inválido. Use blocos com início, fim e texto.');
  return cues;
}
export function drawCaptions(ctx, w, h, time, captions) {
  if (!captions?.style) return;
  const cue = captions.cues?.find(c => time >= c.start && time < c.end);
  if (!cue) return;
  ctx.save();
  const size = Math.round(w * (w < h ? .048 : .031)), maxWidth = w * .84;
  ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = []; let line = '';
  const words = cue.text.split(/\s+/);
  for (const word of words) { if (line && ctx.measureText(line + ' ' + word).width > maxWidth) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word; }
  if (line) lines.push(line);
  const y = h * .84 - (lines.length - 1) * size * .65;
  lines.forEach((text, i) => {
    const top = y + i * size * 1.3;
    if (captions.style === 'box') { ctx.fillStyle = '#000c'; const width = ctx.measureText(text).width; ctx.fillRect((w - width) / 2 - size * .4, top - size * .65, width + size * .8, size * 1.3); }
    ctx.lineWidth = size * .12; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(text, w / 2, top);
    ctx.fillStyle = captions.style === 'social' ? '#fde047' : '#fff'; ctx.fillText(text, w / 2, top);
    if (captions.style === 'karaoke' && cue.words) {
      let x = (w - ctx.measureText(text).width) / 2;
      for (const word of text.split(' ')) {
        const active = cue.words.find(v => v.text === word && time >= v.start && time < v.end);
        if (active) { ctx.textAlign = 'left'; ctx.fillStyle = '#fde047'; ctx.fillText(word, x, top); ctx.textAlign = 'center'; }
        x += ctx.measureText(word + ' ').width;
      }
    }
  });
  ctx.restore();
}
