// src/pages/PainelCRM.js (Versão com coluna "Origem" restaurada)
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import { FaUsers, FaPlus, FaFire, FaCheckCircle, FaArchive, FaSnowflake, FaEdit, FaTrash, FaSave, FaTimes, FaExclamationTriangle, FaSpinner } from "react-icons/fa";

function isoParaInputDate(val) {
  if (!val) return "";
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatarDataContato(val) {
  if (!val) return "—";
  return dayjs(isoParaInputDate(val)).format("DD/MM/YYYY");
}

/** Exibe só dia/mês; o lembrete usa o mesmo dia/mês todo ano. */
function formatarDataRetorno(val) {
  if (!val) return "—";
  return dayjs(isoParaInputDate(val)).format("DD/MM");
}

// --- Componentes de UI Reutilizáveis ---

const LeadStatCard = ({ icon, title, count, color, onClick, isActive }) => (
  <button onClick={onClick} className={`p-5 rounded-xl shadow-lg flex flex-col items-center justify-center text-center transition-all duration-300 transform hover:-translate-y-1 w-full ${isActive ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
    <div className={`p-3 mb-2 rounded-full ${color}`}>
      {icon}
    </div>
    <p className="text-sm font-semibold text-gray-300">{title}</p>
    <p className="text-2xl font-bold text-white">{count}</p>
  </button>
);

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full py-20">
        <FaSpinner className="animate-spin text-indigo-400" size={48} />
    </div>
);

const EmptyStateRow = ({ message, colSpan }) => (
    <tr>
        <td colSpan={colSpan} className="text-center py-16">
            <div className="flex flex-col items-center gap-3 text-gray-500">
                <FaExclamationTriangle size={40} />
                <h3 className="font-semibold text-lg">{message}</h3>
                <p className="text-sm">Tente limpar o filtro ou adicione um novo lead.</p>
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
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-500/10 border-b border-red-500/25 px-5 py-4 flex items-start gap-3">
          <span className="text-red-400 mt-0.5 shrink-0">
            <FaExclamationTriangle size={22} />
          </span>
          <div>
            <h2 id="confirmar-excluir-lead-titulo" className="text-lg font-bold text-white">
              Excluir lead
            </h2>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              Deseja realmente excluir o lead{' '}
              <span className="font-semibold text-white">{(nomeLead || '').toUpperCase()}</span>? Esta ação não pode ser
              desfeita.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-700 bg-gray-900/40 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="px-5 py-2.5 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---

export default function PainelCRMAprimorado({ onAviso } = {}) {
  const [leads, setLeads] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [novoLead, setNovoLead] = useState({
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
  const [editandoId, setEditandoId] = useState(null);
  const [leadEditado, setLeadEditado] = useState({});
  const [filtroTipo, setFiltroTipo] = useState("");
  const [loading, setLoading] = useState(true);
  const [leadParaExcluir, setLeadParaExcluir] = useState(null);

  const aviso = (titulo, texto, variant = "erro") => {
    if (typeof onAviso === "function") onAviso({ titulo, texto, variant });
    else if (titulo) window.alert(`${titulo}\n\n${texto}`);
    else window.alert(texto);
  };

  // --- Efeitos e Busca de Dados ---
  useEffect(() => {
    const buscarDadosIniciais = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUsuarioAtual(data.user);
        const { data: leadsData } = await supabase
          .from("leads")
          .select("*")
          .eq("usuario_id", data.user.id)
          .order("created_at", { ascending: false });
        if (leadsData) setLeads(leadsData);
      }
      setLoading(false);
    };
    buscarDadosIniciais();
  }, []);

  const buscarLeads = async () => {
    if (!usuarioAtual) return;
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("usuario_id", usuarioAtual.id)
      .order("created_at", { ascending: false });
    if (data) setLeads(data);
  };

  // --- Lógica de Ações (CRUD) ---
  const cadastrarLead = async () => {
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
      usuario_id: usuarioAtual.id,
      nome: novoLead.nome.toUpperCase(),
      data_contato: novoLead.data_contato || null,
      data_retorno: novoLead.data_retorno || null,
    };
    const { error } = await supabase.from("leads").insert([payload]);

    if (error) {
      aviso("Erro ao cadastrar lead", error.message);
    } else {
        setNovoLead({
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
        buscarLeads();
    }
  };

  const iniciarEdicao = (lead) => {
    setEditandoId(lead.id);
    setLeadEditado({ ...lead });
  };

  const salvarEdicao = async () => {
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
        buscarLeads();
    }
  };

  const abrirConfirmacaoExcluir = (lead) => {
    setLeadParaExcluir({ id: lead.id, nome: lead.nome });
  };

  const confirmarExclusaoLead = async () => {
    if (!leadParaExcluir) return;
    const { error } = await supabase.from("leads").delete().eq("id", leadParaExcluir.id);
    setLeadParaExcluir(null);
    if (error) {
      aviso("Erro ao excluir lead", error.message);
      return;
    }
    buscarLeads();
  };

  // --- Dados para Renderização (Memoizados) ---
  const leadsFiltrados = useMemo(() => leads.filter((lead) => !filtroTipo || lead.tipo === filtroTipo), [leads, filtroTipo]);

  const tiposDeLead = useMemo(() => ([
    { tipo: "LEAD NOVO", icon: <FaPlus size={20}/>, color: "bg-blue-500/20 text-blue-400" },
    { tipo: "LEAD QUENTE", icon: <FaFire size={20}/>, color: "bg-red-500/20 text-red-400" },
    { tipo: "VENDIDO", icon: <FaCheckCircle size={20}/>, color: "bg-green-500/20 text-green-400" },
    { tipo: "LEAD FRIO", icon: <FaSnowflake size={20}/>, color: "bg-cyan-500/20 text-cyan-400" },
    { tipo: "ESQUECIDO", icon: <FaArchive size={20}/>, color: "bg-gray-500/20 text-gray-400" },
  ]), []);

  const getTipoEstilo = (tipo) => tiposDeLead.find(t => t.tipo === tipo) || {};

  if (loading) {
      return <LoadingSpinner />;
  }

  return (
    <div className="animate-fade-in text-white">
      {leadParaExcluir && (
        <ModalConfirmarExcluirLead
          nomeLead={leadParaExcluir.nome}
          onCancelar={() => setLeadParaExcluir(null)}
          onConfirmar={confirmarExclusaoLead}
        />
      )}

      {/* 1. Dashboard de Estatísticas Interativo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {tiposDeLead.map(({ tipo, icon, color }) => (
          <LeadStatCard
            key={tipo}
            icon={icon}
            title={tipo}
            count={leads.filter(l => l.tipo === tipo).length}
            color={color}
            onClick={() => setFiltroTipo(filtroTipo === tipo ? "" : tipo)}
            isActive={filtroTipo === tipo}
          />
        ))}
      </div>

      {/* 2. Formulário de Cadastro Organizado */}
      <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 mb-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">⚡ Adicionar Novo Lead</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input placeholder="Nome*" value={novoLead.nome} onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          <input placeholder="Telefone*" value={novoLead.telefone} onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          <input placeholder="CPF" value={novoLead.cpf} onChange={(e) => setNovoLead({ ...novoLead, cpf: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          <input placeholder="Origem" value={novoLead.origem} onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          <select value={novoLead.tipo} onChange={(e) => setNovoLead({ ...novoLead, tipo: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500">
            {tiposDeLead.map(t => <option key={t.tipo} value={t.tipo}>{t.tipo}</option>)}
          </select>
          <input type="month" value={novoLead.mes} onChange={(e) => setNovoLead({ ...novoLead, mes: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Data de 1º contato <span className="text-gray-500">(opcional)</span></label>
            <input type="date" value={novoLead.data_contato} onChange={(e) => setNovoLead({ ...novoLead, data_contato: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Data de retorno <span className="text-gray-500">(opcional, lembrete no dia/mês)</span></label>
            <input type="date" value={novoLead.data_retorno} onChange={(e) => setNovoLead({ ...novoLead, data_retorno: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <textarea placeholder="Observação" value={novoLead.observacao} onChange={(e) => setNovoLead({ ...novoLead, observacao: e.target.value })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-indigo-500 md:col-span-2 lg:col-span-3" rows="2"></textarea>
        </div>
        <button onClick={cadastrarLead} className="mt-4 bg-indigo-600 px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2">
          <FaPlus /> Cadastrar
        </button>
      </div>

      {/* 3. Tabela de Leads Aprimorada */}
      <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FaUsers /> Lista de Leads</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="border-b border-gray-700">
              <tr className="text-gray-400 uppercase">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">1º contato</th>
                <th className="px-4 py-3">Retorno</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.length > 0 ? leadsFiltrados.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                  {editandoId === lead.id ? (
                    <>
                      <td className="p-2"><input value={leadEditado.nome} onChange={(e) => setLeadEditado({ ...leadEditado, nome: e.target.value.toUpperCase() })} className="bg-gray-600 p-2 rounded w-full"/></td>
                      <td className="p-2"><input value={leadEditado.telefone} onChange={(e) => setLeadEditado({ ...leadEditado, telefone: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/></td>
                      {/* <<-- CAMPO DE EDIÇÃO ADICIONADO */}
                      <td className="p-2"><input value={leadEditado.origem} onChange={(e) => setLeadEditado({ ...leadEditado, origem: e.target.value })} className="bg-gray-600 p-2 rounded w-full"/></td>
                      <td className="p-2">
                        <input type="date" value={isoParaInputDate(leadEditado.data_contato)} onChange={(e) => setLeadEditado({ ...leadEditado, data_contato: e.target.value || null })} className="bg-gray-600 p-2 rounded w-full min-w-0"/>
                      </td>
                      <td className="p-2">
                        <input type="date" value={isoParaInputDate(leadEditado.data_retorno)} onChange={(e) => setLeadEditado({ ...leadEditado, data_retorno: e.target.value || null })} className="bg-gray-600 p-2 rounded w-full min-w-0"/>
                      </td>
                      <td className="p-2"><textarea value={leadEditado.observacao} onChange={(e) => setLeadEditado({ ...leadEditado, observacao: e.target.value })} className="bg-gray-600 p-2 rounded w-full" rows="2"></textarea></td>
                      <td className="p-2">
                        <select value={leadEditado.tipo} onChange={(e) => setLeadEditado({ ...leadEditado, tipo: e.target.value })} className="bg-gray-600 p-2 rounded w-full">
                          {tiposDeLead.map(t => <option key={t.tipo} value={t.tipo}>{t.tipo}</option>)}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button onClick={salvarEdicao} className="p-2 text-green-400 hover:text-green-300"><FaSave size={18} /></button>
                          <button onClick={() => setEditandoId(null)} className="p-2 text-gray-400 hover:text-gray-200"><FaTimes size={18} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 font-medium">{lead.nome.toUpperCase()}</td>
                      <td className="px-4 py-4">{lead.telefone}</td>
                      <td className="px-4 py-4">{lead.origem}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-300">{formatarDataContato(lead.data_contato)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-amber-200/90">{formatarDataRetorno(lead.data_retorno)}</td>
                      <td className="px-4 py-4 text-gray-400 max-w-xs truncate" title={lead.observacao}>{lead.observacao}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${getTipoEstilo(lead.tipo).color}`}>
                          {lead.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex gap-3 justify-center">
                          <button onClick={() => iniciarEdicao(lead)} className="p-2 text-blue-400 hover:text-blue-300"><FaEdit size={18} /></button>
                          <button
                            type="button"
                            onClick={() => abrirConfirmacaoExcluir(lead)}
                            className="p-2 text-red-500 hover:text-red-400"
                            title="Excluir lead"
                          >
                            <FaTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )) : <EmptyStateRow message="Nenhum Lead Encontrado" colSpan={8} />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}