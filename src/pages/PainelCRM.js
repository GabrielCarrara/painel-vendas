// src/pages/PainelCRM.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import {
  FaUsers, FaPlus, FaFire, FaCheckCircle, FaArchive, FaSnowflake,
  FaEdit, FaTrash, FaSave, FaTimes, FaExclamationTriangle, FaSpinner, FaEye, FaFilter,
} from "react-icons/fa";

function isoParaInputDate(val) {
  if (!val) return "";
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatarDataContato(val) {
  if (!val) return "—";
  return dayjs(isoParaInputDate(val)).format("DD/MM/YYYY");
}

function formatarDataRetorno(val) {
  if (!val) return "—";
  return dayjs(isoParaInputDate(val)).format("DD/MM");
}

function cargoNorm(cargo) {
  return String(cargo ?? "").trim().toLowerCase();
}

function isDiretorOuAdmin(cargo) {
  const c = cargoNorm(cargo);
  return c === "diretor" || c === "admin";
}

const CARGO_ORDEM_FILTRO = { diretor: 0, admin: 0, gerente: 1, vendedor: 2 };

function rotuloCargo(cargo) {
  const c = cargoNorm(cargo);
  if (c === "admin") return "Admin";
  if (c === "diretor") return "Diretor";
  if (c === "gerente") return "Gerente";
  if (c === "vendedor") return "Vendedor";
  return c || "Usuário";
}

const LeadStatCard = ({ icon, title, count, color, onClick, isActive }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2.5 rounded-lg flex items-center gap-2.5 min-w-0 w-full border transition-all ${
      isActive
        ? "bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-500"
        : "bg-gray-800 border-gray-700/50 hover:bg-gray-700/60"
    }`}
  >
    <div className={`p-1.5 rounded-md shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0 text-left">
      <p className="text-[11px] text-gray-400 leading-tight truncate">{title}</p>
      <p className="text-base font-bold text-white leading-tight">{count}</p>
    </div>
  </button>
);

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-16">
    <FaSpinner className="animate-spin text-indigo-400" size={32} />
  </div>
);

const EmptyStateRow = ({ message, colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-12">
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <FaExclamationTriangle size={28} />
        <p className="font-semibold text-sm">{message}</p>
      </div>
    </td>
  </tr>
);

function ModalConfirmarExcluirLead({ nomeLead, onCancelar, onConfirmar }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-excluir-lead-titulo"
      onClick={onCancelar}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-500/10 border-b border-red-500/25 px-4 py-3.5 flex items-start gap-3">
          <span className="text-red-400 mt-0.5 shrink-0">
            <FaExclamationTriangle size={18} />
          </span>
          <div>
            <h2 id="confirmar-excluir-lead-titulo" className="text-base font-bold text-white">
              Excluir lead
            </h2>
            <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
              Deseja realmente excluir o lead{" "}
              <span className="font-semibold text-white">{(nomeLead || "").toUpperCase()}</span>? Esta ação não pode
              ser desfeita.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 bg-gray-900/40 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancelar} className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-500 text-white">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

const campoClass = "w-full bg-gray-900/60 px-2.5 py-2 text-sm rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide";

const leadVazio = () => ({
  nome: "",
  telefone: "",
  cpf: "",
  origem: "",
  observacao: "",
  tipo: "LEAD NOVO",
  mes: dayjs().format("YYYY-MM"),
  data_contato: "",
  data_retorno: "",
});

export default function PainelCRMAprimorado({
  onAviso,
  usuarioId: usuarioIdProp,
  cargo: cargoProp,
  listaUsuarios = [],
  usuarioLogadoId: usuarioLogadoIdProp,
} = {}) {
  const [leads, setLeads] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [perfilId, setPerfilId] = useState(null);
  const [perfilCargo, setPerfilCargo] = useState(cargoProp || "");
  const [usuarioFiltroId, setUsuarioFiltroId] = useState(null);
  const [novoLead, setNovoLead] = useState(leadVazio());
  const [modalNovoLead, setModalNovoLead] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [leadEditado, setLeadEditado] = useState({});
  const [filtroTipo, setFiltroTipo] = useState("");
  const [loading, setLoading] = useState(true);
  const [leadParaExcluir, setLeadParaExcluir] = useState(null);

  const cargo = cargoProp || perfilCargo;
  const isDiretor = isDiretorOuAdmin(cargo);
  const usuarioLogadoId = usuarioLogadoIdProp || perfilId || usuarioAtual?.id;
  const usuarioLeadsId = isDiretor ? usuarioFiltroId : (usuarioIdProp || perfilId || usuarioAtual?.id);
  const somenteLeitura = isDiretor && usuarioLeadsId && usuarioLogadoId && usuarioLeadsId !== usuarioLogadoId;

  const aviso = (titulo, texto, variant = "erro") => {
    if (typeof onAviso === "function") onAviso({ titulo, texto, variant });
    else if (titulo) window.alert(`${titulo}\n\n${texto}`);
    else window.alert(texto);
  };

  const usuariosParaFiltro = useMemo(() => {
    return listaUsuarios
      .filter((u) => u.id !== usuarioLogadoId)
      .filter((u) => ["vendedor", "gerente", "diretor", "admin"].includes(cargoNorm(u.cargo)))
      .sort((a, b) => {
        const oa = CARGO_ORDEM_FILTRO[cargoNorm(a.cargo)] ?? 9;
        const ob = CARGO_ORDEM_FILTRO[cargoNorm(b.cargo)] ?? 9;
        if (oa !== ob) return oa - ob;
        return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
      });
  }, [listaUsuarios, usuarioLogadoId]);

  const nomeUsuarioFiltro = useMemo(() => {
    if (!usuarioLeadsId) return "";
    if (usuarioLeadsId === usuarioLogadoId) return "Meu CRM";
    const u = listaUsuarios.find((x) => x.id === usuarioLeadsId);
    return u ? `${u.nome} (${rotuloCargo(u.cargo)})` : "Usuário";
  }, [usuarioLeadsId, usuarioLogadoId, listaUsuarios]);

  const buscarLeads = useCallback(async (targetUserId) => {
    if (!targetUserId) return;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("usuario_id", targetUserId)
      .order("created_at", { ascending: false });
    if (error) {
      if (typeof onAviso === "function") {
        onAviso({ titulo: "Erro ao carregar leads", texto: error.message });
      }
      setLeads([]);
      return;
    }
    setLeads(data || []);
  }, [onAviso]);

  useEffect(() => {
    const buscarDadosIniciais = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUsuarioAtual(user);

      const { data: perfil } = await supabase
        .from("usuarios_custom")
        .select("id, cargo")
        .or(`id.eq.${user.id},auth_id.eq.${user.id}`)
        .single();

      const idPerfil = perfil?.id || user.id;
      setPerfilId(idPerfil);
      setUsuarioFiltroId(usuarioLogadoIdProp || idPerfil);

      if (!cargoProp && perfil?.cargo) setPerfilCargo(perfil.cargo);

      setLoading(false);
    };
    buscarDadosIniciais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!usuarioLeadsId || loading) return;
    buscarLeads(usuarioLeadsId);
    setEditandoId(null);
    setLeadEditado({});
  }, [usuarioLeadsId, buscarLeads, loading]);

  const cadastrarLead = async () => {
    if (somenteLeitura) return;
    if (!usuarioAtual) {
      aviso("Sessão", "Usuário não identificado. Faça o login novamente.");
      return;
    }
    if (!novoLead.nome || !novoLead.telefone) {
      aviso("Campos obrigatórios", "Nome e telefone são obrigatórios.", "info");
      return;
    }

    const payload = {
      ...novoLead,
      usuario_id: perfilId || usuarioAtual.id,
      nome: novoLead.nome.toUpperCase(),
      data_contato: novoLead.data_contato || null,
      data_retorno: novoLead.data_retorno || null,
    };
    const { error } = await supabase.from("leads").insert([payload]);

    if (error) {
      aviso("Erro ao cadastrar lead", error.message);
    } else {
      setNovoLead(leadVazio());
      setModalNovoLead(false);
      buscarLeads(usuarioLeadsId);
    }
  };

  const iniciarEdicao = (lead) => {
    if (somenteLeitura) return;
    setEditandoId(lead.id);
    setLeadEditado({ ...lead });
  };

  const salvarEdicao = async () => {
    if (somenteLeitura) return;
    const patch = {
      ...leadEditado,
      data_contato: leadEditado.data_contato || null,
      data_retorno: leadEditado.data_retorno || null,
    };
    const { error } = await supabase.from("leads").update(patch).eq("id", editandoId);
    if (error) {
      aviso("Erro ao salvar edição", error.message);
    } else {
      setEditandoId(null);
      setLeadEditado({});
      buscarLeads(usuarioLeadsId);
    }
  };

  const abrirConfirmacaoExcluir = (lead) => {
    if (somenteLeitura) return;
    setLeadParaExcluir({ id: lead.id, nome: lead.nome });
  };

  const confirmarExclusaoLead = async () => {
    if (somenteLeitura || !leadParaExcluir) return;
    const { error } = await supabase.from("leads").delete().eq("id", leadParaExcluir.id);
    setLeadParaExcluir(null);
    if (error) {
      aviso("Erro ao excluir lead", error.message);
      return;
    }
    buscarLeads(usuarioLeadsId);
  };

  const leadsFiltrados = useMemo(
    () => leads.filter((lead) => !filtroTipo || lead.tipo === filtroTipo),
    [leads, filtroTipo]
  );

  const tiposDeLead = useMemo(
    () => [
      { tipo: "LEAD NOVO", icon: <FaPlus size={14} />, color: "bg-blue-500/20 text-blue-400" },
      { tipo: "LEAD QUENTE", icon: <FaFire size={14} />, color: "bg-red-500/20 text-red-400" },
      { tipo: "VENDIDO", icon: <FaCheckCircle size={14} />, color: "bg-green-500/20 text-green-400" },
      { tipo: "LEAD FRIO", icon: <FaSnowflake size={14} />, color: "bg-cyan-500/20 text-cyan-400" },
      { tipo: "ESQUECIDO", icon: <FaArchive size={14} />, color: "bg-gray-500/20 text-gray-400" },
    ],
    []
  );

  const getTipoEstilo = (tipo) => tiposDeLead.find((t) => t.tipo === tipo) || {};

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="animate-fade-in text-white space-y-4">
      {leadParaExcluir && (
        <ModalConfirmarExcluirLead
          nomeLead={leadParaExcluir.nome}
          onCancelar={() => setLeadParaExcluir(null)}
          onConfirmar={confirmarExclusaoLead}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3 bg-gray-800/50 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {isDiretor ? (
            <>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
                <FaFilter size={12} /> CRM de
              </h3>
              <select
                value={usuarioFiltroId || ""}
                onChange={(e) => setUsuarioFiltroId(e.target.value)}
                className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 max-w-xs"
              >
                <option value={usuarioLogadoId}>Meu CRM</option>
                {usuariosParaFiltro.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({rotuloCargo(u.cargo)})
                  </option>
                ))}
              </select>
            </>
          ) : (
            <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
              <FaUsers size={12} /> Meus Leads
            </h3>
          )}
          {somenteLeitura && (
            <span className="flex items-center gap-1.5 text-amber-200/90 text-xs bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 rounded-md">
              <FaEye size={11} className="shrink-0" />
              Modo visualização — apenas o dono do CRM pode editar
            </span>
          )}
        </div>

        {!somenteLeitura && (
          <button
            type="button"
            onClick={() => { setNovoLead(leadVazio()); setModalNovoLead(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <FaPlus size={12} /> Novo Lead
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {tiposDeLead.map(({ tipo, icon, color }) => (
          <LeadStatCard
            key={tipo}
            icon={icon}
            title={tipo}
            count={leads.filter((l) => l.tipo === tipo).length}
            color={color}
            onClick={() => setFiltroTipo(filtroTipo === tipo ? "" : tipo)}
            isActive={filtroTipo === tipo}
          />
        ))}
      </div>

      {modalNovoLead && !somenteLeitura && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fade-in">
            <header className="px-4 py-3 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FaPlus className="text-indigo-400" /> Novo Lead
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoLead(false)}
                className="p-1.5 text-gray-500 hover:text-white rounded-full"
              >
                <FaTimes size={16} />
              </button>
            </header>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
              <div>
                <label className={labelClass}>Nome *</label>
                <input placeholder="Nome do lead" value={novoLead.nome} onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>Telefone *</label>
                <input placeholder="(00) 00000-0000" value={novoLead.telefone} onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>CPF</label>
                <input placeholder="Opcional" value={novoLead.cpf} onChange={(e) => setNovoLead({ ...novoLead, cpf: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>Origem</label>
                <input placeholder="Ex: Indicação" value={novoLead.origem} onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={novoLead.tipo} onChange={(e) => setNovoLead({ ...novoLead, tipo: e.target.value })} className={campoClass}>
                  {tiposDeLead.map((t) => (
                    <option key={t.tipo} value={t.tipo}>{t.tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Mês</label>
                <input type="month" value={novoLead.mes} onChange={(e) => setNovoLead({ ...novoLead, mes: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>1º contato</label>
                <input type="date" value={novoLead.data_contato} onChange={(e) => setNovoLead({ ...novoLead, data_contato: e.target.value })} className={campoClass} />
              </div>
              <div>
                <label className={labelClass}>Data de retorno</label>
                <input type="date" value={novoLead.data_retorno} onChange={(e) => setNovoLead({ ...novoLead, data_retorno: e.target.value })} className={campoClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Observação</label>
                <textarea placeholder="Anotações sobre o lead" value={novoLead.observacao} onChange={(e) => setNovoLead({ ...novoLead, observacao: e.target.value })} className={campoClass} rows="3" />
              </div>
            </div>

            <footer className="px-4 py-3 flex justify-end gap-2 border-t border-gray-700">
              <button type="button" onClick={() => setModalNovoLead(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md text-sm font-semibold">
                Cancelar
              </button>
              <button type="button" onClick={cadastrarLead} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2">
                <FaSave size={14} /> Cadastrar
              </button>
            </footer>
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <FaUsers size={14} /> Lista de Leads
          {isDiretor && usuarioLeadsId !== usuarioLogadoId && (
            <span className="text-xs font-normal text-gray-400">— {nomeUsuarioFiltro}</span>
          )}
          {filtroTipo && (
            <button
              type="button"
              onClick={() => setFiltroTipo("")}
              className="text-xs font-normal text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-indigo-500/20"
            >
              {filtroTipo} <FaTimes size={9} />
            </button>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="border-b border-gray-700">
              <tr className="text-gray-400 uppercase text-xs">
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Contato</th>
                <th className="px-2 py-2">Origem</th>
                <th className="px-2 py-2">1º contato</th>
                <th className="px-2 py-2">Retorno</th>
                <th className="px-2 py-2">Observação</th>
                <th className="px-2 py-2">Status</th>
                {!somenteLeitura && <th className="px-2 py-2 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.length > 0 ? (
                leadsFiltrados.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors">
                    {editandoId === lead.id ? (
                      <>
                        <td className="p-1.5"><input value={leadEditado.nome} onChange={(e) => setLeadEditado({ ...leadEditado, nome: e.target.value.toUpperCase() })} className="bg-gray-600 p-1.5 rounded w-full text-xs" /></td>
                        <td className="p-1.5"><input value={leadEditado.telefone} onChange={(e) => setLeadEditado({ ...leadEditado, telefone: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs" /></td>
                        <td className="p-1.5"><input value={leadEditado.origem} onChange={(e) => setLeadEditado({ ...leadEditado, origem: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs" /></td>
                        <td className="p-1.5">
                          <input type="date" value={isoParaInputDate(leadEditado.data_contato)} onChange={(e) => setLeadEditado({ ...leadEditado, data_contato: e.target.value || null })} className="bg-gray-600 p-1.5 rounded w-full min-w-0 text-xs" />
                        </td>
                        <td className="p-1.5">
                          <input type="date" value={isoParaInputDate(leadEditado.data_retorno)} onChange={(e) => setLeadEditado({ ...leadEditado, data_retorno: e.target.value || null })} className="bg-gray-600 p-1.5 rounded w-full min-w-0 text-xs" />
                        </td>
                        <td className="p-1.5"><textarea value={leadEditado.observacao} onChange={(e) => setLeadEditado({ ...leadEditado, observacao: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs" rows="2" /></td>
                        <td className="p-1.5">
                          <select value={leadEditado.tipo} onChange={(e) => setLeadEditado({ ...leadEditado, tipo: e.target.value })} className="bg-gray-600 p-1.5 rounded w-full text-xs">
                            {tiposDeLead.map((t) => (
                              <option key={t.tipo} value={t.tipo}>{t.tipo}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 text-center">
                          <div className="flex gap-1 justify-center">
                            <button type="button" onClick={salvarEdicao} className="p-1 text-green-400 hover:text-green-300" title="Salvar"><FaSave size={14} /></button>
                            <button type="button" onClick={() => setEditandoId(null)} className="p-1 text-gray-400 hover:text-gray-200" title="Cancelar"><FaTimes size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 font-medium">{lead.nome.toUpperCase()}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{lead.telefone}</td>
                        <td className="px-2 py-2.5">{lead.origem}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-gray-300">{formatarDataContato(lead.data_contato)}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-amber-200/90">{formatarDataRetorno(lead.data_retorno)}</td>
                        <td className="px-2 py-2.5 text-gray-400 min-w-[10rem] max-w-md whitespace-pre-wrap break-words align-top leading-relaxed">
                          {lead.observacao || "—"}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap ${getTipoEstilo(lead.tipo).color}`}>
                            {lead.tipo}
                          </span>
                        </td>
                        {!somenteLeitura && (
                          <td className="px-2 py-2.5 text-center">
                            <div className="flex gap-1 justify-center">
                              <button type="button" onClick={() => iniciarEdicao(lead)} className="p-1 text-blue-400 hover:text-blue-300" title="Editar"><FaEdit size={14} /></button>
                              <button type="button" onClick={() => abrirConfirmacaoExcluir(lead)} className="p-1 text-red-500 hover:text-red-400" title="Excluir lead">
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <EmptyStateRow
                  message={isDiretor ? `Nenhum lead cadastrado para ${nomeUsuarioFiltro}` : "Nenhum Lead Encontrado"}
                  colSpan={somenteLeitura ? 7 : 8}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
