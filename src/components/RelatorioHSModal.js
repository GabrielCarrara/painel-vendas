// src/components/RelatorioHSModal.js (Versão Corrigida)
import React, { useMemo, useState } from 'react';
import { FaTimes, FaClipboard } from 'react-icons/fa';
import dayjs from 'dayjs';

export default function RelatorioHSModal({ vendas, usuarios, onClose }) {
  const [copySuccess, setCopySuccess] = useState('');

  const mesAtualFormatado = dayjs().format('YYYY-MM');
  const mesLabel = dayjs().format('MMMM [de] YYYY');

  const relatorioHS = useMemo(() => {
    // 1. Filtra apenas vendas da HS e do mês atual
    const vendasHSMes = vendas.filter(v => 
      v.administradora === 'HS' && 
      v.mes === mesAtualFormatado
    );

    // 2. Agrupa por vendedor (usuario_id)
    const porVendedor = vendasHSMes.reduce((acc, venda) => {
      const id = venda.usuario_id;
      if (!acc[id]) {
        acc[id] = { cotas: 0, valor: 0 };
      }
      acc[id].cotas += 1; // Cada venda conta como uma cota
      acc[id].valor += parseFloat(venda.valor) || 0;
      return acc;
    }, {});

    // 3. Adiciona o nome do vendedor e filtra por cargo
    return Object.entries(porVendedor).map(([usuarioId, data]) => {
      const vendedor = usuarios.find(u => u.id === usuarioId);
      return {
        nome: vendedor ? vendedor.nome : 'Vendedor Desconhecido',
        cargo: vendedor ? vendedor.cargo : null, // Pega o cargo
        ...data
      };
    })
    .filter(item => item.cargo?.toLowerCase() === 'vendedor') // Filtra Diretores/Gerentes
    .sort((a, b) => b.valor - a.valor); // Ordena

  }, [vendas, usuarios, mesAtualFormatado]);

  const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 4. Gera o texto (simples, sem Meia/Cheia)
  const gerarTextoRelatorio = () => {
    let texto = `RELATÓRIO DE VENDAS HS - ${mesLabel.toUpperCase()}\n\n`;
    relatorioHS.forEach(item => {
      texto += `${item.nome.toUpperCase()}: ${item.cotas} COTAS - ${formatarMoeda(item.valor)}\n`;
    });
    return texto;
  };

  const copiarParaClipboard = () => {
    navigator.clipboard.writeText(gerarTextoRelatorio()).then(() => {
      setCopySuccess('Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Falha ao copiar.');
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 animate-fade-in">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Relatório de Vendas HS - {mesLabel}</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><FaTimes size={20} /></button>
        </header>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <pre 
            id="relatorio-hs-texto" 
            className="bg-gray-900 p-4 rounded-lg text-white font-mono whitespace-pre-wrap text-sm"
          >
            {relatorioHS.length > 0 ? gerarTextoRelatorio() : "Nenhuma venda HS encontrada para este mês."}
          </pre>
        </div>
        <footer className="p-4 flex justify-end border-t border-gray-700">
          <button 
            onClick={copiarParaClipboard} 
            className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <FaClipboard /> {copySuccess || 'Copiar Relatório'}
          </button>
        </footer>
      </div>
    </div>
  );
}