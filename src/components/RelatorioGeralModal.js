// src/components/RelatorioGeralModal.js (VERSÃO ATUALIZADA)
import React, { useMemo } from 'react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import dayjs from 'dayjs';

export default function RelatorioGeralModal({ vendas, usuarios, filtros, listaFiliais, onClose }) {

  const relatorio = useMemo(() => {
    const mesLabel = dayjs(filtros.mes).format('MMMM [de] YYYY');
    const filialSelecionada = listaFiliais.find(f => f.id == filtros.filial);
    const filialLabel = filialSelecionada ? filialSelecionada.nome : 'Todas as Filiais';

    const usuariosFiltrados = filtros.filial
      ? usuarios.filter(u => u.id_filial == filtros.filial)
      : usuarios;
    
    const vendasDoMes = vendas.filter(v => v.mes === filtros.mes);

    const dadosAgrupados = usuariosFiltrados.map(vendedor => {
      const vendasDoVendedor = vendasDoMes
        .filter(v => v.usuario_id === vendedor.id)
        .sort((a, b) => a.cliente.localeCompare(b.cliente));
      
      const totalVendido = vendasDoVendedor.reduce((acc, v) => acc + (parseFloat(v.valor) || 0), 0);

      return {
        id: vendedor.id,
        nome: vendedor.nome,
        vendas: vendasDoVendedor,
        total: totalVendido,
      };
    })
    .filter(v => v.vendas.length > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome));

    return { mesLabel, filialLabel, dadosAgrupados };

  }, [vendas, usuarios, filtros, listaFiliais]);

  const handlePrint = () => {
    const printContent = document.getElementById('relatorio-geral-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    
    const printStyles = `
      <style>
        body { background-color: #fff !important; color: #000 !important; margin: 20px; font-family: Arial, sans-serif; }
        h1 { font-size: 24px; font-weight: bold; }
        h2 { font-size: 20px; font-weight: bold; margin-top: 20px; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
        h3 { font-size: 16px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        tfoot td { font-weight: bold; background-color: #f9f9f9; }
        .valor { text-align: right; }
        .parcela-cheia { font-weight: bold; }
        .parcela-meia { font-style: italic; }
      </style>
    `;
    
    document.body.innerHTML = printStyles + printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };
  
  const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-700 animate-fade-in flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Relatório Geral de Vendas Agrupado</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><FaTimes size={20} /></button>
        </header>

        {/* Área de Conteúdo e Impressão */}
        <div id="relatorio-geral-print-area" className="p-6 max-h-[70vh] overflow-y-auto">
          <h1>Relatório Geral de Vendas</h1>
          <h3>Mês: {relatorio.mesLabel}</h3>
          <h3>Filial: {relatorio.filialLabel}</h3>

          {relatorio.dadosAgrupados.length === 0 && (
            <p className="text-gray-400">Nenhuma venda encontrada para os filtros selecionados.</p>
          )}

          {relatorio.dadosAgrupados.map(vendedor => (
            <div key={vendedor.id} style={{ breakInside: 'avoid' }}>
              <h2>VENDEDOR: {vendedor.nome.toUpperCase()}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Admin</th>
                    <th>Grupo/Cota</th>
                    <th>Parcela</th> {/* <-- COLUNA ADICIONADA */}
                    <th className="valor">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedor.vendas.map(venda => (
                    <tr key={venda.id}>
                      <td>{venda.cliente}</td>
                      <td>{venda.administradora}</td>
                      <td>{venda.grupo}/{venda.cota}</td>
                      {/* --- CÉLULA ADICIONADA --- */}
                      <td className={venda.parcela === 'cheia' ? 'parcela-cheia' : 'parcela-meia'}>
                        {venda.parcela === 'cheia' ? 'Cheia' : 'Meia'}
                      </td>
                      <td className="valor">{formatarMoeda(venda.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4">Total Vendedor:</td> {/* <-- Colspan atualizado para 4 */}
                    <td className="valor">{formatarMoeda(vendedor.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        <footer className="p-4 flex justify-end gap-4 border-t border-gray-700">
          <button onClick={onClose} type="button" className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold">
            Fechar
          </button>
          <button 
            onClick={handlePrint} 
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <FaPrint /> Imprimir Relatório
          </button>
        </footer>
      </div>
    </div>
  );
}