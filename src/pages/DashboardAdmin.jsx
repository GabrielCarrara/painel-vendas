import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";

export default function DashboardAdmin() {
  const [vendas, setVendas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros] = useState({ mes: "", administradora: "" });

  useEffect(() => {
    buscarVendas();
    buscarUsuarios();
  }, []);

  const buscarVendas = async () => {
    const { data, error } = await supabase.from("vendas").select("*");
    if (!error) setVendas(data);
    else console.error("Erro ao buscar vendas:", error.message);
  };

  const buscarUsuarios = async () => {
    const { data, error } = await supabase.from("usuarios_custom").select("*");
    if (!error) setUsuarios(data);
    else console.error("Erro ao buscar usuários:", error.message);
  };

  const filtrarVendas = () => {
    return vendas.filter((v) => {
      const matchMes = !filtros.mes || v.mes === filtros.mes;
      const matchAdmin = !filtros.administradora || v.administradora === filtros.administradora;
      return matchMes && matchAdmin;
    });
  };

  const vendasFiltradas = filtrarVendas();

  const totalVendas = vendasFiltradas.length;
  const valorTotal = vendasFiltradas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);

  const ranking = usuarios.map((user) => {
    const vendasUser = vendasFiltradas.filter((v) => v.usuario_id === user.id);
    const valorUser = vendasUser.reduce((acc, v) => acc + parseFloat(v.valor), 0);
    return {
      nome: user.nome,
      vendas: vendasUser.length,
      valor: valorUser,
    };
  }).sort((a, b) => b.valor - a.valor);

  const mesesDisponiveis = [...new Set(vendas.map(v => v.mes))];

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Painel Administrativo</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filtros.mes}
          onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
          className="bg-gray-800 p-2 rounded"
        >
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map((mes) => (
            <option key={mes} value={mes}>{mes}</option>
          ))}
        </select>

        <select
          value={filtros.administradora}
          onChange={(e) => setFiltros({ ...filtros, administradora: e.target.value })}
          className="bg-gray-800 p-2 rounded"
        >
          <option value="">Todas administradoras</option>
          <option value="HS">HS</option>
          <option value="GAZIN">GAZIN</option>
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold mb-2">👥 Total de Usuários</h2>
          <p className="text-3xl font-bold">{usuarios.length}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold mb-2">🧾 Vendas Lançadas</h2>
          <p className="text-3xl font-bold">{totalVendas}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow text-center">
          <h2 className="text-xl font-semibold mb-2">💸 Valor Vendido</h2>
          <p className="text-3xl font-bold">
            R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Ranking de vendedores */}
      <div className="bg-gray-800 p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">🏆 Ranking de Vendedores</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-gray-300 border-b border-gray-700">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Vendas</th>
              <th className="p-2">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((v, i) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{v.nome}</td>
                <td className="p-2">{v.vendas}</td>
                <td className="p-2">
                  R$ {v.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
