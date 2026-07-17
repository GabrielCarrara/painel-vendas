// Relatório de ranking por administradora (HS / GAZIN)
import React, { useMemo, useState } from 'react';
import { FaTimes, FaClipboard } from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { normalizarMesVenda, dayjsMesRef } from '../utils/comissoes';

const OPCOES_MES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export default function RelatorioHSModal({ vendas, usuarios, onClose, administradora = 'HS' }) {
  const [copySuccess, setCopySuccess] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState(dayjs().format('MM'));
  const [anoSelecionado, setAnoSelecionado] = useState(dayjs().format('YYYY'));

  const anoAtual = dayjs().year();
  const opcoesAno = Array.from(
    { length: Math.max(anoAtual, 2025) - 2025 + 1 },
    (_, i) => String(2025 + i)
  );

  const mesRef = `${anoSelecionado}-${mesSelecionado}`;
  dayjs.locale('pt-br');
  const mesLabel = dayjsMesRef(mesRef).format('MMMM [de] YYYY');
  const adminLabel = administradora === 'GAZIN' ? 'GAZIN' : 'HS';

  const relatorio = useMemo(() => {
    const mesNorm = normalizarMesVenda(mesRef);
    const vendasAdminMes = (vendas || []).filter(
      (v) => v.administradora === adminLabel && normalizarMesVenda(v.mes) === mesNorm
    );

    const porVendedor = vendasAdminMes.reduce((acc, venda) => {
      const id = venda.usuario_id;
      if (!acc[id]) {
        acc[id] = { cotas: 0, valor: 0 };
      }
      acc[id].cotas += 1;
      acc[id].valor += parseFloat(venda.valor) || 0;
      return acc;
    }, {});

    return Object.entries(porVendedor)
      .map(([usuarioId, data]) => {
        const vendedor = (usuarios || []).find((u) => u.id === usuarioId);
        return {
          nome: vendedor ? vendedor.nome : 'Vendedor Desconhecido',
          cargo: vendedor ? vendedor.cargo : null,
          ...data,
        };
      })
      .filter((item) => item.cargo?.toLowerCase() === 'vendedor')
      .sort((a, b) => b.valor - a.valor);
  }, [vendas, usuarios, mesRef, adminLabel]);

  const formatarMoeda = (valor) =>
    (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const gerarTextoRelatorio = () => {
    let texto = `RELATÓRIO DE VENDAS ${adminLabel} - ${mesLabel.toUpperCase()}\n\n`;
    relatorio.forEach((item) => {
      texto += `${item.nome.toUpperCase()}: ${item.cotas} COTAS - ${formatarMoeda(item.valor)}\n`;
    });
    return texto;
  };

  const copiarParaClipboard = () => {
    navigator.clipboard.writeText(gerarTextoRelatorio()).then(
      () => {
        setCopySuccess('Copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
      },
      () => setCopySuccess('Falha ao copiar.')
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 animate-fade-in">
        <header className="p-3 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-base font-semibold text-white">
            Relatório de Vendas {adminLabel} — {mesLabel}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={18} />
          </button>
        </header>

        <div className="p-3 border-b border-gray-700 flex flex-wrap items-center gap-2">
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 text-white"
            aria-label="Mês"
          >
            {OPCOES_MES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="bg-gray-700 px-2.5 py-1.5 text-sm rounded-md border border-gray-600 text-white"
            aria-label="Ano"
          >
            {opcoesAno.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <pre className="bg-gray-900 p-3 rounded-lg text-white font-mono whitespace-pre-wrap text-sm">
            {relatorio.length > 0
              ? gerarTextoRelatorio()
              : `Nenhuma venda ${adminLabel} encontrada para este mês.`}
          </pre>
        </div>

        <footer className="p-3 flex justify-end border-t border-gray-700">
          <button
            type="button"
            onClick={copiarParaClipboard}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2"
          >
            <FaClipboard size={14} /> {copySuccess || 'Copiar Relatório'}
          </button>
        </footer>
      </div>
    </div>
  );
}
