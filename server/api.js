import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createOmniService } from './omni.js';
import { generateSpeech, listVoices, generateAvatar, avatarStatus } from './speech.js';

for (const name of ['.env', '.env.local']) {
  if (existsSync(name)) process.loadEnvFile(name);
}
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const mediaDirectory = resolve(process.env.FLOW_DATA_DIR || '.flow-data/videos');
const googleKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const model = () => process.env.VEO_MODEL || 'veo-3.1-generate-preview';
const omniModel = () => process.env.OMNI_MODEL || 'gemini-omni-1.1-flash';
const run = promisify(execFile);
let encoderCheck;
const hasEncoder = () => encoderCheck ||= run(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { windowsHide: true, timeout: 15000 }).then(() => true, () => { encoderCheck = null; return false; });
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};
export function buildVeoRequest(input) {
  if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 12000) throw new Error('Informe um prompt de até 12.000 caracteres.');
  if (!['16:9', '9:16'].includes(input.aspectRatio)) throw new Error('Formato de vídeo inválido.');
  const instance = { prompt: input.prompt.trim() };
  if (input.referenceImage) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.referenceImage);
    if (!match || match[2].length > 7_000_000) throw new Error('Envie uma referência PNG, JPEG ou WebP de até 5 MB.');
    instance.referenceImages = [{ image: { inlineData: { mimeType: match[1], data: match[2] } }, referenceType: 'asset' }];
  }
  return { instances: [instance], parameters: { aspectRatio: input.aspectRatio, durationSeconds: 8, resolution: '1080p' } };
}
export async function body(req) {
  // Vercel's Node runtime may already have parsed the request body.
  if (req.body !== undefined) {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON inválido.');
    return parsed;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8_000_000) throw new Error('Arquivo muito grande. Limite: 5 MB para a referência.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new Error('JSON inválido.'); }
}
export async function google(path, options = {}, provider = 'Veo', timeout = 60_000) {
  if (!googleKey()) throw new Error('Configure GEMINI_API_KEY nas variáveis de ambiente do servidor.');
  const response = await fetch(`${BASE}/${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey(), ...options.headers }, signal: AbortSignal.timeout(timeout) });
  const result = await response.json();
  if (!response.ok) {
    // Never forward upstream text: it can include credentials or private request data.
    const messages = { 400: `${provider} rejeitou o pedido. Verifique prompt, referência e acesso ao modelo.`, 401: 'Chave Gemini inválida.', 403: `Sem acesso ao ${provider}. Verifique a chave e o faturamento da Gemini API.`, 404: `Modelo ${provider} indisponível para esta conta ou região.`, 429: `Limite do ${provider} atingido. Aguarde antes de tentar novamente.` };
    throw new Error(messages[response.status] || `${provider} indisponível (HTTP ${response.status}).`);
  }
  return result;
}
const downloads = new Map();
async function cacheVideo(name, uri, destination) {
  if (!downloads.has(name)) {
    const promise = (async () => {
      const url = new URL(uri);
      if (url.protocol !== 'https:' || url.hostname !== 'generativelanguage.googleapis.com') throw new Error('Endereço de vídeo inesperado.');
      let response = await fetch(url, { headers: { 'x-goog-api-key': googleKey() }, redirect: 'manual', signal: AbortSignal.timeout(180_000) });
      for (let hop = 0; response.status >= 300 && response.status < 400 && hop < 5; hop++) {
        const target = new URL(response.headers.get('location'), response.url || url);
        if (target.protocol !== 'https:' || !['generativelanguage.googleapis.com', 'storage.googleapis.com'].includes(target.hostname) && !target.hostname.endsWith('.googleusercontent.com') && !target.hostname.endsWith('.googlevideo.com')) throw new Error('Redirecionamento de vídeo inesperado.');
        response = await fetch(target, { headers: target.hostname === 'generativelanguage.googleapis.com' ? { 'x-goog-api-key': googleKey() } : {}, redirect: 'manual', signal: AbortSignal.timeout(180_000) });
      }
      if (!response.ok) throw new Error('Não foi possível baixar o vídeo do provedor. Tente consultar novamente.');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error('O provedor retornou um vídeo vazio.');
      await mkdir(mediaDirectory, { recursive: true });
      await writeFile(destination, bytes);
    })().finally(() => downloads.delete(name));
    downloads.set(name, promise);
  }
  await downloads.get(name);
}
export function createApiMiddleware() {
  const omni = createOmniService({ mediaDirectory, model: omniModel, requestGoogle: (path, options, timeout) => google(path, options, 'Omni Flash', timeout), cacheVideo });
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();
    try {
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) return send(res, 403, { error: 'Origem não permitida.' });
      if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, { elevenlabsConfigured: !!process.env.ELEVENLABS_API_KEY, veoConfigured: !!googleKey(), omniConfigured: !!googleKey(), typesafeConfigured: !!process.env.TYPESAFE_API_KEY, model: model(), omniModel: omniModel(), exactExport: await hasEncoder() });
      if (req.method === 'GET' && url.pathname === '/api/speech/voices') return send(res, 200, await listVoices(url.searchParams.get('cursor')));
      if (req.method === 'POST' && url.pathname === '/api/speech/generate') return send(res, 200, await generateSpeech(await body(req), mediaDirectory));
      if (req.method === 'POST' && url.pathname === '/api/lipsync/avatar') return send(res, 202, await generateAvatar(await body(req), mediaDirectory));
      if (req.method === 'GET' && url.pathname === '/api/lipsync/status') return send(res, 200, await avatarStatus(url.searchParams.get('id'), mediaDirectory));
      if (req.method === 'POST' && url.pathname === '/api/omni/generate') {
        if (!googleKey()) return send(res, 503, { error: 'Configure GEMINI_API_KEY em .env.local para habilitar o Omni Flash.' });
        const result = await omni.generate(await body(req));
        return send(res, 202, result);
      }
      if (req.method === 'GET' && url.pathname === '/api/omni/status') return send(res, 200, await omni.status(url.searchParams.get('operation')));
      if (req.method === 'POST' && url.pathname === '/api/export/finalize') {
        const duration = Number(url.searchParams.get('duration'));
        if (!Number.isFinite(duration) || duration < 1 || duration > 3600) throw new Error('Duração de exportação inválida.');
        if (!await hasEncoder()) return send(res, 503, { error: 'FFmpeg não encontrado. Configure FFMPEG_PATH no servidor para exportação com duração e FPS exatos.' });
        await mkdir(resolve('.flow-data/exports'), { recursive: true });
        const directory = await mkdtemp(resolve('.flow-data/exports/job-'));
        const input = resolve(directory, 'input.video'), output = resolve(directory, 'master.mp4');
        const abort = new AbortController();
        const disconnected = () => { if (!res.writableEnded) abort.abort(); };
        res.on('close', disconnected);
        try {
          let size = 0;
          const chunks = [];
          for await (const chunk of req) { size += chunk.length; if (size > 512 * 1024 * 1024) throw new Error('A exportação excede o limite de 512 MB.'); chunks.push(chunk); }
          if (!size) throw new Error('Gravação vazia.');
          await writeFile(input, Buffer.concat(chunks));
          try {
            await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '2', '-filter_threads', '1', '-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm', '-i', input, '-vf', 'fps=30,tpad=stop_mode=clone:stop_duration=3600', '-af', 'apad', '-t', String(duration), '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '2', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', output], { windowsHide: true, timeout: 10 * 60 * 1000, signal: abort.signal });
          } catch { throw new Error('Falha na finalização MP4. Confira se o FFmpeg tem os codecs H.264 e AAC.'); }
          const bytes = await readFile(output);
          res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': bytes.length });
          res.end(bytes);
        } finally {
          res.removeListener('close', disconnected);
          // The exact mkdtemp result is checked before recursive removal.
          if (directory.startsWith(resolve('.flow-data/exports') + '/') || directory.startsWith(resolve('.flow-data/exports') + '\\')) await rm(directory, { recursive: true, force: true });
        }
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/breakdown') {
        const input = await body(req);
        if (!process.env.TYPESAFE_API_KEY) return send(res, 503, { error: 'TypeSafe não configurado. Usando divisão local por parágrafos.' });
        if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50 || input.lines.some(line => typeof line !== 'string' || line.length > 4000) || !Array.isArray(input.cameras) || !input.cameras.length || input.cameras.length > 30 || !Array.isArray(input.characters) || input.characters.length > 30) throw new Error('Roteiro inválido: limite de 50 cenas, 4.000 caracteres por cena e 30 personagens.');
        const questions = {};
        input.lines.forEach((line, i) => {
          questions[`character${i}`] = { type: 'choice', instructions: `Choose the primary character explicitly present in scene ${i} in state.lines. Choose none when no listed character is present.`, criteria: { none: 'No listed character is present', ...Object.fromEntries(input.characters.map(c => [c.tag, `${c.name}: ${c.role}`])) } };
          questions[`camera${i}`] = { type: 'choice', instructions: `Choose the camera movement best suited to scene ${i} in state.lines.`, criteria: Object.fromEntries(input.cameras.map((c, j) => [`camera${j}`, c])) };
        });
        const response = await fetch('https://api.typesafe.ai/v1/systemone', { method: 'POST', headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'jev-latest', state: { lines: input.lines }, questions }), signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error('TypeSafe indisponível. Usando divisão local por parágrafos.');
        const result = await response.json();
        const selections = input.lines.map((_, i) => {
          const character = result.answers?.[`character${i}`];
          const camera = result.answers?.[`camera${i}`];
          return { characterTag: character?.confidence >= 0.6 && input.characters.some(c => c.tag === character.choice) ? character.choice : '', cameraMovement: camera?.confidence >= 0.6 ? input.cameras[Number(camera.choice?.replace('camera', ''))] : undefined };
        });
        return send(res, 200, { selections, model: result.model });
      }
      if (url.pathname === '/api/veo/generate' && req.method === 'POST') {
        if (!googleKey()) return send(res, 503, { error: 'Configure GEMINI_API_KEY no arquivo .env.local e reinicie o servidor. Não use prefixo VITE_ para segredos.' });
        const payload = buildVeoRequest(await body(req));
        const result = await google(`models/${model()}:predictLongRunning`, { method: 'POST', body: JSON.stringify(payload) });
        if (!result.name) throw new Error('O Veo não retornou uma operação.');
        return send(res, 202, { operationName: result.name });
      }
      if (url.pathname === '/api/veo/status' && req.method === 'GET') {
        const name = url.searchParams.get('operation');
        if (!/^models\/veo-[a-zA-Z0-9.-]+\/operations\/[a-zA-Z0-9_-]+$/.test(name || '')) throw new Error('Operação inválida.');
        const id = createHash('sha256').update(name).digest('hex');
        const destination = resolve(mediaDirectory, `${id}.mp4`);
        const videoUrl = `/api/media/${id}.mp4`;
        if (existsSync(destination)) return send(res, 200, { done: true, videoUrl });
        if (!googleKey()) return send(res, 503, { error: 'Configure GEMINI_API_KEY no servidor.' });
        const result = await google(name);
        if (result.error) throw new Error('A geração falhou no Veo. Verifique conteúdo, cotas e permissões antes de tentar novamente.');
        if (!result.done) return send(res, 200, { done: false });
        const uri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) throw new Error('O Veo não produziu vídeo. A geração pode ter sido bloqueada pelos filtros do serviço.');
        await cacheVideo(name, uri, destination);
        return send(res, 200, { done: true, videoUrl });
      }
      if (req.method === 'GET' && /^\/api\/media\/[a-f0-9]{64}\.(mp4|mp3)$/.test(url.pathname)) {
        const path = resolve(mediaDirectory, url.pathname.split('/').at(-1));
        if (!existsSync(path)) return send(res, 404, { error: 'Vídeo local não encontrado. Gere a cena novamente.' });
        const { size } = await stat(path);
        const range = req.headers.range && /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        const start = range ? Number(range[1]) : 0;
        const end = range && range[2] ? Number(range[2]) : size - 1;
        if (start > end || end >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
        res.writeHead(range ? 206 : 200, { 'Content-Type': path.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
        const bytes = await readFile(path);
        return res.end(bytes.subarray(start, end + 1));
      }
      send(res, 404, { error: 'Rota não encontrada.' });
    } catch (err) {
      if (res.headersSent) return res.destroy();
      send(res, 400, { error: err.name === 'TimeoutError' ? 'O serviço demorou para responder. Tente novamente.' : err.message === 'fetch failed' ? 'Falha de conexão com o serviço. Verifique a rede.' : err.message });
    }
  };
}
