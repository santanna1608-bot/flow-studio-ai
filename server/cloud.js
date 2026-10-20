import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { body, buildVeoRequest, createApiMiddleware, google } from './api.js';
import { buildOmniRequest, extractOmniVideo, omniFileId } from './omni.js';
import { createSpeech, eleven, listVoices } from './speech.js';

const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const googleKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const secret = () => {
  const value = process.env.FLOW_MEDIA_SECRET || googleKey() || process.env.ELEVENLABS_API_KEY;
  if (!value) throw new Error('Configure as chaves do serviço nas variáveis de ambiente da Vercel.');
  return createHash('sha256').update('flow-media-v1:' + value).digest();
};
export function seal(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ ...value, expires: Date.now() + 12 * 3600000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal(token, kind) {
  try {
    if (!/^[A-Za-z0-9_-]{40,8000}$/.test(token || '')) throw new Error();
    const data = Buffer.from(token, 'base64url'), decipher = createDecipheriv('aes-256-gcm', secret(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const value = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    if (value.kind !== kind || value.expires < Date.now()) throw new Error();
    return value;
  } catch { throw new Error('Link de mídia inválido ou expirado. Consulte o pedido novamente.'); }
}
const mediaUrl = value => '/api/media?token=' + seal({ kind: 'media', ...value });
function trusted(url, googleOnly = false) {
  const host = url.hostname;
  return url.protocol === 'https:' && (host === 'generativelanguage.googleapis.com' || !googleOnly && (host === 'storage.googleapis.com' || host.endsWith('.googleusercontent.com') || host.endsWith('.googlevideo.com') || host.endsWith('.elevenlabs.io') || host.endsWith('.elevenlabs.net')));
}
async function streamVideo(req, res, token) {
  const item = unseal(token, 'media');
  let target;
  if (item.provider === 'eleven') {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(item.id || '')) throw new Error('Pedido inválido.');
    const data = await eleven('flows/video/' + item.id);
    if (data.status !== 'completed') throw new Error('Vídeo ainda não disponível.');
    target = new URL(data.content_url);
  } else if (item.provider === 'google') target = new URL(item.uri);
  else throw new Error('Provedor de mídia inválido.');
  if (!trusted(target, item.provider === 'google')) throw new Error('Endereço de mídia inesperado.');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 240000);
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', disconnected);
  try {
    let response;
    for (let hop = 0; hop < 6; hop++) {
      const headers = {};
      if (target.hostname === 'generativelanguage.googleapis.com') headers['x-goog-api-key'] = googleKey();
      if (req.headers.range) headers.Range = req.headers.range;
      response = await fetch(target, { headers, redirect: 'manual', signal: controller.signal });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirecionamento de mídia inválido.');
      target = new URL(location, target);
      if (!trusted(target)) throw new Error('Redirecionamento de mídia inesperado.');
    }
    if (response.status === 416) { res.writeHead(416, { 'Content-Range': response.headers.get('content-range') || 'bytes */*' }); return res.end(); }
    if (!response.ok || !response.body) throw new Error('Não foi possível baixar o vídeo. Consulte o pedido novamente.');
    const headers = { 'Content-Type': 'video/mp4', 'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
    for (const name of ['content-length', 'content-range']) if (response.headers.get(name)) headers[name] = response.headers.get(name);
    res.writeHead(response.status, headers);
    for await (const chunk of response.body) {
      if (controller.signal.aborted || res.destroyed) break;
      if (!res.write(chunk)) await new Promise(resolve => {
        const done = () => { res.removeListener('drain', done); res.removeListener('close', done); resolve(); };
        res.once('drain', done); res.once('close', done);
      });
    }
    res.end();
  } finally { clearTimeout(timeout); res.removeListener('close', disconnected); }
}

// All cloud state is held by the providers or encrypted in expiring links.
// No media or jobs depend on a serverless instance's temporary filesystem.
export function createCloudHandler() {
  let local;
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'https://localhost');
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) return send(res, 403, { error: 'Origem não permitida.' });
      if (req.method === 'GET' && url.pathname === '/api/config') return send(res, 200, {
        deployment: 'vercel', elevenlabsConfigured: !!process.env.ELEVENLABS_API_KEY, veoConfigured: !!googleKey(), omniConfigured: !!googleKey(), typesafeConfigured: !!process.env.TYPESAFE_API_KEY,
        model: process.env.VEO_MODEL || 'veo-3.1-generate-preview', omniModel: process.env.OMNI_MODEL || 'gemini-omni-1.1-flash', exactExport: false, maxSpeechCharacters: 1500, maxReferenceBytes: 1000000
      });
      if (req.method === 'GET' && url.pathname === '/api/speech/voices') return send(res, 200, await listVoices(url.searchParams.get('cursor')));
      if (req.method === 'GET' && url.pathname === '/api/media') return await streamVideo(req, res, url.searchParams.get('token'));
      if (req.method === 'GET' && url.pathname === '/api/veo/status') {
        const name = url.searchParams.get('operation');
        if (!/^models\/veo-[A-Za-z0-9.-]+\/operations\/[A-Za-z0-9_-]+$/.test(name || '')) throw new Error('Operação inválida.');
        const result = await google(name);
        if (result.error) throw new Error('A geração falhou no Veo. Confira conteúdo, cotas e permissões.');
        if (!result.done) return send(res, 200, { done: false });
        const uri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri || !trusted(new URL(uri), true)) throw new Error('O Veo não retornou um endereço de vídeo válido.');
        return send(res, 200, { done: true, videoUrl: mediaUrl({ provider: 'google', uri }) });
      }
      if (req.method === 'GET' && url.pathname === '/api/omni/status') {
        const operation = url.searchParams.get('operation') || '';
        if (!operation.startsWith('omni-cloud-')) throw new Error('Este pedido pertence ao servidor local e não pode ser retomado na Vercel.');
        const { fileId } = unseal(operation.slice(11), 'omni');
        if (!/^[A-Za-z0-9_-]+$/.test(fileId || '')) throw new Error('Arquivo inválido.');
        const file = await google('files/' + fileId, {}, 'Omni Flash'), state = typeof file.state === 'string' ? file.state : file.state?.name;
        if (state === 'FAILED') throw new Error('O processamento do vídeo Omni Flash falhou.');
        return send(res, 200, state === 'ACTIVE' ? { done: true, videoUrl: mediaUrl({ provider: 'google', uri: 'https://generativelanguage.googleapis.com/v1beta/files/' + fileId + ':download?alt=media' }) } : { done: false });
      }
      if (req.method === 'GET' && url.pathname === '/api/lipsync/status') {
        const id = url.searchParams.get('id');
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(id || '')) throw new Error('Pedido de lipsync inválido.');
        const data = await eleven('flows/video/' + id);
        if (data.status === 'failed') throw new Error('O lipsync falhou na ElevenLabs. Confira imagem, créditos e acesso ao modelo.');
        return send(res, 200, data.status === 'completed' ? { done: true, videoUrl: mediaUrl({ provider: 'eleven', id }) } : { done: false });
      }
      if (req.method !== 'POST') return send(res, 404, { error: 'Rota não encontrada.' });
      if (url.pathname === '/api/export/finalize') return send(res, 503, { error: 'A finalização FFmpeg está disponível no servidor local. Na Vercel, exporte pelo navegador.' });
      if (url.pathname === '/api/breakdown') { local ||= createApiMiddleware(); return await local(req, res, () => send(res, 404, { error: 'Rota não encontrada.' })); }
      const input = await body(req);
      if (Buffer.byteLength(JSON.stringify(input)) > 3500000) return send(res, 413, { error: 'Referência muito grande para a hospedagem. Use imagem de até 1 MB e falas curtas.' });
      if (url.pathname === '/api/speech/generate') {
        const { bytes, cues } = await createSpeech(input, 1500);
        const result = { audioUrl: 'data:audio/mpeg;base64,' + bytes.toString('base64'), cues };
        if (Buffer.byteLength(JSON.stringify(result)) > 4200000) throw new Error('A fala ficou grande demais para esta hospedagem. Divida o texto em falas menores.');
        return send(res, 200, result);
      }
      if (url.pathname === '/api/lipsync/avatar') {
        const image = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.image || '');
        const audio = /^data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)$/.exec(input.audioUrl || '');
        if (!image || image[2].length > 1400000 || !audio) throw new Error('Use uma imagem de até 1 MB e uma fala gerada nesta sessão na Vercel.');
        const result = await eleven('flows/video', { method: 'POST', body: JSON.stringify({ model_id: 'creatify-aurora', resolution: '720p', image: { type: 'inline_base64', mime_type: image[1], content_base64: image[2] }, audio: { type: 'inline_base64', mime_type: 'audio/mpeg', content_base64: audio[1] } }) });
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(result.id || '')) throw new Error('ElevenLabs não retornou um pedido válido.');
        return send(res, 202, { id: result.id });
      }
      if (url.pathname === '/api/veo/generate') {
        const result = await google('models/' + (process.env.VEO_MODEL || 'veo-3.1-generate-preview') + ':predictLongRunning', { method: 'POST', body: JSON.stringify(buildVeoRequest(input)) });
        if (!result.name) throw new Error('O Veo não retornou uma operação.');
        return send(res, 202, { operationName: result.name });
      }
      if (url.pathname === '/api/omni/generate') {
        const payload = buildOmniRequest(input, process.env.OMNI_MODEL || 'gemini-omni-1.1-flash');
        let result;
        try { result = await google('interactions', { method: 'POST', body: JSON.stringify(payload) }, 'Omni Flash', 265000); }
        catch (error) { if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('O Omni ultrapassou o prazo da hospedagem. O pedido pode continuar no Google; confira a conta antes de enviar outro.'); throw error; }
        const video = extractOmniVideo(result);
        if (!video?.uri) throw new Error('O Omni não retornou vídeo por URI. Confira a conta antes de enviar outro pedido.');
        return send(res, 202, { operationName: 'omni-cloud-' + seal({ kind: 'omni', fileId: omniFileId(video.uri) }), provider: 'omni' });
      }
      return send(res, 404, { error: 'Rota não encontrada.' });
    } catch (error) {
      if (res.headersSent) return res.destroy();
      const message = error.name === 'TimeoutError' ? 'O serviço demorou para responder. Confira o pedido antes de tentar novamente.' : error.message === 'fetch failed' ? 'Falha de conexão com o provedor. Tente novamente.' : error.code || error instanceof SyntaxError ? 'Não foi possível processar o pedido. Verifique a configuração do servidor.' : error.message;
      send(res, 400, { error: message });
    }
  };
}
