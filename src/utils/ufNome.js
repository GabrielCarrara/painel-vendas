/** Nome completo do estado por sigla (uso em textos formais). */
export const NOME_ESTADO_POR_UF = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export function nomeEstadoPorUf(uf) {
  if (!uf) return '';
  const k = String(uf).trim().toUpperCase();
  return NOME_ESTADO_POR_UF[k] || k;
}

/** Siglas das UFs em ordem alfabética (para selects). */
export const SIGLAS_UF_BR = Object.keys(NOME_ESTADO_POR_UF).sort();
