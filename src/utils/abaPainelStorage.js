/** Persiste a aba ativa do painel para sobreviver a remounts (ex.: refresh de token). */

export function lerAbaPainel(storageKey, abasValidas, fallback = 'vendas') {
  try {
    const salva = sessionStorage.getItem(storageKey);
    if (salva && Array.isArray(abasValidas) && abasValidas.includes(salva)) return salva;
    if (salva && !abasValidas) return salva;
  } catch (_) {
    /* ignore */
  }
  return fallback;
}

export function salvarAbaPainel(storageKey, abaId) {
  try {
    sessionStorage.setItem(storageKey, abaId);
  } catch (_) {
    /* ignore */
  }
}
