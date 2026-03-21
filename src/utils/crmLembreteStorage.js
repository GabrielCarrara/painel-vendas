/** Prefixo das chaves em sessionStorage usadas pelo lembrete de retorno de leads. */
export const CRM_RETORNO_STORAGE_PREFIX = 'fenix_crm_retorno_alerta_';

/** Chama no logout e após login bem-sucedido para o lembrete voltar a aparecer na próxima entrada no painel. */
export function limparFlagsLembreteRetorno() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CRM_RETORNO_STORAGE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
