import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-6">Fênix Consórcios</h2>
        <nav className="space-y-2">
          <a href="#" className="block p-2 rounded hover:bg-gray-700">Dashboard</a>
          <a href="#" className="block p-2 rounded hover:bg-gray-700">Vendas</a>
          <a href="#" className="block p-2 rounded hover:bg-gray-700">Relatórios</a>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Painel</h1>
          <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Sair</button>
        </div>

        {/* Conteúdo dinâmico */}
        {children}
      </main>
    </div>
  );
}
