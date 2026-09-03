import dayjs from 'dayjs';
import logoFenix from '../assets/logo.png';

const STATUS_LABEL = {
  NOVO: 'NOVO',
  ATENDIMENTO_INICIAL: 'ATENDIMENTO INICIAL',
  ATENDIMENTO_VENDEDOR: 'ATENDIMENTO COM VENDEDOR',
  FECHAMENTO_VENDA: 'FECHAMENTO DE VENDA',
  LEAD_FRIO: 'LEAD FRIO',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDt(value) {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '—';
}

function fmtData(value) {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
}

function cardHtml(lead) {
  const status = STATUS_LABEL[lead.status] || lead.status || '—';
  return `
    <article class="card">
      <header class="card-head">
        <div>
          <h2>${escapeHtml((lead.nome || '').toUpperCase())}</h2>
          <span class="badge">${escapeHtml(status)}</span>
        </div>
        <div class="meta-right">Linha ${escapeHtml(lead.sheet_row_index ?? '—')}</div>
      </header>
      <div class="grid">
        <div><span class="lbl">Telefone</span><div>${escapeHtml(lead.telefone || '—')}</div></div>
        <div><span class="lbl">E-mail</span><div>${escapeHtml(lead.email || '—')}</div></div>
        <div><span class="lbl">Data do lead</span><div>${escapeHtml(fmtDt(lead.data_lead))}</div></div>
        <div><span class="lbl">Faixa etária</span><div>${escapeHtml(lead.faixa_etaria || '—')}</div></div>
        <div><span class="lbl">Já fez consórcio</span><div>${escapeHtml(lead.ja_fez_consorcio || '—')}</div></div>
        <div><span class="lbl">Procurando empréstimo</span><div>${escapeHtml(lead.procurando_emprestimo || '—')}</div></div>
        <div><span class="lbl">Renda familiar</span><div>${escapeHtml(lead.renda_familiar || '—')}</div></div>
        <div><span class="lbl">Conjunto</span><div>${escapeHtml(lead.conjunto || '—')}</div></div>
        <div><span class="lbl">1º contato</span><div>${escapeHtml(fmtDt(lead.data_primeiro_contato))}</div></div>
        <div><span class="lbl">P/ vendedor em</span><div>${escapeHtml(fmtDt(lead.data_atendimento_vendedor))}</div></div>
        <div><span class="lbl">Fechamento em</span><div>${escapeHtml(fmtDt(lead.data_fechamento))}</div></div>
        <div><span class="lbl">Lead frio em</span><div>${escapeHtml(fmtDt(lead.data_lead_frio))}</div></div>
      </div>
      <div class="obs">
        <div><span class="lbl">Descrição — atendimento inicial</span><p>${escapeHtml(lead.descricao_atendimento_inicial || '—')}</p></div>
        <div><span class="lbl">Observação — atendimento com vendedor</span><p>${escapeHtml(lead.observacao_vendedor || '—')}</p></div>
        <div><span class="lbl">Observação — fechamento</span><p>${escapeHtml(lead.observacao_fechamento || '—')}</p></div>
        <div><span class="lbl">Observação — lead frio</span><p>${escapeHtml(lead.observacao_frio || '—')}</p></div>
      </div>
    </article>`;
}

export function exportarRelatorioLeadsV4({
  leads = [],
  periodoInicio,
  periodoFim,
  statusFiltro,
  tituloExtra = '',
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Permita pop-ups no navegador para exportar o relatório.');
    return false;
  }

  const ordenados = [...leads].sort((a, b) => {
    const ai = Number(a.sheet_row_index);
    const bi = Number(b.sheet_row_index);
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
    return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  });

  const porStatus = {};
  ordenados.forEach((l) => {
    const st = l.status || 'NOVO';
    if (!porStatus[st]) porStatus[st] = [];
    porStatus[st].push(l);
  });

  const resumo = Object.keys(STATUS_LABEL)
    .map((st) => {
      const qtd = (porStatus[st] || []).length;
      return `<div class="stat"><strong>${qtd}</strong><span>${escapeHtml(STATUS_LABEL[st])}</span></div>`;
    })
    .join('');

  const corpo = ordenados.length
    ? Object.keys(STATUS_LABEL)
        .filter((st) => (porStatus[st] || []).length > 0)
        .map((st) => {
          const cards = (porStatus[st] || []).map(cardHtml).join('');
          return `<section class="bloco">
            <h2 class="sec-title">${escapeHtml(STATUS_LABEL[st])} <small>${(porStatus[st] || []).length}</small></h2>
            ${cards}
          </section>`;
        })
        .join('')
    : '<p class="empty">Nenhum lead encontrado para o filtro selecionado.</p>';

  const periodoTxt =
    periodoInicio || periodoFim
      ? `${fmtData(periodoInicio || null)} até ${fmtData(periodoFim || null)}`
      : 'Todos os períodos';
  const statusTxt = statusFiltro ? STATUS_LABEL[statusFiltro] || statusFiltro : 'Todas as classificações';
  const geradoEm = dayjs().format('DD/MM/YYYY HH:mm');
  const logoSrc = logoFenix || `${window.location.origin}/logo.png`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório Leads V4 Company</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2937;
      background: #f3f4f6;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #fff;
      padding: 28px 30px 36px;
      min-height: 100vh;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { height: 58px; width: auto; object-fit: contain; }
    .brand h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 0.02em;
      color: #111827;
    }
    .brand p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .stamp {
      text-align: right;
      font-size: 12px;
      color: #4b5563;
      line-height: 1.45;
    }
    .filters {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .chip {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .chip span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6366f1; margin-bottom: 2px; }
    .chip strong { font-size: 13px; color: #111827; }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 22px;
    }
    .stat {
      background: linear-gradient(180deg, #f8fafc, #eef2ff);
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 10px 8px;
      text-align: center;
    }
    .stat strong { display: block; font-size: 20px; color: #312e81; }
    .stat span { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .sec-title {
      margin: 22px 0 10px;
      font-size: 14px;
      color: #312e81;
      border-left: 4px solid #6366f1;
      padding-left: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .sec-title small {
      display: inline-block;
      margin-left: 8px;
      background: #312e81;
      color: #fff;
      border-radius: 999px;
      padding: 1px 8px;
      font-size: 11px;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 14px 10px;
      margin-bottom: 12px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      page-break-inside: avoid;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 8px;
    }
    .card-head h2 { margin: 0 0 6px; font-size: 15px; color: #111827; }
    .badge {
      display: inline-block;
      background: #312e81;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      border-radius: 999px;
      padding: 3px 8px;
    }
    .meta-right { font-size: 11px; color: #9ca3af; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 10px;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .lbl {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
      margin-bottom: 2px;
    }
    .obs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 12px;
    }
    .obs > div {
      background: #f9fafb;
      border-radius: 8px;
      padding: 8px 10px;
      border: 1px solid #f3f4f6;
    }
    .obs p { margin: 0; white-space: pre-wrap; color: #374151; line-height: 1.4; }
    .empty { color: #6b7280; padding: 24px 0; text-align: center; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #fff; }
      .sheet { padding: 0; max-width: none; box-shadow: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <img src="${logoSrc}" alt="Fênix Consórcios" />
        <div>
          <h1>Relatório Leads V4 Company</h1>
          <p>Fênix Consórcios${tituloExtra ? ` — ${escapeHtml(tituloExtra)}` : ''}</p>
        </div>
      </div>
      <div class="stamp">
        <div><strong>${escapeHtml(String(ordenados.length))}</strong> lead(s)</div>
        <div>Gerado em ${escapeHtml(geradoEm)}</div>
      </div>
    </div>

    <div class="filters">
      <div class="chip"><span>Período</span><strong>${escapeHtml(periodoTxt)}</strong></div>
      <div class="chip"><span>Classificação</span><strong>${escapeHtml(statusTxt)}</strong></div>
      <div class="chip"><span>Exportação</span><strong>Status atual + observações</strong></div>
    </div>

    <div class="stats">${resumo}</div>
    ${corpo}

    <div class="footer">
      <span>Documento interno — Fênix Consórcios</span>
      <span>Leads V4 Company</span>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 350);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

export { STATUS_LABEL };
