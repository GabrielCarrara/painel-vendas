import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaPlus, FaSave, FaTimes, FaLock, FaTrash } from 'react-icons/fa';

const ETAPAS = [
  { id: 'PASSO_1', label: '1º PASSO' },
  { id: 'TRANSFERENCIAS', label: 'TRANSFERÊNCIAS' },
  { id: 'PASSO_2', label: '2º PASSO' },
  { id: 'SUBSTITUICAO', label: 'SUBSTITUIÇÃO' },
  { id: 'IMOVEL', label: 'IMÓVEL' },
];

const LISTAS_PADRAO = [
  { id: 'JUNTANDO_DOCUMENTOS', label: 'JUNTANDO DOCUMENTOS' },
  { id: 'EM_ANALISE', label: 'EM ANÁLISE' },
  { id: 'PENDENCIA', label: 'PENDÊNCIA' },
  { id: 'CONCLUIDO', label: 'CONCLUÍDO' },
];

const LISTAS_IMOVEL = [
  { id: 'PENDENCIADOS', label: 'PENDENCIADOS' },
  { id: 'JUNTANDO_DOCUMENTOS', label: 'JUNTANDO DOCUMENTOS' },
  { id: 'ANALISE_DOCUMENTAL', label: 'ANÁLISE DOCUMENTAL' },
  { id: 'VISTORIA', label: 'VISTORIA' },
  { id: 'CONTRATO_FIANCA', label: 'CONTRATO DE FIANÇA' },
  { id: 'REGISTRO_CARTORIO', label: 'REGISTRO CARTÓRIO' },
  { id: 'CONCLUIDO', label: 'CONCLUÍDO' },
];

const LISTAS_POR_ETAPA = {
  PASSO_1: LISTAS_PADRAO,
  TRANSFERENCIAS: LISTAS_PADRAO,
  PASSO_2: LISTAS_PADRAO,
  SUBSTITUICAO: LISTAS_PADRAO,
  IMOVEL: LISTAS_IMOVEL,
};

function isDiretorCargo(cargo) {
  const c = String(cargo || '').toLowerCase().trim();
  return c === 'diretor' || c === 'sócio-diretor' || c === 'socio-diretor';
}

const emptyForm = {
  nome_completo: '',
  grupo: '',
  cota: '',
  telefone: '',
  vendedor_nome: '',
  origem: 'PONTES_E_LACERDA',
  administradora: 'GAZIN',
  data_envio: '',
  data_ultima_analise: '',
  descricao: '',
  pos_venda: false,
  adesao: false,
  pagamento: false,
};

export default function ProcessosKanban({ usuario }) {
  const podeEditar = useMemo(() => isDiretorCargo(usuario?.cargo), [usuario?.cargo]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [erro, setErro] = useState('');

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroAdministradora, setFiltroAdministradora] = useState('');
  const [apenasPendencias, setApenasPendencias] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [modalEditar, setModalEditar] = useState(null); // card
  const [editForm, setEditForm] = useState(emptyForm);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    const { data, error } = await supabase
      .from('processos_clientes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) setErro(error.message);
    setCards(data || []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();

    const channel = supabase
      .channel('processos_clientes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'processos_clientes' },
        (payload) => {
          const novo = payload?.new || null;
          const antigo = payload?.old || null;

          setCards((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            if (payload.eventType === 'DELETE') {
              const idDel = antigo?.id;
              if (!idDel) return list;
              return list.filter((c) => c.id !== idDel);
            }

            const rec = novo;
            if (!rec?.id) return list;
            const idx = list.findIndex((c) => c.id === rec.id);
            if (idx === -1) return [rec, ...list];

            const next = list.slice();
            next[idx] = { ...next[idx], ...rec };
            // Mantém ordenação por updated_at desc quando houver
            next.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
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

  const cardsFiltrados = useMemo(() => {
    const txt = String(filtroTexto || '').trim().toLowerCase();
    const adm = String(filtroAdministradora || '').trim().toUpperCase();
    const etapaFiltro = String(filtroEtapa || '').trim().toUpperCase();

    return (cards || []).filter((c) => {
      const isArquivado = !!c.arquivado;
      const buscaAtiva = !!txt;
      if (!mostrarArquivados && isArquivado && !buscaAtiva) return false;

      if (etapaFiltro && String(c.etapa || '').toUpperCase() !== etapaFiltro) return false;
      if (adm && String(c.administradora || '').toUpperCase() !== adm) return false;
      if (apenasPendencias && !(c.pos_venda || c.adesao)) return false;

      if (!txt) return true;
      const hay = [
        c.nome_completo,
        c.grupo,
        c.cota,
        c.telefone,
        c.descricao,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(txt);
    });
  }, [cards, filtroAdministradora, filtroTexto, apenasPendencias, filtroEtapa, mostrarArquivados]);

  const agrupado = useMemo(() => {
    const map = {};
    for (const e of ETAPAS) {
      map[e.id] = {};
      for (const l of LISTAS_POR_ETAPA[e.id] || LISTAS_PADRAO) map[e.id][l.id] = [];
    }
    for (const c of cardsFiltrados || []) {
      const e = c.etapa || 'PASSO_1';
      const l = c.lista || 'JUNTANDO_DOCUMENTOS';
      if (!map[e]) map[e] = {};
      if (!map[e][l]) map[e][l] = [];
      map[e][l].push(c);
    }
    return map;
  }, [cardsFiltrados]);

  const onDrop = async (etapa, lista) => {
    if (!podeEditar) return;
    if (!dragId) return;

    setErro('');
    const anterior = cards;
    const nowISO = new Date().toISOString();
    const patchLocal = (c) =>
      c.id === dragId
        ? {
            ...c,
            etapa,
            lista,
            data_ultima_analise: lista === 'CONCLUIDO' ? (c.data_ultima_analise || nowISO) : c.data_ultima_analise,
          }
        : c;

    setCards((prev) => prev.map(patchLocal));

    const { error } = await supabase
      .from('processos_clientes')
      .update({
        etapa,
        lista,
        data_ultima_analise: lista === 'CONCLUIDO' ? nowISO : undefined,
      })
      .eq('id', dragId);

    if (error) {
      setCards(anterior);
      setErro(error.message);
    }
    setDragId(null);
  };

  const criar = async () => {
    if (!podeEditar) return;
    setErro('');

    const required = ['nome_completo', 'grupo', 'cota', 'telefone', 'administradora'];
    for (const k of required) {
      if (!String(form[k] || '').trim()) {
        setErro('Preencha os campos obrigatórios: Nome completo, Grupo, Cota, Telefone e Administradora.');
        return;
      }
    }

    setSalvando(true);
    const payload = {
      nome_completo: form.nome_completo.trim(),
      grupo: form.grupo.trim(),
      cota: form.cota.trim(),
      telefone: form.telefone.trim(),
      vendedor_nome: form.vendedor_nome?.trim() || null,
      origem: form.origem || null,
      administradora: form.administradora,
      descricao: form.descricao?.trim() || null,
      pos_venda: !!form.pos_venda,
      adesao: !!form.adesao,
      pagamento: !!form.pagamento,
      data_envio: form.data_envio || null,
      data_ultima_analise: form.data_ultima_analise ? new Date(form.data_ultima_analise).toISOString() : null,
      etapa: 'PASSO_1',
      lista: 'JUNTANDO_DOCUMENTOS',
    };

    const { data, error } = await supabase
      .from('processos_clientes')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    setCards((prev) => [data, ...prev]);
    setForm(emptyForm);
    setModalAberto(false);
    setSalvando(false);
  };

  const abrirEditar = (card) => {
    setModalEditar(card);
    setEditForm({
      nome_completo: card.nome_completo || '',
      grupo: card.grupo || '',
      cota: card.cota || '',
      telefone: card.telefone || '',
      vendedor_nome: card.vendedor_nome || '',
      origem: card.origem || 'PONTES_E_LACERDA',
      administradora: card.administradora || 'GAZIN',
      data_envio: card.data_envio ? String(card.data_envio).slice(0, 10) : '',
      data_ultima_analise: card.data_ultima_analise ? String(card.data_ultima_analise).slice(0, 10) : '',
      descricao: card.descricao || '',
      pos_venda: !!card.pos_venda,
      adesao: !!card.adesao,
      pagamento: !!card.pagamento,
    });
  };

  const salvarEdicao = async () => {
    if (!podeEditar || !modalEditar) return;
    setErro('');
    setSalvando(true);

    const payload = {
      nome_completo: editForm.nome_completo.trim(),
      grupo: editForm.grupo.trim(),
      cota: editForm.cota.trim(),
      telefone: editForm.telefone.trim(),
      vendedor_nome: editForm.vendedor_nome?.trim() || null,
      origem: editForm.origem || null,
      administradora: editForm.administradora,
      descricao: editForm.descricao?.trim() || null,
      pos_venda: !!editForm.pos_venda,
      adesao: !!editForm.adesao,
      pagamento: !!editForm.pagamento,
      data_envio: editForm.data_envio || null,
      data_ultima_analise: editForm.data_ultima_analise ? new Date(editForm.data_ultima_analise).toISOString() : null,
    };

    const { data, error } = await supabase
      .from('processos_clientes')
      .update(payload)
      .eq('id', modalEditar.id)
      .select('*')
      .single();

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    setCards((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    setModalEditar(null);
    setSalvando(false);
  };

  const arquivarCard = async () => {
    if (!podeEditar || !modalEditar) return;
    setErro('');

    const ok = window.confirm(`Arquivar "${modalEditar.nome_completo}"? Ele sairá da tela (exceto em "Mostrar arquivados" ou pesquisa).`);
    if (!ok) return;

    setSalvando(true);
    const id = modalEditar.id;
    const anterior = cards;
    const now = new Date().toISOString();

    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, arquivado: true, arquivado_em: now } : c)));
    setModalEditar(null);

    const { error } = await supabase.from('processos_clientes').update({ arquivado: true, arquivado_em: now }).eq('id', id);
    if (error) {
      setCards(anterior);
      setErro(error.message);
    }
    setSalvando(false);
  };

  const desarquivarCard = async () => {
    if (!podeEditar || !modalEditar) return;
    setErro('');

    setSalvando(true);
    const id = modalEditar.id;
    const anterior = cards;

    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, arquivado: false, arquivado_em: null } : c)));
    setModalEditar(null);

    const { error } = await supabase.from('processos_clientes').update({ arquivado: false, arquivado_em: null }).eq('id', id);
    if (error) {
      setCards(anterior);
      setErro(error.message);
    }
    setSalvando(false);
  };

  const excluirCard = async () => {
    if (!podeEditar || !modalEditar) return;
    setErro('');

    const ok = window.confirm(`Excluir o cliente "${modalEditar.nome_completo}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;

    setSalvando(true);
    const id = modalEditar.id;
    const anterior = cards;

    setCards((prev) => prev.filter((c) => c.id !== id));
    setModalEditar(null);

    const { error } = await supabase.from('processos_clientes').delete().eq('id', id);
    if (error) {
      setCards(anterior);
      setErro(error.message);
    }
    setSalvando(false);
  };

  return (
    <div className="bg-gray-900 text-gray-200">
      {/** Classes padrão para inputs do modal (mais compacto) */}
      {/** (mantido aqui para evitar duplicação e facilitar ajuste de UI) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Processos</h2>
          <p className="text-gray-400 text-sm">
            Todos podem visualizar. {podeEditar ? 'Diretor pode cadastrar e mover cartões.' : 'Somente Diretor pode cadastrar/mover.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!podeEditar && (
            <div className="text-xs text-gray-400 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
              <FaLock /> Somente leitura
            </div>
          )}
          {podeEditar && (
            <button
              onClick={() => setModalAberto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <FaPlus /> Novo cliente
            </button>
          )}
          <button
            onClick={carregar}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold border border-gray-700"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2">
          <label className="text-sm text-gray-300">Pesquisar</label>
          <input
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Nome, grupo, cota, telefone ou descrição…"
            className="w-full mt-1 p-3 bg-gray-800 rounded-lg border border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Etapa</label>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="w-full mt-1 p-3 bg-gray-800 rounded-lg border border-gray-700"
          >
            <option value="">Todas</option>
            <option value="PASSO_1">1º PASSO</option>
            <option value="TRANSFERENCIAS">TRANSFERÊNCIAS</option>
            <option value="PASSO_2">2º PASSO</option>
            <option value="SUBSTITUICAO">SUBSTITUIÇÃO</option>
            <option value="IMOVEL">IMÓVEL</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-300">Administradora</label>
          <select
            value={filtroAdministradora}
            onChange={(e) => setFiltroAdministradora(e.target.value)}
            className="w-full mt-1 p-3 bg-gray-800 rounded-lg border border-gray-700"
          >
            <option value="">Todas</option>
            <option value="GAZIN">GAZIN</option>
            <option value="HS">HS</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3">
            <input
              type="checkbox"
              checked={apenasPendencias}
              onChange={(e) => setApenasPendencias(e.target.checked)}
            />
            Apenas pendências (PÓS/ADESÃO)
          </label>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3">
            <input
              type="checkbox"
              checked={mostrarArquivados}
              onChange={(e) => setMostrarArquivados(e.target.checked)}
            />
            Mostrar arquivados
          </label>
        </div>
      </div>

      {erro && (
        <div className="mb-4 bg-red-900/40 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Carregando…</div>
      ) : (
        <div className="space-y-6">
          {(filtroEtapa ? ETAPAS.filter((e) => e.id === filtroEtapa) : ETAPAS).map((etapa) => (
            <section key={etapa.id} className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">{etapa.label}</h3>
                <div className="text-xs text-gray-400">
                  Arraste e solte dentro das listas.
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {(LISTAS_POR_ETAPA[etapa.id] || LISTAS_PADRAO).map((lista) => (
                  <div
                    key={lista.id}
                    className={`rounded-xl border p-3 min-h-[140px] min-w-[260px] flex-1 ${
                      podeEditar ? 'border-gray-700 bg-gray-900/40' : 'border-gray-800 bg-gray-900/20'
                    }`}
                    onDragOver={(e) => {
                      if (!podeEditar) return;
                      e.preventDefault();
                    }}
                    onDrop={() => onDrop(etapa.id, lista.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-100 text-sm">{lista.label}</h4>
                      <span className="text-xs text-gray-400">
                        {(agrupado?.[etapa.id]?.[lista.id] || []).length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(agrupado?.[etapa.id]?.[lista.id] || []).map((c) => (
                        <div
                          key={c.id}
                          draggable={podeEditar}
                          onDragStart={() => setDragId(c.id)}
                          onClick={() => abrirEditar(c)}
                          className={`rounded-lg border px-3 py-2 cursor-pointer select-none ${
                            podeEditar ? 'border-gray-700 bg-gray-800 hover:bg-gray-700/70' : 'border-gray-800 bg-gray-900/50'
                          }`}
                          title={podeEditar ? 'Clique para editar. Arraste para mover.' : 'Somente leitura.'}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{c.nome_completo}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                G: {c.grupo} • C: {c.cota} • {c.administradora}
                              </div>
                              {(c.vendedor_nome || c.origem) && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {c.vendedor_nome ? `Vendedor: ${c.vendedor_nome}` : null}
                                  {c.vendedor_nome && c.origem ? ' • ' : null}
                                  {c.origem ? `Origem: ${String(c.origem).replaceAll('_', ' ')}` : null}
                                </div>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 whitespace-nowrap">
                              {c.pos_venda && <span className="px-2 py-0.5 rounded bg-amber-900/40 border border-amber-800 mr-1">PÓS</span>}
                              {c.adesao && <span className="px-2 py-0.5 rounded bg-sky-900/40 border border-sky-800">ADESÃO</span>}
                              {c.etapa === 'PASSO_2' && c.pagamento && (
                                <span className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-800 ml-1">PAGAMENTO</span>
                              )}
                            </div>
                          </div>
                          {(c.data_envio || c.data_ultima_analise) && (
                            <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                              {c.data_envio && <span>Envio: {String(c.data_envio).slice(0, 10)}</span>}
                              {c.data_ultima_analise && <span>Análise: {String(c.data_ultima_analise).slice(0, 10)}</span>}
                            </div>
                          )}
                          {c.descricao && (
                            <div className="text-xs text-gray-300 mt-2 whitespace-pre-wrap">
                              {c.descricao}
                            </div>
                          )}
                        </div>
                      ))}
                      {(agrupado?.[etapa.id]?.[lista.id] || []).length === 0 && (
                        <div className="text-xs text-gray-500 py-6 text-center border border-dashed border-gray-700 rounded-lg">
                          Vazio
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Novo Cliente */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl md:max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Cadastrar cliente</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-300 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Nome completo *</label>
                <input value={form.nome_completo} onChange={(e) => setForm((p) => ({ ...p, nome_completo: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Telefone *</label>
                <input value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Vendedor (nome)</label>
                <input value={form.vendedor_nome} onChange={(e) => setForm((p) => ({ ...p, vendedor_nome: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Origem</label>
                <select value={form.origem} onChange={(e) => setForm((p) => ({ ...p, origem: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm">
                  <option value="PONTES_E_LACERDA">PONTES E LACERDA</option>
                  <option value="MIRASSOL">MIRASSOL</option>
                  <option value="EXTERNO">EXTERNO</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Grupo *</label>
                <input value={form.grupo} onChange={(e) => setForm((p) => ({ ...p, grupo: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Cota *</label>
                <input value={form.cota} onChange={(e) => setForm((p) => ({ ...p, cota: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Administradora *</label>
                <select value={form.administradora} onChange={(e) => setForm((p) => ({ ...p, administradora: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm">
                  <option value="HS">HS</option>
                  <option value="GAZIN">GAZIN</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Data do envio (opcional)</label>
                <input type="date" value={form.data_envio} onChange={(e) => setForm((p) => ({ ...p, data_envio: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Data última análise (opcional)</label>
                <input type="date" value={form.data_ultima_analise} onChange={(e) => setForm((p) => ({ ...p, data_ultima_analise: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 text-sm" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.pos_venda} onChange={(e) => setForm((p) => ({ ...p, pos_venda: e.target.checked }))} />
                  PÓS VENDA
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.adesao} onChange={(e) => setForm((p) => ({ ...p, adesao: e.target.checked }))} />
                  ADESÃO
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.pagamento} onChange={(e) => setForm((p) => ({ ...p, pagamento: e.target.checked }))} />
                  PAGAMENTO
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Descrição (opcional)</label>
                <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 min-h-[70px] text-sm" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalAberto(false)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold border border-gray-700">
                Cancelar
              </button>
              <button disabled={salvando} onClick={criar} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60">
                <FaSave /> {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl md:max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Detalhes do cliente</h3>
              <button onClick={() => setModalEditar(null)} className="text-gray-300 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300">Nome completo</label>
                <input disabled={!podeEditar} value={editForm.nome_completo} onChange={(e) => setEditForm((p) => ({ ...p, nome_completo: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Telefone</label>
                <input disabled={!podeEditar} value={editForm.telefone} onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Vendedor (nome)</label>
                <input disabled={!podeEditar} value={editForm.vendedor_nome} onChange={(e) => setEditForm((p) => ({ ...p, vendedor_nome: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Origem</label>
                <select disabled={!podeEditar} value={editForm.origem} onChange={(e) => setEditForm((p) => ({ ...p, origem: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm">
                  <option value="PONTES_E_LACERDA">PONTES E LACERDA</option>
                  <option value="MIRASSOL">MIRASSOL</option>
                  <option value="EXTERNO">EXTERNO</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Grupo</label>
                <input disabled={!podeEditar} value={editForm.grupo} onChange={(e) => setEditForm((p) => ({ ...p, grupo: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Cota</label>
                <input disabled={!podeEditar} value={editForm.cota} onChange={(e) => setEditForm((p) => ({ ...p, cota: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Administradora</label>
                <select disabled={!podeEditar} value={editForm.administradora} onChange={(e) => setEditForm((p) => ({ ...p, administradora: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm">
                  <option value="HS">HS</option>
                  <option value="GAZIN">GAZIN</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Data do envio</label>
                <input disabled={!podeEditar} type="date" value={editForm.data_envio} onChange={(e) => setEditForm((p) => ({ ...p, data_envio: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-300">Data última análise</label>
                <input disabled={!podeEditar} type="date" value={editForm.data_ultima_analise} onChange={(e) => setEditForm((p) => ({ ...p, data_ultima_analise: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-60 text-sm" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input disabled={!podeEditar} type="checkbox" checked={editForm.pos_venda} onChange={(e) => setEditForm((p) => ({ ...p, pos_venda: e.target.checked }))} />
                  PÓS VENDA
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input disabled={!podeEditar} type="checkbox" checked={editForm.adesao} onChange={(e) => setEditForm((p) => ({ ...p, adesao: e.target.checked }))} />
                  ADESÃO
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input disabled={!podeEditar} type="checkbox" checked={editForm.pagamento} onChange={(e) => setEditForm((p) => ({ ...p, pagamento: e.target.checked }))} />
                  PAGAMENTO
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-300">Descrição</label>
                <textarea disabled={!podeEditar} value={editForm.descricao} onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))} className="w-full mt-1 p-2.5 bg-gray-800 rounded-lg border border-gray-700 min-h-[70px] disabled:opacity-60 text-sm" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              {podeEditar && (
                <button
                  disabled={salvando}
                  onClick={excluirCard}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60 mr-auto"
                >
                  <FaTrash /> Excluir
                </button>
              )}
              {podeEditar && modalEditar?.etapa === 'PASSO_2' && modalEditar?.lista === 'CONCLUIDO' && !modalEditar?.arquivado && (
                <button
                  disabled={salvando}
                  onClick={arquivarCard}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  Arquivar
                </button>
              )}
              {podeEditar && modalEditar?.arquivado && (
                <button
                  disabled={salvando}
                  onClick={desarquivarCard}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  Desarquivar
                </button>
              )}
              <button onClick={() => setModalEditar(null)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold border border-gray-700">
                Fechar
              </button>
              {podeEditar && (
                <button disabled={salvando} onClick={salvarEdicao} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60">
                  <FaSave /> {salvando ? 'Salvando…' : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

