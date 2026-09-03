import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';
import {
  FaFilter,
  FaSearch,
  FaSyncAlt,
  FaSpinner,
  FaTimes,
  FaSave,
  FaTh,
  FaList,
  FaCopy,
  FaCheck,
  FaFileAlt,
  FaUserPlus,
} from 'react-icons/fa';
import { exportarRelatorioLeadsV4 } from '../utils/exportRelatorioLeadsV4';

const COLUNAS = [
  { id: 'NOVO', label: 'NOVO', cor: 'border-sky-500/40' },
  { id: 'ATENDIMENTO_INICIAL', label: 'ATENDIMENTO INICIAL', cor: 'border-amber-500/40' },
  { id: 'ATENDIMENTO_VENDEDOR', label: 'ATENDIMENTO COM VENDEDOR', cor: 'border-indigo-500/40' },
  { id: 'FECHAMENTO_VENDA', label: 'FECHAMENTO DE VENDA', cor: 'border-emerald-500/40' },
  { id: 'LEAD_FRIO', label: 'LEAD FRIO', cor: 'border-slate-500/40' },
];

const COLUNAS_TOPO = COLUNAS.slice(0, 3);
const COLUNAS_BASE = COLUNAS.slice(3);

const PAGE = 35;
const SHEET_PADRAO =
  'https://docs.google.com/spreadsheets/d/1mU29T-Du8DCl2d71nkqy-5x_z1rbZ7SqQd0TwAtxmI4/edit?usp=sharing';
const campoClass =
  'w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide';

function sortLeadsSheet(a, b) {
  const ai = a.sheet_row_index;
  const bi = b.sheet_row_index;
  const aOk = Number.isFinite(Number(ai)) && ai !== null && ai !== '';
  const bOk = Number.isFinite(Number(bi)) && bi !== null && bi !== '';
  if (aOk && bOk && Number(ai) !== Number(bi)) return Number(ai) - Number(bi);
  if (aOk && !bOk) return -1;
  if (!aOk && bOk) return 1;
  return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
}

function isDiretorCargo(cargo) {
  const c = String(cargo || '').toLowerCase().trim();
  return ['diretor', 'sócio-diretor', 'socio-diretor', 'admin'].includes(c);
}

function fmtDt(value) {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '—';
}

function conjuntoBadge(tipo, texto) {
  if (tipo === 'IMOVEL') return { label: 'Imóvel', cls: 'bg-emerald-500/20 text-emerald-300' };
  if (tipo === 'AUTOMOVEL') return { label: 'Automóvel', cls: 'bg-sky-500/20 text-sky-300' };
  if (texto) {
    const curto = String(texto).replace(/^\[.*?\]\s*/g, '').replace(/^\[.*?\]\s*/g, '').trim() || texto;
    return { label: curto.length > 18 ? `${curto.slice(0, 16)}…` : curto, cls: 'bg-gray-600/40 text-gray-300' };
  }
  return null;
}

function patchStatus(lead, status) {
  const now = new Date().toISOString();
  const next = { ...lead, status };
  if (status === 'ATENDIMENTO_INICIAL' && !lead.data_primeiro_contato) next.data_primeiro_contato = now;
  if (status === 'ATENDIMENTO_VENDEDOR' && !lead.data_atendimento_vendedor) next.data_atendimento_vendedor = now;
  if (status === 'FECHAMENTO_VENDA' && !lead.data_fechamento) next.data_fechamento = now;
  if (status === 'LEAD_FRIO' && !lead.data_lead_frio) next.data_lead_frio = now;
  return next;
}

function statusPayload(lead, status) {
  const next = patchStatus(lead, status);
  return {
    status: next.status,
    data_primeiro_contato: next.data_primeiro_contato,
    data_atendimento_vendedor: next.data_atendimento_vendedor,
    data_fechamento: next.data_fechamento,
    data_lead_frio: next.data_lead_frio,
  };
}

export default function LeadsV4Kanban({ usuario, listaUsuarios = [] }) {
  const podeEditar = useMemo(() => isDiretorCargo(usuario?.cargo), [usuario?.cargo]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [config, setConfig] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroConjunto, setFiltroConjunto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [relatorioStatus, setRelatorioStatus] = useState('');
  const [modo, setModo] = useState('kanban');
  const [limites, setLimites] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [telefoneCopiado, setTelefoneCopiado] = useState(false);
  const [modalVincular, setModalVincular] = useState(null);
  const [usuarioVinculoId, setUsuarioVinculoId] = useState('');

  const usuariosAtivos = useMemo(
    () =>
      (listaUsuarios || [])
        .filter((u) => u?.ativo !== false)
        .filter((u) => ['diretor', 'gerente', 'vendedor', 'admin'].includes(String(u.cargo || '').toLowerCase()))
        .slice()
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')),
    [listaUsuarios]
  );

  const carregar = async () => {
    setLoading(true);
    setErro('');
    const [{ data, error }, cfg] = await Promise.all([
      supabase.from('leads_v4_company').select('*').order('sheet_row_index', { ascending: true, nullsFirst: false }),
      supabase.from('leads_v4_config').select('*').eq('id', 1).maybeSingle(),
    ]);
    if (error) setErro(error.message);
    setLeads((data || []).slice().sort(sortLeadsSheet));
    setConfig(cfg.data || null);
    setSheetUrl(cfg.data?.spreadsheet_url || SHEET_PADRAO);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel('leads_v4_company_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_v4_company' },
        (payload) => {
          setLeads((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (payload.eventType === 'DELETE') {
              return list.filter((c) => c.id !== payload.old?.id);
            }
            const rec = payload.new;
            if (!rec?.id) return list;
            const idx = list.findIndex((c) => c.id === rec.id);
            if (idx === -1) return [...list, rec].sort(sortLeadsSheet);
            const next = list.slice();
            next[idx] = { ...next[idx], ...rec };
            next.sort(sortLeadsSheet);
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!podeEditar) return undefined;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      const { data, error } = await supabase.functions.invoke('sync-leads-v4', {
        body: { spreadsheet_url: SHEET_PADRAO },
      });
      busy = false;
      if (!error && data && !data.error) {
        setConfig((prev) => ({
          ...(prev || {}),
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
        }));
      } else if (data?.error) {
        setErro(data.error);
      }
    };
    tick();
    const id = setInterval(tick, 120000);
    return () => clearInterval(id);
  }, [podeEditar]);

  const filtrados = useMemo(() => {
    const txt = busca.trim().toLowerCase();
    const ini = periodoInicio ? dayjs(periodoInicio).startOf('day') : null;
    const fim = periodoFim ? dayjs(periodoFim).endOf('day') : null;
    return (leads || []).filter((l) => {
      if (filtroStatus && l.status !== filtroStatus) return false;
      if (filtroConjunto && l.conjunto_tipo !== filtroConjunto) return false;
      if (ini || fim) {
        const d = l.data_lead ? dayjs(l.data_lead) : null;
        if (!d || !d.isValid()) return false;
        if (ini && d.isBefore(ini)) return false;
        if (fim && d.isAfter(fim)) return false;
      }
      if (!txt) return true;
      const hay = [l.nome, l.telefone, l.email, l.renda_familiar, l.faixa_etaria, l.conjunto, l.descricao_atendimento_inicial, l.observacao_vendedor]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(txt);
    });
  }, [leads, busca, filtroConjunto, filtroStatus, periodoInicio, periodoFim]);

  const leadsRelatorio = useMemo(() => {
    return filtrados.filter((l) => !relatorioStatus || l.status === relatorioStatus);
  }, [filtrados, relatorioStatus]);

  const agrupado = useMemo(() => {
    const map = {};
    COLUNAS.forEach((c) => {
      map[c.id] = [];
    });
    filtrados.forEach((l) => {
      const st = l.status || 'NOVO';
      if (!map[st]) map[st] = [];
      map[st].push(l);
    });
    return map;
  }, [filtrados]);

  const sincronizar = async () => {
    if (!podeEditar) return;
    setSyncing(true);
    setErro('');
    setInfo('');
    const { data, error } = await supabase.functions.invoke('sync-leads-v4', {
      body: { spreadsheet_url: (sheetUrl || SHEET_PADRAO).trim() },
    });
    if (error) {
      setErro(data?.error || error.message || 'Falha ao sincronizar a planilha.');
      setSyncing(false);
      return;
    }
    if (data?.error) {
      setErro(data.error);
      setSyncing(false);
      return;
    }
    setInfo(
      `Sincronizado: ${data?.inserted || 0} novo(s), ${data?.skipped || 0} já existente(s), ${data?.deleted || 0} removido(s).`
    );
    await carregar();
    setSyncing(false);
  };

  const aplicarStatus = async (id, status, abrirDepois = false, extra = {}) => {
    if (!podeEditar) return null;
    const atual = leads.find((l) => l.id === id);
    if (!atual) return null;
    if (atual.status === status && !extra.usuario_vinculado_id && !extra.crm_lead_id) return atual;

    if (status === 'ATENDIMENTO_VENDEDOR' && !extra.crm_lead_id && !atual.crm_lead_id) {
      setModalVincular(atual);
      setUsuarioVinculoId(atual.usuario_vinculado_id || '');
      return null;
    }

    const payload = { ...statusPayload(atual, status), ...extra };
    const anterior = leads;
    const local = { ...atual, ...payload };
    setLeads((prev) => prev.map((l) => (l.id === id ? local : l)));
    const { data, error } = await supabase.from('leads_v4_company').update(payload).eq('id', id).select('*').single();
    if (error) {
      setLeads(anterior);
      setErro(error.message);
      return null;
    }
    setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
    if (abrirDepois) abrirModal(data);
    return data;
  };

  const confirmarVinculoVendedor = async () => {
    if (!podeEditar || !modalVincular) return;
    if (!usuarioVinculoId) {
      setErro('Selecione um usuário para vincular o lead.');
      return;
    }
    setSalvando(true);
    setErro('');
    const lead = modalVincular;
    const now = new Date().toISOString();
    const dataContato = dayjs().format('YYYY-MM-DD');

    let crmLeadId = lead.crm_lead_id || null;
    if (!crmLeadId) {
      const { data: crmLead, error: crmErr } = await supabase
        .from('leads')
        .insert([
          {
            nome: String(lead.nome || '').toUpperCase(),
            telefone: lead.telefone || '',
            origem: 'V4 COMPANY',
            tipo: 'LEAD QUENTE',
            usuario_id: usuarioVinculoId,
            data_contato: dataContato,
            observacao: lead.observacao_vendedor || null,
            v4_lead_id: lead.id,
          },
        ])
        .select('id')
        .single();
      if (crmErr) {
        setErro(crmErr.message);
        setSalvando(false);
        return;
      }
      crmLeadId = crmLead.id;
    } else {
      await supabase
        .from('leads')
        .update({
          usuario_id: usuarioVinculoId,
          tipo: 'LEAD QUENTE',
          origem: 'V4 COMPANY',
          data_contato: dataContato,
          v4_lead_id: lead.id,
        })
        .eq('id', crmLeadId);
    }

    const payload = {
      ...statusPayload(lead, 'ATENDIMENTO_VENDEDOR'),
      usuario_vinculado_id: usuarioVinculoId,
      crm_lead_id: crmLeadId,
      data_atendimento_vendedor: lead.data_atendimento_vendedor || now,
    };
    const { data, error } = await supabase.from('leads_v4_company').update(payload).eq('id', lead.id).select('*').single();
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
    setModalVincular(null);
    setUsuarioVinculoId('');
    setInfo('Lead vinculado e enviado ao CRM como LEAD QUENTE (origem V4 COMPANY).');
    abrirModal(data);
  };

  const onDrop = async (status) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    await aplicarStatus(id, status, true);
  };

  const gerarRelatorio = (modoRelatorio) => {
    const statusEscolhido = modoRelatorio === 'especifico' ? relatorioStatus || filtroStatus : '';
    if (modoRelatorio === 'especifico' && !statusEscolhido) {
      setErro('Selecione uma classificação no seletor do relatório (ou no filtro de etapas) para o relatório específico.');
      return;
    }
    const txt = busca.trim().toLowerCase();
    const ini = periodoInicio ? dayjs(periodoInicio).startOf('day') : null;
    const fim = periodoFim ? dayjs(periodoFim).endOf('day') : null;
    const base = (leads || []).filter((l) => {
      if (statusEscolhido && l.status !== statusEscolhido) return false;
      if (filtroConjunto && l.conjunto_tipo !== filtroConjunto) return false;
      if (ini || fim) {
        const d = l.data_lead ? dayjs(l.data_lead) : null;
        if (!d || !d.isValid()) return false;
        if (ini && d.isBefore(ini)) return false;
        if (fim && d.isAfter(fim)) return false;
      }
      if (!txt) return true;
      const hay = [l.nome, l.telefone, l.email, l.renda_familiar, l.faixa_etaria, l.conjunto, l.descricao_atendimento_inicial, l.observacao_vendedor]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(txt);
    });
    setErro('');
    exportarRelatorioLeadsV4({
      leads: base,
      periodoInicio,
      periodoFim,
      statusFiltro: statusEscolhido || '',
      tituloExtra: modoRelatorio === 'geral' ? 'Relatório geral' : 'Relatório específico',
    });
  };

  const abrirModal = (lead) => {
    setModal(lead);
    setTelefoneCopiado(false);
    setForm({
      descricao_atendimento_inicial: lead.descricao_atendimento_inicial || '',
      observacao_vendedor: lead.observacao_vendedor || '',
      observacao_fechamento: lead.observacao_fechamento || '',
      observacao_frio: lead.observacao_frio || '',
    });
  };

  const copiarTelefone = async () => {
    const numero = String(modal?.telefone || '').trim();
    if (!numero) return;
    try {
      await navigator.clipboard.writeText(numero);
      setTelefoneCopiado(true);
      setTimeout(() => setTelefoneCopiado(false), 1800);
    } catch (_) {
      setErro('Não foi possível copiar o telefone.');
    }
  };

  const salvarObs = async () => {
    if (!podeEditar || !modal) return;
    setSalvando(true);
    setErro('');
    const payload = {
      descricao_atendimento_inicial: form.descricao_atendimento_inicial.trim() || null,
      observacao_vendedor: form.observacao_vendedor.trim() || null,
      observacao_fechamento: form.observacao_fechamento.trim() || null,
      observacao_frio: form.observacao_frio.trim() || null,
    };
    const { data, error } = await supabase.from('leads_v4_company').update(payload).eq('id', modal.id).select('*').single();
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)));
    setModal(data);
  };

  const renderCard = (lead) => {
    const badge = conjuntoBadge(lead.conjunto_tipo, lead.conjunto);
    return (
      <div
        key={lead.id}
        draggable={podeEditar}
        onDragStart={() => setDragId(lead.id)}
        onClick={() => abrirModal(lead)}
        className="rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700/70 px-2.5 py-2 cursor-pointer select-none"
        title={podeEditar ? 'Clique para abrir. Arraste para classificar.' : 'Clique para abrir.'}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-sm truncate">{lead.nome}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 truncate">{lead.telefone || 'Sem telefone'}</div>
            <div className="text-[11px] text-gray-500 truncate">{lead.email || 'Sem e-mail'}</div>
          </div>
          {badge && (
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.cls}`}>{badge.label}</span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 mt-1.5">{fmtDt(lead.data_lead)}</div>
      </div>
    );
  };

  const renderColuna = (col, altura = 'h-[26rem]') => {
    const items = agrupado[col.id] || [];
    const lim = limites[col.id] || PAGE;
    const visiveis = busca ? items : items.slice(0, lim);
    return (
      <section
        key={col.id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDrop(col.id)}
        className={`flex flex-col rounded-xl border bg-gray-900/40 ${col.cor} ${altura}`}
      >
        <header className="shrink-0 px-3 py-2 border-b border-gray-800 flex items-center justify-between gap-2">
          <div className="text-xs font-bold tracking-wide text-gray-200">{col.label}</div>
          <div className="text-[11px] text-gray-500 tabular-nums">{items.length}</div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          {visiveis.map(renderCard)}
          {items.length === 0 && (
            <div className="text-[11px] text-gray-600 py-6 text-center border border-dashed border-gray-700/80 rounded-md">
              Vazio
            </div>
          )}
          {!busca && items.length > lim && (
            <button
              type="button"
              onClick={() => setLimites((p) => ({ ...p, [col.id]: lim + PAGE }))}
              className="w-full text-[11px] py-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-white"
            >
              Ver mais ({items.length - lim})
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="animate-fade-in text-gray-200 flex flex-col gap-3 pb-10">
      <div className="shrink-0 space-y-3 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, telefone, e-mail…"
              className="w-full bg-gray-700 pl-8 pr-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
          >
            <option value="">Todas as etapas</option>
            {COLUNAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filtroConjunto}
            onChange={(e) => setFiltroConjunto(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
          >
            <option value="">Imóvel e automóvel</option>
            <option value="IMOVEL">Imóvel</option>
            <option value="AUTOMOVEL">Automóvel</option>
            <option value="OUTRO">Outro</option>
          </select>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            title="Início do período"
          />
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
            title="Fim do período"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setModo('kanban')}
              className={`px-2.5 py-1.5 rounded-md border text-sm ${modo === 'kanban' ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200' : 'border-gray-600 text-gray-400'}`}
            >
              <FaTh />
            </button>
            <button
              type="button"
              onClick={() => setModo('lista')}
              className={`px-2.5 py-1.5 rounded-md border text-sm ${modo === 'lista' ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200' : 'border-gray-600 text-gray-400'}`}
            >
              <FaList />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <select
            value={relatorioStatus}
            onChange={(e) => setRelatorioStatus(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600"
          >
            <option value="">Relatório: todas as classificações</option>
            {COLUNAS.map((c) => (
              <option key={c.id} value={c.id}>
                Só {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => gerarRelatorio('geral')}
            className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-md text-sm font-semibold"
          >
            <FaFileAlt /> Relatório geral
          </button>
          <button
            type="button"
            onClick={() => gerarRelatorio('especifico')}
            className="inline-flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-600 px-3 py-1.5 rounded-md text-sm font-semibold"
          >
            <FaFileAlt /> Relatório específico
          </button>
          <span className="text-[11px] text-gray-500">
            Exporta {leadsRelatorio.length} lead(s) do filtro atual (período + busca)
            {relatorioStatus ? ` · ${COLUNAS.find((c) => c.id === relatorioStatus)?.label}` : ''}.
          </span>
        </div>

        {podeEditar && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span className="text-emerald-400 font-medium">Planilha V4 Company conectada.</span>
            <span className="text-[11px] text-gray-500 truncate">Novos leads entram sozinhos a cada 2 minutos.</span>
            <button
              type="button"
              onClick={sincronizar}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-3 py-1.5 rounded-md text-sm font-semibold sm:ml-auto"
            >
              {syncing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
              Sincronizar agora
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <FaFilter /> {filtrados.length} lead(s)
          </span>
          {config?.last_sync_at && <span>Última sync: {fmtDt(config.last_sync_at)}</span>}
          {config?.last_sync_error && <span className="text-red-400">{config.last_sync_error}</span>}
        </div>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <FaSpinner className="animate-spin mr-2" /> Carregando leads…
        </div>
      ) : modo === 'kanban' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COLUNAS_TOPO.map((col) => renderColuna(col, 'h-[28rem]'))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COLUNAS_BASE.map((col) => renderColuna(col, 'h-[22rem]'))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 text-[11px] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Telefone</th>
                <th className="text-left px-3 py-2">E-mail</th>
                <th className="text-left px-3 py-2">Caiu em</th>
                <th className="text-left px-3 py-2">Conjunto</th>
                <th className="text-left px-3 py-2">Etapa</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => abrirModal(l)}
                  className="border-t border-gray-800 hover:bg-gray-800/70 cursor-pointer"
                >
                  <td className="px-3 py-2 font-medium text-white">{l.nome}</td>
                  <td className="px-3 py-2 text-gray-300">{l.telefone || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{l.email || '—'}</td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDt(l.data_lead)}</td>
                  <td className="px-3 py-2 text-gray-300">{l.conjunto || '—'}</td>
                  <td className="px-3 py-2 text-gray-300">{COLUNAS.find((c) => c.id === l.status)?.label || l.status}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 max-h-[90vh] flex flex-col">
            <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-white">{modal.nome}</h3>
                <p className="text-xs text-gray-400">{COLUNAS.find((c) => c.id === modal.status)?.label}</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="p-1.5 text-gray-500 hover:text-white rounded-full">
                <FaTimes />
              </button>
            </header>
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className={labelClass}>Telefone</div>
                  <div className="flex items-center gap-2">
                    <span>{modal.telefone || '—'}</span>
                    {modal.telefone && (
                      <button
                        type="button"
                        onClick={copiarTelefone}
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          telefoneCopiado ? 'text-emerald-400' : 'text-indigo-300 hover:text-indigo-200'
                        }`}
                        title="Copiar telefone"
                      >
                        {telefoneCopiado ? <FaCheck /> : <FaCopy />}
                        {telefoneCopiado ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className={labelClass}>E-mail</div>
                  <div className="break-all">{modal.email || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Data que caiu o lead</div>
                  <div>{fmtDt(modal.data_lead)}</div>
                </div>
                <div>
                  <div className={labelClass}>Faixa etária</div>
                  <div>{modal.faixa_etaria || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Já fez consórcio</div>
                  <div>{modal.ja_fez_consorcio || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Está procurando empréstimo?</div>
                  <div>{modal.procurando_emprestimo || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Renda familiar mensal</div>
                  <div>{modal.renda_familiar || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Conjunto</div>
                  <div>{modal.conjunto || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Usuário vinculado (CRM)</div>
                  <div>
                    {usuariosAtivos.find((u) => u.id === modal.usuario_vinculado_id)?.nome ||
                      (modal.usuario_vinculado_id ? 'Usuário vinculado' : '—')}
                  </div>
                </div>
              </div>

              {podeEditar && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className={labelClass}>Mover para</label>
                    <select
                      value={modal.status}
                      onChange={(e) => aplicarStatus(modal.id, e.target.value, true)}
                      className={campoClass}
                    >
                      {COLUNAS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalVincular(modal);
                        setUsuarioVinculoId(modal.usuario_vinculado_id || '');
                      }}
                      className="inline-flex items-center gap-2 bg-indigo-600/80 hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-semibold"
                    >
                      <FaUserPlus /> Vincular / reenviar ao CRM
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data do primeiro contato</label>
                  <input disabled value={fmtDt(modal.data_primeiro_contato)} className={campoClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Descrição — atendimento inicial</label>
                  <textarea
                    rows={3}
                    disabled={!podeEditar}
                    value={form.descricao_atendimento_inicial}
                    onChange={(e) => setForm((p) => ({ ...p, descricao_atendimento_inicial: e.target.value }))}
                    className={campoClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Data/hora — atendimento com vendedor</label>
                  <input disabled value={fmtDt(modal.data_atendimento_vendedor)} className={campoClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Observação — vendedor</label>
                  <textarea
                    rows={3}
                    disabled={!podeEditar}
                    value={form.observacao_vendedor}
                    onChange={(e) => setForm((p) => ({ ...p, observacao_vendedor: e.target.value }))}
                    className={campoClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Data/hora — fechamento</label>
                  <input disabled value={fmtDt(modal.data_fechamento)} className={campoClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Observação — fechamento</label>
                  <textarea
                    rows={3}
                    disabled={!podeEditar}
                    value={form.observacao_fechamento}
                    onChange={(e) => setForm((p) => ({ ...p, observacao_fechamento: e.target.value }))}
                    className={campoClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Data/hora — lead frio</label>
                  <input disabled value={fmtDt(modal.data_lead_frio)} className={campoClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Observação — lead frio</label>
                  <textarea
                    rows={3}
                    disabled={!podeEditar}
                    value={form.observacao_frio}
                    onChange={(e) => setForm((p) => ({ ...p, observacao_frio: e.target.value }))}
                    className={campoClass}
                  />
                </div>
              </div>
            </div>
            {podeEditar && (
              <footer className="px-4 py-3 border-t border-gray-700 flex justify-end">
                <button
                  type="button"
                  onClick={salvarObs}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2 rounded-md text-sm font-semibold"
                >
                  {salvando ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  Salvar observações
                </button>
              </footer>
            )}
          </div>
        </div>
      )}

      {modalVincular && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FaUserPlus className="text-indigo-400" /> Vincular ao CRM
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{modalVincular.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalVincular(null);
                  setUsuarioVinculoId('');
                }}
                className="p-1.5 text-gray-500 hover:text-white rounded-full"
              >
                <FaTimes />
              </button>
            </header>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-300">
                O lead vai para <strong>ATENDIMENTO COM VENDEDOR</strong> e aparece como{' '}
                <strong>LEAD QUENTE</strong> no CRM do usuário, com origem <strong>V4 COMPANY</strong>.
              </p>
              <div>
                <label className={labelClass}>Usuário (diretor, gerente ou vendedor)</label>
                <select
                  value={usuarioVinculoId}
                  onChange={(e) => setUsuarioVinculoId(e.target.value)}
                  className={campoClass}
                >
                  <option value="">Selecione…</option>
                  {usuariosAtivos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({String(u.cargo || '').toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <footer className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalVincular(null);
                  setUsuarioVinculoId('');
                }}
                className="px-3 py-2 rounded-md text-sm font-semibold bg-gray-700 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarVinculoVendedor}
                disabled={salvando}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-3 py-2 rounded-md text-sm font-semibold"
              >
                {salvando ? <FaSpinner className="animate-spin" /> : <FaSave />}
                Confirmar vínculo
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
