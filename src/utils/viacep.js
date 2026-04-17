import { apenasDigitos } from './documentosFormat';

/**
 * @param {string} cep
 * @returns {Promise<{ ok: boolean, localidade?: string, uf?: string, erro?: string }>}
 */
export async function buscarEnderecoPorCep(cep) {
  const d = apenasDigitos(cep);
  if (d.length !== 8) {
    return { ok: false, erro: 'CEP deve ter 8 dígitos.' };
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return { ok: false, erro: 'Não foi possível consultar o CEP.' };
    const data = await res.json();
    if (data.erro) return { ok: false, erro: 'CEP não encontrado.' };
    return {
      ok: true,
      localidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return { ok: false, erro: 'Erro de rede ao consultar o CEP.' };
  }
}
