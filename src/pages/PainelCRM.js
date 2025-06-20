// src/pages/PainelCRM.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";

export default function PainelCRM() {
  const [leads, setLeads] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [novoLead, setNovoLead] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    origem: "",
    tipo: "LEAD NOVO",
    mes: dayjs().format("YYYY-MM"),
  });
  const [editandoId, setEditandoId] = useState(null);
  const [leadEditado, setLeadEditado] = useState({});
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    buscarUsuario();
  }, []);

  useEffect(() => {
    if (usuarioAtual) buscarLeads();
  }, [usuarioAtual]);

  const buscarUsuario = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setUsuarioAtual(data.user);
  };

  const buscarLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("usuario_id", usuarioAtual.id)
      .order("created_at", { ascending: false });
    if (data) setLeads(data);
  };

  const cadastrarLead = async () => {
    if (!novoLead.nome || !novoLead.telefone || !novoLead.origem || !novoLead.tipo || !novoLead.mes) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    await supabase.from("leads").insert([{ ...novoLead, usuario_id: usuarioAtual.id }]);
    setNovoLead({
      nome: "",
      telefone: "",
      cpf: "",
      origem: "",
      tipo: "LEAD NOVO",
      mes: dayjs().format("YYYY-MM"),
    });
    buscarLeads();
  };

  const iniciarEdicao = (lead) => {
    setEditandoId(lead.id);
    setLeadEditado({ ...lead });
  };

  const salvarEdicao = async () => {
    await supabase.from("leads").update(leadEditado).eq("id", editandoId);
    setEditandoId(null);
    setLeadEditado({});
    buscarLeads();
  };

  const excluirLead = async (id) => {
    if (window.confirm("Deseja excluir este lead?")) {
      await supabase.from("leads").delete().eq("id", id);
      buscarLeads();
    }
  };

  const leadsFiltrados = leads.filter((lead) => {
    return !filtroTipo || lead.tipo === filtroTipo;
  });

  const contarPorTipo = (tipo) => leads.filter((l) => l.tipo === tipo).length;

  return (
    <div className="text-white">
      <h2 className="text-2xl font-bold mb-4">Painel de CRM</h2>

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {["LEAD NOVO", "LEAD QUENTE", "VENDIDO", "ESQUECIDO", "LEAD FRIO"].map((tipo) => (
          <div key={tipo} className="bg-gray-800 p-4 rounded text-center">
            <p className="text-sm font-semibold">{tipo}</p>
            <p className="text-2xl text-green-400">{contarPorTipo(tipo)}</p>
          </div>
        ))}
      </div>

      {/* Filtro por tipo */}
      <div className="mb-6">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-gray-800 p-2 rounded"
        >
          <option value="">Todos os Tipos</option>
          <option value="LEAD NOVO">LEAD NOVO</option>
          <option value="LEAD QUENTE">LEAD QUENTE</option>
          <option value="VENDIDO">VENDIDO</option>
          <option value="ESQUECIDO">ESQUECIDO</option>
          <option value="LEAD FRIO">LEAD FRIO</option>
        </select>
      </div>

      {/* Formulário de Cadastro */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <input
          placeholder="Nome*"
          className="bg-gray-800 p-2 rounded"
          value={novoLead.nome}
          onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })}
        />
        <input
          placeholder="Telefone*"
          className="bg-gray-800 p-2 rounded"
          value={novoLead.telefone}
          onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })}
        />
        <input
          placeholder="CPF"
          className="bg-gray-800 p-2 rounded"
          value={novoLead.cpf}
          onChange={(e) => setNovoLead({ ...novoLead, cpf: e.target.value })}
        />
        <input
          placeholder="Origem*"
          className="bg-gray-800 p-2 rounded"
          value={novoLead.origem}
          onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })}
        />
        <select
          className="bg-gray-800 p-2 rounded"
          value={novoLead.tipo}
          onChange={(e) => setNovoLead({ ...novoLead, tipo: e.target.value })}
        >
          <option value="LEAD NOVO">LEAD NOVO</option>
          <option value="LEAD QUENTE">LEAD QUENTE</option>
          <option value="VENDIDO">VENDIDO</option>
          <option value="ESQUECIDO">ESQUECIDO</option>
          <option value="LEAD FRIO">LEAD FRIO</option>
        </select>
        <input
          type="month"
          className="bg-gray-800 p-2 rounded"
          value={novoLead.mes}
          onChange={(e) => setNovoLead({ ...novoLead, mes: e.target.value })}
        />
      </div>
      <button
        onClick={cadastrarLead}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 mb-6"
      >
        Cadastrar Lead
      </button>

      {/* Lista de Leads */}
      <table className="w-full bg-gray-800 text-sm rounded overflow-hidden">
        <thead className="bg-gray-700 text-gray-300">
          <tr>
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">Telefone</th>
            <th className="px-4 py-2">CPF</th>
            <th className="px-4 py-2">Origem</th>
            <th className="px-4 py-2">Tipo</th>
            <th className="px-4 py-2">Mês</th>
            <th className="px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {leadsFiltrados.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-700">
              {editandoId === lead.id ? (
                <>
                  <td><input value={leadEditado.nome} onChange={(e) => setLeadEditado({ ...leadEditado, nome: e.target.value })} /></td>
                  <td><input value={leadEditado.telefone} onChange={(e) => setLeadEditado({ ...leadEditado, telefone: e.target.value })} /></td>
                  <td><input value={leadEditado.cpf} onChange={(e) => setLeadEditado({ ...leadEditado, cpf: e.target.value })} /></td>
                  <td><input value={leadEditado.origem} onChange={(e) => setLeadEditado({ ...leadEditado, origem: e.target.value })} /></td>
                  <td>
                    <select value={leadEditado.tipo} onChange={(e) => setLeadEditado({ ...leadEditado, tipo: e.target.value })}>
                      <option value="LEAD NOVO">LEAD NOVO</option>
                      <option value="LEAD QUENTE">LEAD QUENTE</option>
                      <option value="VENDIDO">VENDIDO</option>
                      <option value="ESQUECIDO">ESQUECIDO</option>
                      <option value="LEAD FRIO">LEAD FRIO</option>
                    </select>
                  </td>
                  <td><input type="month" value={leadEditado.mes} onChange={(e) => setLeadEditado({ ...leadEditado, mes: e.target.value })} /></td>
                  <td>
                    <button onClick={salvarEdicao} className="bg-green-600 px-2 py-1 rounded">Salvar</button>
                    <button onClick={() => setEditandoId(null)} className="bg-gray-600 px-2 py-1 rounded ml-2">Cancelar</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{lead.nome}</td>
                  <td>{lead.telefone}</td>
                  <td>{lead.cpf}</td>
                  <td>{lead.origem}</td>
                  <td>{lead.tipo}</td>
                  <td>{lead.mes}</td>
                  <td>
                    <button onClick={() => iniciarEdicao(lead)} className="bg-blue-600 px-2 py-1 rounded">Editar</button>
                    <button onClick={() => excluirLead(lead.id)} className="bg-red-600 px-2 py-1 rounded ml-1">Excluir</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
