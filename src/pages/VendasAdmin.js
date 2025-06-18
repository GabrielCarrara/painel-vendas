// src/pages/VendasAdmin.js (PainelGerente)
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";

export default function PainelGerente() {
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ vendedor: "", mes: "", administradora: "" });

  useEffect(() => {
    buscarUsuarios();
    buscarVendas();
  }, []);

  const buscarUsuarios = async () => {
    const { data, error } = await supabase.from("usuarios_custom").select("id, nome, tipo");
    if (error) console.error("Erro ao buscar usuários:", error.message);
    else setUsuarios(data);
  };

  const buscarVendas = async () => {
    const { data, error } = await supabase.from("vendas").select("*").order("created_at", { ascending: false });
    if (error) console.error("Erro ao buscar vendas:", error.message);
    else setVendas(data);
  };

  const filtrarVendas = () => {
    return vendas.filter((venda) => {
      const matchVendedor = !filtros.vendedor || venda.usuario_id === filtros.vendedor;
      const matchMes = !filtros.mes || venda.mes === filtros.mes;
      const matchAdmin = !filtros.administradora || venda.administradora === filtros.administradora;
      return matchVendedor && matchMes && matchAdmin;
    });
  };

  const nomeVendedor = (usuarioId) => {
    if (!usuarioId) return "Desconhecido";
    const user = usuarios.find((u) => String(u.id).trim() === String(usuarioId).trim());
    if (!user) {
      console.warn("❌ Usuário não encontrado para ID:", usuarioId);
      return "Desconhecido";
    }
    return user.nome;
  };

  const atualizarComissao = async (id, campo, valor) => {
    await supabase.from("vendas").update({ [campo]: valor }).eq("id", id);
    buscarVendas();
  };

  const salvarEdicao = async (venda) => {
    const { id, ...resto } = venda;
    await supabase.from("vendas").update(resto).eq("id", id);
    buscarVendas();
  };

  const excluirVenda = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta venda?")) {
      await supabase.from("vendas").delete().eq("id", id);
      buscarVendas();
    }
  };

  const calcularComissao = (venda, parcelaIndex) => {
    const valor = parseFloat(venda.valor);
    const tipo = venda.parcela === "cheia" ? [0.006, 0.003, 0.003] : [0.003, 0.0015, 0.0015];
    return valor * tipo[parcelaIndex];
  };

  const mesAtual = dayjs().format("MM/YYYY");
  const proximoMes1 = dayjs().add(1, "month").format("MM/YYYY");
  const proximoMes2 = dayjs().add(2, "month").format("MM/YYYY");

  const comissoesFuturas = (vendas, usuario_id) => {
    let totalAtual = 0;
    let totalFuturo = 0;
    const vendasFiltradas = usuario_id ? vendas.filter(v => v.usuario_id === usuario_id) : vendas;

    for (const venda of vendasFiltradas) {
      const valor = parseFloat(venda.valor);
      const tipo = venda.parcela === "cheia" ? [0.006, 0.003, 0.003] : [0.003, 0.0015, 0.0015];
      const comissoes = [venda.comissao_1, venda.comissao_2, venda.comissao_3];

      comissoes.forEach((conf, i) => {
        if (conf) {
          const dataRecebimento = dayjs(venda.created_at).add(i, "month").format("MM/YYYY");
          if (dataRecebimento === mesAtual) totalAtual += valor * tipo[i];
          else if ([proximoMes1, proximoMes2].includes(dataRecebimento)) totalFuturo += valor * tipo[i];
        }
      });
    }

    return { atual: totalAtual, futuro: totalFuturo };
  };

  const totais = comissoesFuturas(filtrarVendas(), filtros.vendedor || null);

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-semibold mb-6 border-b pb-2 border-gray-700">Painel do Gerente</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <select
          className="p-3 rounded-md bg-gray-800 border border-gray-700"
          value={filtros.vendedor}
          onChange={(e) => setFiltros({ ...filtros, vendedor: e.target.value })}
        >
          <option value="">Todos os Vendedores</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
        <select
          className="p-3 rounded-md bg-gray-800 border border-gray-700"
          value={filtros.mes}
          onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
        >
          <option value="">Todos os Meses</option>
          {[...new Set(vendas.map((v) => v.mes))].map((mes) => (
            <option key={mes} value={mes}>{mes}</option>
          ))}
        </select>
        <select
          className="p-3 rounded-md bg-gray-800 border border-gray-700"
          value={filtros.administradora}
          onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })}
        >
          <option value="">Todas Administradoras</option>
          <option value="HS">HS</option>
          <option value="GAZIN">GAZIN</option>
        </select>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-900/50 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-400">Comissão a receber neste mês ({mesAtual}):</p>
          <p className="text-xl font-bold text-green-400">R$ {totais.atual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-indigo-900/50 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-400">Comissão nos próximos 2 meses:</p>
          <p className="text-xl font-bold text-yellow-400">R$ {totais.futuro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-800 text-gray-300">
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
              <tr key={venda.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                <td className="px-4 py-2">{venda.cliente}</td>
                <td className="px-4 py-2">{venda.grupo}</td>
                <td className="px-4 py-2">{venda.cota}</td>
                <td className="px-4 py-2">{venda.administradora}</td>
                <td className="px-4 py-2">R$ {parseFloat(venda.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2">{venda.parcela}</td>
                <td className="px-4 py-2">{venda.mes}</td>
                <td className="px-4 py-2">{nomeVendedor(venda.usuario_id)}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {["comissao_1", "comissao_2", "comissao_3"].map((comissao) => (
                      <input
                        key={comissao}
                        type="checkbox"
                        checked={venda[comissao]}
                        onChange={(e) => atualizarComissao(venda.id, comissao, e.target.checked)}
                        className="form-checkbox text-blue-600"
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded mr-2" onClick={() => salvarEdicao(venda)}>Editar</button>
                  <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded" onClick={() => excluirVenda(venda.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
