// src/pages/PainelGerente.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import PainelCRM from "./PainelCRM";

export default function PainelGerente() {
  const [aba, setAba] = useState("vendas");
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: "", administradora: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [vendaEditada, setVendaEditada] = useState({});
  const [novaVenda, setNovaVenda] = useState({
    cliente: "",
    grupo: "",
    cota: "",
    administradora: "",
    valor: "",
    parcela: "cheia",
    mes: dayjs().format("YYYY-MM"),
  });
  const [usuarioAtual, setUsuarioAtual] = useState(null);

  useEffect(() => {
    buscarUsuarios();
    buscarUsuarioLogado();
    buscarVendas();
  }, []);

  const buscarUsuarios = async () => {
    const { data } = await supabase.from("usuarios_custom").select("id, nome");
    if (data) setUsuarios(data);
  };

  const buscarUsuarioLogado = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUsuarioAtual(user);
  };

  const buscarVendas = async () => {
    const { data } = await supabase.from("vendas").select("*").order("created_at", { ascending: false });
    if (data) setVendas(data);
  };

  const nomeVendedor = (id) => {
    const user = usuarios.find((u) => u.id === id);
    return user ? user.nome : "Desconhecido";
  };

  const filtrarVendas = () => {
    return vendas.filter((v) => {
      const matchVendedor = !filtros.vendedor || v.usuario_id === filtros.vendedor;
      const matchMes = !filtros.mes || v.mes === filtros.mes;
      const matchAdm = !filtros.administradora || v.administradora === filtros.administradora;
      return matchVendedor && matchMes && matchAdm;
    });
  };

  const editarVenda = (venda) => {
    setEditandoId(venda.id);
    setVendaEditada({ ...venda });
  };

  const salvarEdicao = async () => {
    await supabase.from("vendas").update(vendaEditada).eq("id", editandoId);
    setEditandoId(null);
    setVendaEditada({});
    buscarVendas();
  };

  const excluirVenda = async (id) => {
    if (window.confirm("Excluir esta venda?")) {
      await supabase.from("vendas").delete().eq("id", id);
      buscarVendas();
    }
  };

  const atualizarComissao = async (id, campo, valor) => {
    await supabase.from("vendas").update({ [campo]: valor }).eq("id", id);
    buscarVendas();
  };

  const calcularTotais = () => {
    const mesAtual = dayjs().format("YYYY-MM");
    const prox1 = dayjs().add(1, "month").format("YYYY-MM");
    const prox2 = dayjs().add(2, "month").format("YYYY-MM");

    const totaisPorVendedor = {};
    let totalMesTodos = 0;
    let totalMesVendedorSelecionado = 0;
    let totalComissaoVendedor = 0;

    filtrarVendas().forEach((venda) => {
      const id = venda.usuario_id;
      const valor = parseFloat(venda.valor);
      const tipo = venda.parcela === "cheia" ? [0.006, 0.003, 0.003] : [0.003, 0.0015, 0.0015];

      if (!totaisPorVendedor[id]) {
        totaisPorVendedor[id] = { nome: nomeVendedor(id), vendido: 0, atual: 0, futuro: 0 };
      }

      totaisPorVendedor[id].vendido += valor;
      for (let i = 0; i < 3; i++) {
        if (venda[`comissao_${i + 1}`]) {
          const data = dayjs(venda.created_at).add(i, "month").format("YYYY-MM");
          const comissaoValor = valor * tipo[i];
          if (data === mesAtual) totaisPorVendedor[id].atual += comissaoValor;
          else if ([prox1, prox2].includes(data)) totaisPorVendedor[id].futuro += comissaoValor;
        }
      }

      if (venda.mes === mesAtual) totalMesTodos += valor;
      if (filtros.vendedor && venda.usuario_id === filtros.vendedor && venda.mes === mesAtual) {
        totalMesVendedorSelecionado += valor;
        for (let i = 0; i < 3; i++) {
          if (venda[`comissao_${i + 1}`]) totalComissaoVendedor += valor * tipo[i];
        }
      }
    });

    return { totaisPorVendedor, totalMesTodos, totalMesVendedorSelecionado, totalComissaoVendedor };
  };

  const cadastrarVenda = async () => {
    if (!usuarioAtual) return alert("Usuário não autenticado.");
    await supabase.from("vendas").insert([{ ...novaVenda, usuario_id: usuarioAtual.id }]);
    buscarVendas();
    setNovaVenda({ cliente: "", grupo: "", cota: "", administradora: "", valor: "", parcela: "cheia", mes: dayjs().format("YYYY-MM") });
    setAba("vendas");
  };

  const { totaisPorVendedor, totalMesTodos, totalMesVendedorSelecionado, totalComissaoVendedor } = calcularTotais();

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {/* Navegação por abas */}
      <div className="flex gap-2 mb-6">
        {["vendas", "crm", "nova_venda"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${aba === tab ? "bg-blue-600" : "bg-gray-700"}`}
            onClick={() => setAba(tab)}
          >
            {tab === "vendas" ? "VENDAS" : tab === "crm" ? "CRM" : "NOVA VENDA"}
          </button>
        ))}
      </div>

      {/* ABA: VENDAS */}
      {aba === "vendas" && (
        <>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select value={filtros.vendedor} onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })} className="bg-gray-800 p-2 rounded">
              <option value="">Todos os Vendedores</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} className="bg-gray-800 p-2 rounded">
              <option value="">Todos os Meses</option>
              {[...new Set(vendas.map((v) => v.mes))].map((mes) => <option key={mes} value={mes}>{mes}</option>)}
            </select>
            <select value={filtros.administradora} onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })} className="bg-gray-800 p-2 rounded">
              <option value="">Todas Admins</option>
              <option value="HS">HS</option>
              <option value="GAZIN">GAZIN</option>
            </select>
          </div>

          {/* Totais */}
          <p className="text-green-400 font-semibold mt-4">Total vendido no mês atual: R$ {totalMesTodos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          {filtros.vendedor && (
            <p className="text-yellow-400 mt-1">
              Vendedor selecionado vendeu R$ {totalMesVendedorSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} com comissão R$ {totalComissaoVendedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}

          {/* Tabela de Totais */}
          <div className="mt-6 mb-4">
            <h2 className="text-xl font-bold mb-2">Comissões por Vendedor</h2>
            <table className="w-full bg-gray-800 text-sm rounded">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2">Vendedor</th>
                  <th className="px-4 py-2">Total Vendido</th>
                  <th className="px-4 py-2">Comissão Atual</th>
                  <th className="px-4 py-2">Futuras Comissões</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totaisPorVendedor).map(([id, t]) => (
                  <tr key={id}>
                    <td className="px-4 py-2">{t.nome}</td>
                    <td className="px-4 py-2">R$ {t.vendido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-green-400">R$ {t.atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-yellow-400">R$ {t.futuro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista de Vendas */}
          <table className="w-full bg-gray-800 text-sm rounded overflow-hidden">
            <thead className="bg-gray-700 text-gray-300">
              <tr>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Grupo</th>
                <th className="px-4 py-2">Cota</th>
                <th className="px-4 py-2">Administradora</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Parcela</th>
                <th className="px-4 py-2">Mês</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Comissões</th>
                <th className="px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrarVendas().map((venda) => (
                <tr key={venda.id} className="border-b border-gray-700">
                  {editandoId === venda.id ? (
                    <>
                      <td><input value={vendaEditada.cliente} onChange={(e) => setVendaEditada({ ...vendaEditada, cliente: e.target.value })} /></td>
                      <td><input value={vendaEditada.grupo} onChange={(e) => setVendaEditada({ ...vendaEditada, grupo: e.target.value })} /></td>
                      <td><input value={vendaEditada.cota} onChange={(e) => setVendaEditada({ ...vendaEditada, cota: e.target.value })} /></td>
                      <td><input value={vendaEditada.administradora} onChange={(e) => setVendaEditada({ ...vendaEditada, administradora: e.target.value })} /></td>
                      <td><input value={vendaEditada.valor} onChange={(e) => setVendaEditada({ ...vendaEditada, valor: e.target.value })} /></td>
                      <td><input value={vendaEditada.parcela} onChange={(e) => setVendaEditada({ ...vendaEditada, parcela: e.target.value })} /></td>
                      <td><input value={vendaEditada.mes} onChange={(e) => setVendaEditada({ ...vendaEditada, mes: e.target.value })} /></td>
                      <td>{nomeVendedor(venda.usuario_id)}</td>
                      <td colSpan={2}>
                        <button onClick={salvarEdicao} className="bg-green-600 px-2 py-1 rounded">Salvar</button>
                        <button onClick={() => setEditandoId(null)} className="bg-gray-600 px-2 py-1 rounded ml-2">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1">{venda.cliente}</td>
                      <td>{venda.grupo}</td>
                      <td>{venda.cota}</td>
                      <td>{venda.administradora}</td>
                      <td>R$ {parseFloat(venda.valor).toLocaleString("pt-BR")}</td>
                      <td>{venda.parcela}</td>
                      <td>{venda.mes}</td>
                      <td>{nomeVendedor(venda.usuario_id)}</td>
                      <td>
                        {["comissao_1", "comissao_2", "comissao_3"].map((com) => (
                          <input key={com} type="checkbox" checked={venda[com]} onChange={(e) => atualizarComissao(venda.id, com, e.target.checked)} />
                        ))}
                      </td>
                      <td>
                        <button onClick={() => editarVenda(venda)} className="bg-blue-600 px-2 py-1 rounded">Editar</button>
                        <button onClick={() => excluirVenda(venda.id)} className="bg-red-600 px-2 py-1 rounded ml-1">Excluir</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ABA: CRM */}
      {aba === "crm" && <PainelCRM />}

      {/* ABA: NOVA VENDA */}
      {aba === "nova_venda" && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Cadastrar Nova Venda</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input placeholder="Cliente" className="bg-gray-700 p-2 rounded" value={novaVenda.cliente} onChange={(e) => setNovaVenda({ ...novaVenda, cliente: e.target.value })} />
            <input placeholder="Grupo" className="bg-gray-700 p-2 rounded" value={novaVenda.grupo} onChange={(e) => setNovaVenda({ ...novaVenda, grupo: e.target.value })} />
            <input placeholder="Cota" className="bg-gray-700 p-2 rounded" value={novaVenda.cota} onChange={(e) => setNovaVenda({ ...novaVenda, cota: e.target.value })} />
            <input placeholder="Valor" type="number" className="bg-gray-700 p-2 rounded" value={novaVenda.valor} onChange={(e) => setNovaVenda({ ...novaVenda, valor: e.target.value })} />
            <select className="bg-gray-700 p-2 rounded" value={novaVenda.parcela} onChange={(e) => setNovaVenda({ ...novaVenda, parcela: e.target.value })}>
              <option value="cheia">Parcela Cheia</option>
              <option value="meia">Parcela Meia</option>
            </select>
            <select className="bg-gray-700 p-2 rounded" value={novaVenda.administradora} onChange={(e) => setNovaVenda({ ...novaVenda, administradora: e.target.value })}>
              <option value="">Selecione Administradora</option>
              <option value="HS">HS</option>
              <option value="GAZIN">GAZIN</option>
            </select>
          </div>
          <button onClick={cadastrarVenda} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Salvar Venda</button>
        </div>
      )}
    </div>
  );
}
