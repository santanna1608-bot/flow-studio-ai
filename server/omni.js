import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function buildOmniRequest(input, model = 'gemini-omni-1.1-flash') {
  if (!input || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 12000) throw new Error('Informe um prompt de até 12.000 caracteres.');
  if (!['16:9', '9:16'].includes(input.aspectRatio)) throw new Error('Formato de vídeo inválido.');
  const duration = Number(input.duration ?? 8);
  if (!Number.isFinite(duration) || duration < 1 || duration > 8) throw new Error('A duração da cena deve estar entre 1 e 8 segundos.');
  // Omni controls timing through the prompt; there is no fabricated duration parameter.
  const prompt = `${input.prompt.trim()}\nCreate a single continuous shot, no scene cuts. Aim for ${duration} seconds of video.`;
  let content = prompt;
  if (input.referenceImage) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.referenceImage);
    if (!match || match[2].length > 7_000_000) throw new Error('Envie uma referência PNG, JPEG ou WebP de até 5 MB.');
    content = [{ type: 'image', mime_type: match[1], data: match[2] }, { type: 'text', text: prompt }];
  }
  return { model, input: content, background: false, stream: false, store: false, response_format: { type: 'video', aspect_ratio: input.aspectRatio, resolution: '1080p', delivery: 'uri' } };
}

export function extractOmniVideo(result) {
  return result.output_video || result.steps?.filter(step => step.type === 'model_output').flatMap(step => step.content || []).find(content => content.type === 'video');
}

export function omniFileId(uri) {
  if (typeof uri !== 'string') throw new Error('O Omni Flash não retornou um endereço de vídeo válido.');
  const match = /^(?:https:\/\/generativelanguage\.googleapis\.com\/v1beta\/)?files\/([a-zA-Z0-9_-]+)(?::download)?(?:\?[^#]*)?$/.exec(uri);
  if (!match) throw new Error('Endereço de vídeo Omni Flash inesperado.');
  return match[1];
}

export function createOmniService({ mediaDirectory, requestGoogle, cacheVideo, model = () => 'gemini-omni-1.1-flash' }) {
  const running = new Map();
  const jobPath = id => resolve(mediaDirectory, `${id}.json`);
  const media = id => {
    const hash = createHash('sha256').update(id).digest('hex');
    return { path: resolve(mediaDirectory, `${hash}.mp4`), url: `/api/media/${hash}.mp4` };
  };
  const save = async (id, job) => {
    await mkdir(mediaDirectory, { recursive: true });
    const temporary = jobPath(id) + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, JSON.stringify(job));
    try {
      for (let attempt = 0; ; attempt++) {
        try { await rename(temporary, jobPath(id)); break; }
        catch (error) {
          // Windows scanners and concurrent readers may briefly hold the destination.
          if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 7) throw error;
          await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
        }
      }
    } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  };
  const generate = async input => {
    const payload = buildOmniRequest(input, model());
    const id = 'omni-' + randomUUID();
    const job = { status: 'generating', model: payload.model, createdAt: Date.now() };
    await save(id, job);
    // Keep the long Google request on the server. No prompt, image or key is written to the job file.
    const work = (async () => {
      try {
        const result = await requestGoogle('interactions', { method: 'POST', body: JSON.stringify(payload) }, 10 * 60 * 1000);
        if (result.status === 'failed' || result.status === 'cancelled') throw new Error('A geração falhou ou foi bloqueada pelo Omni Flash.');
        const video = extractOmniVideo(result);
        if (!video) throw new Error('O Omni Flash não retornou vídeo. Verifique conteúdo e acesso ao modelo.');
        if (video.mime_type && video.mime_type !== 'video/mp4') throw new Error('O Omni Flash retornou um formato de vídeo inesperado.');
        if (video.uri) {
          await save(id, { ...job, status: 'processing', fileId: omniFileId(video.uri) });
        } else if (typeof video.data === 'string' && video.data.length <= 350_000_000 && /^[A-Za-z0-9+/=\s]+$/.test(video.data)) {
          const bytes = Buffer.from(video.data, 'base64');
          if (!bytes.length) throw new Error('O Omni Flash retornou um vídeo vazio.');
          await writeFile(media(id).path, bytes);
          await save(id, { ...job, status: 'ready' });
        } else throw new Error('O Omni Flash não retornou dados de vídeo válidos.');
      } catch (error) {
        const message = error.name === 'TimeoutError'
          ? 'O Omni Flash não respondeu no prazo. O pedido pode continuar no Google; não foi enviado novamente.'
          : error.message === 'fetch failed' ? 'Falha de conexão com o Omni Flash. O pedido não foi reenviado automaticamente.' : error.message;
        await save(id, { ...job, status: 'error', error: message });
      }
    })().catch(() => { /* A disk failure is reported by the status route; never log request data. */ }).finally(() => running.delete(id));
    running.set(id, work);
    return { operationName: id, provider: 'omni', model: payload.model };
  };
  const status = async id => {
    if (!/^omni-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id || '')) throw new Error('Operação Omni Flash inválida.');
    if (existsSync(media(id).path)) return { done: true, videoUrl: media(id).url, provider: 'omni' };
    if (!existsSync(jobPath(id))) throw new Error('Pedido Omni Flash não encontrado neste servidor.');
    const job = JSON.parse(await readFile(jobPath(id), 'utf8'));
    if (job.status === 'error') throw new Error(job.error);
    if (job.status === 'generating') {
      if (!running.has(id)) throw new Error('O servidor reiniciou durante o pedido Omni Flash. O pedido pode continuar no Google; confira sua conta antes de gerar novamente.');
      return { done: false, stage: 'generating', provider: 'omni' };
    }
    if (job.status !== 'processing') throw new Error('Vídeo Omni Flash indisponível.');
    const file = await requestGoogle(`files/${job.fileId}`);
    const state = typeof file.state === 'string' ? file.state : file.state?.name;
    if (state === 'FAILED') {
      await save(id, { ...job, status: 'error', error: 'O processamento do vídeo falhou no Omni Flash.' });
      throw new Error('O processamento do vídeo falhou no Omni Flash.');
    }
    if (state !== 'ACTIVE') return { done: false, stage: 'processing', provider: 'omni' };
    await cacheVideo(id, `https://generativelanguage.googleapis.com/v1beta/files/${job.fileId}:download?alt=media`, media(id).path);
    await save(id, { ...job, status: 'ready' });
    return { done: true, videoUrl: media(id).url, provider: 'omni', model: job.model };
  };
  return { generate, status };
}
