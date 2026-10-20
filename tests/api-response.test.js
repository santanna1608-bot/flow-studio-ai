import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../src/utils/api.js';

test('catálogo: respostas de texto, HTML e falhas de conexão têm mensagens úteis', async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [200, 404, 502]) {
      globalThis.fetch = async () => new Response('The page could not be found. private-response', { status });
      await assert.rejects(requestJson('/api/speech/voices'), error => error.message.includes('porta 5173') && error.message.includes('HTTP ' + status) && !error.message.includes('private-response') && !error.message.includes('Unexpected token'));
    }
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(requestJson('/api/speech/voices'), /conectar ao servidor/);
    globalThis.fetch = async () => Response.json({ error: 'Permissão de vozes ausente.' }, { status: 403 });
    await assert.rejects(requestJson('/api/speech/voices'), /Permissão de vozes ausente/);
    globalThis.fetch = async () => Response.json({ voices: [{ id: 'voice1' }] });
    assert.equal((await requestJson('/api/speech/voices')).voices[0].id, 'voice1');
  } finally { globalThis.fetch = original; }
});
