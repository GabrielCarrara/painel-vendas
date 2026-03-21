import dayjs from 'dayjs';

const MESES_NOME_PT_UPPER = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

/**
 * Primeiro dia do mês a partir de `YYYY-MM` (valor típico de `<input type="month">`).
 * Evita parsing inconsistente de `YYYY-MM` sem o dia.
 */
export function dayjsMesRef(yyyyMm) {
  if (!yyyyMm) return dayjs();
  const s = String(yyyyMm).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return dayjs(`${s}-01`);
  return dayjs(yyyyMm);
}

/** Nome do mês em português, maiúsculas, a partir de `YYYY-MM` ou data. */
export function nomeMesPortuguesUpper(yyyyMmOuData) {
  const d = dayjsMesRef(yyyyMmOuData);
  if (!d.isValid()) return '';
  const idx = d.month();
  return MESES_NOME_PT_UPPER[idx] || d.format('MMMM').toUpperCase();
}

export const PERCENT_CHEIA = [0.006, 0.003, 0.003, 0.003];
export const PERCENT_MEIA = [0.003, 0.0015, 0.0015, 0.0015];

/** Só considera "cheia" se o texto for exatamente (case-insensitive) "cheia". */
export function isParcelaCheia(venda) {
  const p = venda?.parcela != null ? String(venda.parcela).trim().toLowerCase() : '';
  return p === 'cheia';
}

/** Mês em que a comissão da P1 entra (mês seguinte ao da venda). */
export function mesReferenciaComissaoP1(mesVenda) {
  if (!mesVenda) return dayjs().format('YYYY-MM');
  return dayjsMesRef(mesVenda).add(1, 'month').format('YYYY-MM');
}

/** Comissão apenas P1–P3 (P4/P5 não têm comissão). */
export function valorComissaoParcela(venda, parcelaIndex) {
  if (parcelaIndex > 3) return 0;
  const pct = isParcelaCheia(venda) ? PERCENT_CHEIA : PERCENT_MEIA;
  const i = parcelaIndex - 1;
  const valor = parseFloat(venda.valor) || 0;
  return valor * pct[i];
}

export function valorComissaoP1(venda) {
  return valorComissaoParcela(venda, 1);
}

/** Normaliza `v.mes` para YYYY-MM. */
export function normalizarMesVenda(mes) {
  if (!mes) return '';
  const s = String(mes).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return dayjs(`${s}-01`).format('YYYY-MM');
  return dayjs(mes).format('YYYY-MM');
}

/** Mês anterior a YYYY-MM (ex.: 2026-03 → 2026-02). */
export function mesAnteriorYYYYMM(yyyyMm) {
  if (!yyyyMm) return dayjs().subtract(1, 'month').format('YYYY-MM');
  const s = String(yyyyMm).trim();
  const base = /^\d{4}-\d{2}$/.test(s) ? dayjs(`${s}-01`) : dayjs(yyyyMm);
  if (!base.isValid()) return dayjs().subtract(1, 'month').format('YYYY-MM');
  return base.subtract(1, 'month').format('YYYY-MM');
}

/**
 * Comissão P1 que o vendedor **recebe** no mês `mesRecebimento` (YYYY-MM).
 * Regra de negócio: a P1 das vendas do mês X é recebida no mês X+1.
 * Então, no card do mês M somamos P1 apenas das vendas com `v.mes === M-1`
 * (e P1 ainda PAGO). Não usa pagamentos_comissao para o total do card.
 */
export function totalComissaoP1RecebidaNoMes(vendas, usuarioId, mesRecebimento) {
  const mesVendaAlvo = mesAnteriorYYYYMM(mesRecebimento);
  let total = 0;
  (vendas || []).forEach((v) => {
    if (v.usuario_id !== usuarioId) return;
    if (normalizarMesVenda(v.mes) !== mesVendaAlvo) return;
    if (v.status_parcela_1 !== 'PAGO') return;
    total += valorComissaoParcela(v, 1);
  });
  return total;
}

/** Chave estável para cruzar venda.id com pagamentos_comissao.venda_id (string vs number). */
function chaveIdVenda(id) {
  if (id == null || id === '') return '';
  return String(id);
}

/** Mapa id → venda tolerante a tipos mistos nas chaves. */
function mapaVendasPorIdNormalizado(vendasPorId) {
  const m = {};
  if (!vendasPorId || typeof vendasPorId !== 'object') return m;
  Object.values(vendasPorId).forEach((v) => {
    if (v && v.id != null) m[chaveIdVenda(v.id)] = v;
  });
  return m;
}

/**
 * Soma P2 e P3 a partir de pagamentos_comissao no mês de pagamento (mês em que P2/P3 foi conferido PAGO).
 * Só conta se a venda **ainda** estiver com P2/P3 = PAGO — evita total vindo de registro órfão
 * no banco (ex.: linha antiga em pagamentos_comissao após mudança de status).
 * P1 do card não entra aqui — use totalComissaoP1RecebidaNoMes.
 */
export function totaisPagamentosP2P3(pagamentos, usuarioId, vendasPorId) {
  const uid = usuarioId != null ? String(usuarioId) : '';
  const mapaVendas = mapaVendasPorIdNormalizado(vendasPorId);
  const filtrados = (pagamentos || []).filter((p) => String(p.usuario_id) === uid);
  let p2 = 0;
  let p3 = 0;
  filtrados.forEach((p) => {
    if (p.parcela_index !== 2 && p.parcela_index !== 3) return;
    const venda = mapaVendas[chaveIdVenda(p.venda_id)];
    if (!venda) return;
    const statusParcela = venda[`status_parcela_${p.parcela_index}`];
    if (statusParcela !== 'PAGO') return;
    const v = valorComissaoParcela(venda, p.parcela_index);
    if (p.parcela_index === 2) p2 += v;
    if (p.parcela_index === 3) p3 += v;
  });
  return {
    totalComissaoP2Liberada: p2,
    totalComissaoP3Liberada: p3,
  };
}

/**
 * Estorno no mês de referência: P1 estava PAGO e o diretor marcou ESTORNO em P2–P5
 * naquele mês (mes_conferencia). O valor descontado é a comissão da P1 (uma vez por venda).
 */
export function calcularEstornoMes(vendasDoVendedor, mesReferencia) {
  let totalEstorno = 0;
  const itens = [];
  (vendasDoVendedor || []).forEach((v) => {
    if (v.status_parcela_1 !== 'PAGO') return;
    const p1 = valorComissaoP1(v);
    let contouVenda = false;
    for (let n = 2; n <= 5; n++) {
      const st = v[`status_parcela_${n}`];
      const mesConf = v[`mes_conferencia_parcela_${n}`];
      if (st === 'ESTORNO' && mesConf === mesReferencia) {
        itens.push({
          vendaId: v.id,
          cliente: v.cliente,
          parcela: n,
          valorEstornoComissaoP1: p1,
        });
        if (!contouVenda) {
          totalEstorno += p1;
          contouVenda = true;
        }
      }
    }
  });
  return { totalEstorno, itens };
}

/**
 * Atualiza status da parcela, mes_conferencia e sincroniza pagamentos_comissao.
 * Requer colunas mes_conferencia_parcela_1..5 na tabela vendas (ver sql/supabase-comissoes.sql).
 *
 * Regra P2/P3: `mes_pagamento` = **mês atual da conferência** (data de hoje), não o mês do filtro
 * de vendas — assim, ao conferir vendas de fevereiro em março, a comissão entra no card de março.
 * P1 segue mês seguinte ao da venda (mesReferenciaComissaoP1).
 */
export async function persistirMudancaStatusParcela(supabase, venda, parcelaIndex, novoStatus, statusAntigo) {
  const mesRef = dayjs().format('YYYY-MM');
  const nomeColuna = `status_parcela_${parcelaIndex}`;
  const antigo = statusAntigo || 'PENDENTE';

  if (antigo === novoStatus) return { ok: true };

  // P1 CANCELADO → cancela P2–P5 e remove todos os pagamentos desta venda
  if (parcelaIndex === 1 && novoStatus === 'CANCELADO') {
    const updates = {
      status_parcela_1: 'CANCELADO',
      status_parcela_2: 'CANCELADO',
      status_parcela_3: 'CANCELADO',
      status_parcela_4: 'CANCELADO',
      status_parcela_5: 'CANCELADO',
    };
    for (let i = 1; i <= 5; i++) {
      updates[`mes_conferencia_parcela_${i}`] = mesRef;
    }
    const { error } = await supabase.from('vendas').update(updates).eq('id', venda.id);
    if (error) return { ok: false, error };
    await supabase.from('pagamentos_comissao').delete().eq('venda_id', venda.id);
    return { ok: true };
  }

  const patch = {
    [nomeColuna]: novoStatus,
    [`mes_conferencia_parcela_${parcelaIndex}`]: mesRef,
  };

  const { error: updateError } = await supabase.from('vendas').update(patch).eq('id', venda.id);
  if (updateError) return { ok: false, error: updateError };

  // Remove comissão registrada se saiu de PAGO (P1–P4 podem ter registro legado em P4)
  if (antigo === 'PAGO' && parcelaIndex <= 4) {
    await supabase.from('pagamentos_comissao').delete().eq('venda_id', venda.id).eq('parcela_index', parcelaIndex);
  }

  if (novoStatus === 'PAGO' && parcelaIndex <= 3) {
    const valor = valorComissaoParcela(venda, parcelaIndex);
    if (valor > 0) {
      const mesPagamento =
        parcelaIndex === 1 ? mesReferenciaComissaoP1(venda.mes) : mesRef;
      const { error: insErr } = await supabase.from('pagamentos_comissao').insert({
        venda_id: venda.id,
        usuario_id: venda.usuario_id,
        parcela_index: parcelaIndex,
        valor_comissao: valor,
        mes_pagamento: mesPagamento,
      });
      if (insErr) return { ok: false, error: insErr };
    }
  }

  // P4/P5 não geram comissão — remove registros órfãos
  if ((parcelaIndex === 4 || parcelaIndex === 5) && novoStatus === 'PAGO') {
    await supabase.from('pagamentos_comissao').delete().eq('venda_id', venda.id).eq('parcela_index', parcelaIndex);
  }

  return { ok: true };
}
