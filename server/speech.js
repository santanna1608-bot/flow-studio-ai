import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { alignmentWords, groupWords } from '../src/utils/captions.js';

export async function eleven(path, options = {}) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Configure ELEVENLABS_API_KEY em .env.local e reinicie o servidor.');
  const response = await fetch('https://api.elevenlabs.io/' + (path.startsWith('v2/') ? path : 'v1/' + path), {
    ...options, headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(180000)
  });
  if (!response.ok) {
    const messages = { 401: 'Chave ElevenLabs inválida ou sem permissão.', 403: 'Sem acesso a este recurso ElevenLabs. Confira o plano e as permissões da chave.', 429: 'Limite ElevenLabs atingido. Aguarde antes de tentar novamente.' };
    throw new Error(messages[response.status] || `ElevenLabs rejeitou o pedido (HTTP ${response.status}). Confira o texto, a voz e seus créditos.`);
  }
  try { return await response.json(); } catch { throw new Error('ElevenLabs retornou uma resposta inválida. Tente novamente mais tarde.'); }
}
export async function listVoices(cursor) {
  const data = await eleven('v2/voices?page_size=100' + (cursor ? '&next_page_token=' + encodeURIComponent(cursor) : ''));
  if (!Array.isArray(data?.voices)) throw new Error('ElevenLabs não retornou um catálogo de vozes válido. Tente novamente.');
  return { voices: (data.voices || []).map(v => ({ id: v.voice_id, name: v.name, gender: v.labels?.gender || '', accent: v.labels?.accent || '', description: v.description || '' })), next: data.next_page_token || null };
}
export async function generateAvatar(input, directory) {
  const image = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.image || '');
  const audio = /^\/api\/media\/([a-f0-9]{64}\.mp3)$/.exec(input.audioUrl || '');
  if (!image || image[2].length > 7000000 || !audio) throw new Error('Envie uma imagem local de até 5 MB e gere a fala primeiro.');
  const bytes = await readFile(resolve(directory, audio[1]));
  const data = await eleven('flows/video', { method: 'POST', body: JSON.stringify({ model_id: 'creatify-aurora', image: { type: 'inline_base64', mime_type: image[1], content_base64: image[2] }, audio: { type: 'inline_base64', mime_type: 'audio/mpeg', content_base64: bytes.toString('base64') }, resolution: '720p' }) });
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id || '')) throw new Error('ElevenLabs não retornou um pedido válido.');
  return { id: data.id };
}
export async function avatarStatus(id, directory) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id || '')) throw new Error('Pedido de lipsync inválido.');
  const hash = createHash('sha256').update('eleven-avatar:' + id).digest('hex');
  const destination = resolve(directory, hash + '.mp4'), videoUrl = '/api/media/' + hash + '.mp4';
  if (existsSync(destination)) return { done: true, videoUrl };
  const data = await eleven('flows/video/' + id);
  if (data.status === 'failed') throw new Error('A geração de lipsync falhou na ElevenLabs. Confira a imagem, créditos e acesso ao modelo.');
  if (data.status !== 'completed') return { done: false };
  const url = new URL(data.content_url);
  if (url.protocol !== 'https:' || !(url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('.elevenlabs.io') || url.hostname.endsWith('.elevenlabs.net'))) throw new Error('O servidor recebeu um endereço de mídia não reconhecido.');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error('Falha ao baixar lipsync. Retome o pedido para tentar baixar novamente.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 200 * 1024 * 1024) throw new Error('Vídeo retornado inválido.');
  await mkdir(directory, { recursive: true }); await writeFile(destination, bytes);
  return { done: true, videoUrl };
}
export async function createSpeech(input, limit = 5000) {
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > limit) throw new Error(`Informe uma fala de até ${limit.toLocaleString('pt-BR')} caracteres.`);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(input.voiceId || '')) throw new Error('Selecione uma voz.');
  const data = await eleven('text-to-speech/' + input.voiceId + '/with-timestamps?output_format=mp3_44100_128', { method: 'POST', body: JSON.stringify({ text: input.text.trim(), model_id: 'eleven_multilingual_v2' }) });
  if (!data.audio_base64) throw new Error('ElevenLabs não retornou áudio.');
  const bytes = Buffer.from(data.audio_base64, 'base64');
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error('Áudio retornado inválido.');
  return { bytes, cues: groupWords(alignmentWords(data.normalized_alignment || data.alignment)) };
}
export async function generateSpeech(input, directory) {
  const { bytes, cues } = await createSpeech(input);
  const id = createHash('sha256').update(randomUUID()).digest('hex');
  await mkdir(directory, { recursive: true }); await writeFile(resolve(directory, id + '.mp3'), bytes);
  return { audioUrl: '/api/media/' + id + '.mp3', cues };
}
