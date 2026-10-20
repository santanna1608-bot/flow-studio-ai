export async function requestJson(path, body) {
  let response;
  try {
    response = await fetch(path, body ? { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Não foi possível conectar ao servidor do app. Verifique se npm run dev está ativo na porta 5173 e tente novamente.');
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error(`O servidor do app retornou uma página em vez dos dados esperados (HTTP ${response.status}). Verifique se npm run dev está ativo na porta 5173 e tente novamente.`);
  }
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Falha ao acessar o serviço (HTTP ${response.status}).`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Resposta inválida do servidor do app. Tente novamente.');
  return data;
}
