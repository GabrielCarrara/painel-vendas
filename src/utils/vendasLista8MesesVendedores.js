import dayjs from 'dayjs';
import { normalizarMesVenda } from './comissoes';

export function obterIntervaloUltimos8MesesFechados() {
  const mesAtual = dayjs().startOf('month');
  const mesInicio = mesAtual.subtract(8, 'month').format('YYYY-MM');
  const mesFim = mesAtual.subtract(1, 'month').format('YYYY-MM');
  return { mesInicio, mesFim };
}

/**
 * Mesma base de dados do Excel "vendas vendedores 8 meses" (filtro de filial + cargo Vendedor).
 * @param {{ vendasTodas: object[], usuarios: object[], filialId: string }} params
 * @returns {{ linhas: { v: object, m: string }[], mesInicio: string, mesFim: string } | { erro: string }}
 */
export function filtrarVendasVendedoresUltimos8Meses({ vendasTodas, usuarios, filialId }) {
  const { mesInicio, mesFim } = obterIntervaloUltimos8MesesFechados();
  const usuariosBase = filialId
    ? usuarios.filter((u) => String(u.id_filial) === String(filialId))
    : usuarios;

  const idsVendedores = new Set(
    usuariosBase
      .filter((u) => (u.cargo || '').toLowerCase().trim() === 'vendedor')
      .map((u) => u.id)
  );

  if (idsVendedores.size === 0) {
    return { erro: 'Nenhum usuário com cargo Vendedor encontrado para o filtro de filial atual.' };
  }

  const linhas = (vendasTodas || [])
    .filter((v) => v && idsVendedores.has(v.usuario_id))
    .map((v) => {
      const m = normalizarMesVenda(v.mes);
      return { v, m };
    })
    .filter(({ m }) => m >= mesInicio && m <= mesFim);

  if (linhas.length === 0) {
    return {
      erro: `Nenhuma venda de vendedores no período de ${mesInicio} a ${mesFim} (mês atual excluído).`,
    };
  }

  return { linhas, mesInicio, mesFim };
}

/** Mesma ordenação do botão Excel no PainelDiretor. */
export function ordenarLinhasComoExcel(linhas, nomeVendedorFn) {
  return [...linhas].sort((a, b) => {
    if (a.m !== b.m) return b.m.localeCompare(a.m);
    const na = nomeVendedorFn(a.v.usuario_id);
    const nb = nomeVendedorFn(b.v.usuario_id);
    if (na !== nb) return na.localeCompare(nb, 'pt-BR');
    return String(a.v.cliente || '').localeCompare(String(b.v.cliente || ''), 'pt-BR');
  });
}

/**
 * Clientes únicos GAZIN com grupo/cota para busca na intranet Gazin.
 * @param {{ linhas: { v: object, m: string }[], nomeVendedorFn: (id: string) => string }} params
 */
export function montarClientesGazinUnicos8Meses({ linhas, nomeVendedorFn }) {
  const ordenadas = ordenarLinhasComoExcel(linhas, nomeVendedorFn);
  const mapa = new Map();
  for (const { v, m } of ordenadas) {
    const admin = String(v.administradora || '').toUpperCase().trim();
    if (admin !== 'GAZIN') continue;
    const grupo = String(v.grupo ?? '').trim();
    const cota = String(v.cota ?? '').trim();
    if (!grupo || !cota) continue;
    const key = `${grupo}|${cota}`;
    if (mapa.has(key)) continue;
    mapa.set(key, {
      grupo,
      cota,
      cliente: String(v.cliente || '').toUpperCase(),
      mesReferencia: m,
      vendedor: nomeVendedorFn(v.usuario_id),
    });
  }
  return Array.from(mapa.values());
}
