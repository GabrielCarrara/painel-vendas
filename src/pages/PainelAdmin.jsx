import { Routes, Route, useNavigate } from "react-router-dom";
import Vendas from "./VendasAdmin";
import Relatorios from "./RelatoriosAdmin";
import Dashboard from "./DashboardAdmin";

function BemVindo() {
  return <div className="p-4 text-white">Bem-vindo ao Painel do Administrador!</div>;
}

export default function PainelAdmin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="flex space-x-4 p-4 bg-gray-800">
        <button onClick={() => navigate("/admin/vendas")} className="bg-blue-600 px-4 py-2 rounded">
          Vendas
        </button>
        <button onClick={() => navigate("/admin/relatorios")} className="bg-blue-600 px-4 py-2 rounded">
          Relatórios
        </button>
        <button onClick={() => navigate("/admin/dashboard")} className="bg-blue-600 px-4 py-2 rounded">
          Dashboard
        </button>
      </nav>

      <div className="p-6">
        <Routes>
          <Route path="vendas" element={<Vendas />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="" element={<BemVindo />} />
        </Routes>
      </div>
    </div>
  );
}
