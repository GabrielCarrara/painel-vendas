// src/components/RelatorioGeralModal.js — comissão mensal: apenas P1 (vendas do mês anterior ao mês de pagamento)
import React, { useMemo } from 'react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import {
  isParcelaCheia,
  valorComissaoP1,
  normalizarMesVenda,
  dayjsMesRef,
} from '../utils/comissoes';

function mesmoUsuario(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RelatorioGeralModal({
  vendas = [],
  usuarios = [],
  filtros = {},
  listaFiliais = [],
  onClose,
}) {
  const relatorio = useMemo(() => {
    dayjs.locale('pt-br');
    // Usa o mesmo mês do filtro de vendas lançadas (mês das vendas / P1 a calcular)
    const mesVendas = filtros.mes || dayjs().format('YYYY-MM');
    const dMes = dayjsMesRef(mesVendas);
    const mesVendasLabel = dMes.format('MMMM [de] YYYY');
    const mesRecebimentoLabel = dMes.add(1, 'month').format('MMMM [de] YYYY');

    const filialSelecionada = (listaFiliais || []).find((f) => String(f.id) === String(filtros.filial));
    const filialLabel = filialSelecionada ? filialSelecionada.nome : 'Todas as Filiais';

    let usuariosFiltrados = filtros.filial
      ? (usuarios || []).filter((u) => String(u.id_filial) === String(filtros.filial))
      : (usuarios || []);

    if (filtros.vendedor) {
      usuariosFiltrados = usuariosFiltrados.filter((u) => mesmoUsuario(u.id, filtros.vendedor));
    }

    const mesVendasNorm = normalizarMesVenda(mesVendas);

    const dadosAgrupados = usuariosFiltrados
      .map((vendedor) => {
        const uid = vendedor.id;

        const linhas = (vendas || [])
          .filter((v) => {
            if (!mesmoUsuario(v.usuario_id, uid)) return false;
            if (normalizarMesVenda(v.mes) !== mesVendasNorm) return false;
            if (filtros.administradora && v.administradora !== filtros.administradora) return false;
            return true;
          })
          .map((venda) => ({ venda, valorP1: valorComissaoP1(venda) }))
          .sort((a, b) => (a.venda.cliente || '').localeCompare(b.venda.cliente || ''));

        const totalVendido = linhas.reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);
        const totalVendidoGazin = linhas
          .filter(({ venda }) => venda.administradora === 'GAZIN')
          .reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);
        const totalVendidoHS = linhas
          .filter(({ venda }) => venda.administradora === 'HS')
          .reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);
        const totalComissaoP1 = linhas.reduce((acc, { valorP1 }) => acc + valorP1, 0);

        return {
          id: vendedor.id,
          nome: vendedor.nome || 'Sem nome',
          linhas,
          totalVendido,
          totalVendidoGazin,
          totalVendidoHS,
          totalComissaoP1,
        };
      })
      .filter((v) => v.linhas.length > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return {
      mesVendasLabel,
      mesRecebimentoLabel,
      filialLabel,
      dadosAgrupados,
    };
  }, [vendas, usuarios, filtros, listaFiliais]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Permita pop-ups no navegador para imprimir o relatório.');
      return;
    }

    const blocos = relatorio.dadosAgrupados
      .map((vendedor) => {
        const rows = vendedor.linhas
          .map(({ venda, valorP1 }) => {
            const tipo = isParcelaCheia(venda) ? 'Cheia' : 'Meia';
            return `<tr>
              <td>${venda.cliente || ''}</td>
              <td>${dayjsMesRef(venda.mes).format('MM/YYYY')}</td>
              <td>${venda.administradora || ''}</td>
              <td>${venda.grupo || ''}/${venda.cota || ''}</td>
              <td>${tipo}</td>
              <td class="valor">${formatarMoeda(venda.valor)}</td>
              <td class="valor">${formatarMoeda(valorP1)}</td>
            </tr>`;
          })
          .join('');

        return `
          <h2>VENDEDOR: ${String(vendedor.nome || '').toUpperCase()}</h2>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Mês venda</th>
                <th>Admin</th>
                <th>Grupo/Cota</th>
                <th>Parcela</th>
                <th class="valor">Valor</th>
                <th class="valor">Comissão P1</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="5">Total valor das vendas:</td>
                <td class="valor">${formatarMoeda(vendedor.totalVendido)}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="5">Total Vendido GAZIN:</td>
                <td class="valor">${formatarMoeda(vendedor.totalVendidoGazin)}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="5">Total Vendido HS:</td>
                <td class="valor">${formatarMoeda(vendedor.totalVendidoHS)}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="6">Total comissão P1 (vendas de ${relatorio.mesVendasLabel}):</td>
                <td class="valor">${formatarMoeda(vendedor.totalComissaoP1)}</td>
              </tr>
            </tfoot>
          </table>
        `;
      })
      .join('');

    const corpo =
      relatorio.dadosAgrupados.length === 0
        ? `<p>Nenhuma venda encontrada para comissão P1 em ${relatorio.mesVendasLabel}.</p>`
        : blocos;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Relatório de Comissão Mensal</title>
  <style>
    body { background: #fff; color: #000; margin: 20px; font-family: Arial, sans-serif; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 13px; font-weight: normal; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; color: #000; }
    th { background: #f0f0f0; }
    tfoot td { font-weight: bold; background: #f9f9f9; }
    .valor { text-align: right; }
  </style>
</head>
<body>
  <h1>Relatório de Comissão Mensal</h1>
  <h3>Vendas do mês: ${relatorio.mesVendasLabel}</h3>
  <h3>Comissão P1 a receber em ${relatorio.mesRecebimentoLabel}.</h3>
  <h3>Filial: ${relatorio.filialLabel}</h3>
  ${corpo}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-700 animate-fade-in flex flex-col max-h-[90vh]">
        <header className="p-4 flex justify-between items-center border-b border-gray-700 shrink-0">
          <h3 className="text-lg font-semibold text-white">Relatório de Comissão Mensal</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={20} />
          </button>
        </header>

        <div className="p-6 overflow-y-auto text-gray-200">
          <h1 className="text-xl font-bold text-white mb-2">Relatório de Comissão Mensal</h1>
          <p className="text-sm text-gray-300">Vendas do mês: {relatorio.mesVendasLabel}</p>
          <p className="text-sm text-gray-300">Comissão P1 a receber em {relatorio.mesRecebimentoLabel}.</p>
          <p className="text-sm text-gray-300 mb-4">Filial: {relatorio.filialLabel}</p>

          {relatorio.dadosAgrupados.length === 0 && (
            <p className="text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              Nenhuma venda encontrada para <strong>{relatorio.mesVendasLabel}</strong> com os filtros atuais.
            </p>
          )}

          {relatorio.dadosAgrupados.map((vendedor) => (
            <div key={vendedor.id} className="mb-8">
              <h2 className="text-base font-bold text-white border-b border-gray-600 pb-2 mb-3">
                VENDEDOR: {String(vendedor.nome || '').toUpperCase()}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-600">
                      <th className="px-2 py-2">Cliente</th>
                      <th className="px-2 py-2">Mês venda</th>
                      <th className="px-2 py-2">Admin</th>
                      <th className="px-2 py-2">Grupo/Cota</th>
                      <th className="px-2 py-2">Parcela</th>
                      <th className="px-2 py-2 text-right">Valor</th>
                      <th className="px-2 py-2 text-right">Comissão P1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendedor.linhas.map(({ venda, valorP1 }) => (
                      <tr key={venda.id} className="border-b border-gray-700/60">
                        <td className="px-2 py-2 text-white">{venda.cliente}</td>
                        <td className="px-2 py-2">{dayjsMesRef(venda.mes).format('MM/YYYY')}</td>
                        <td className="px-2 py-2">{venda.administradora}</td>
                        <td className="px-2 py-2">{venda.grupo}/{venda.cota}</td>
                        <td className="px-2 py-2">{isParcelaCheia(venda) ? 'Cheia' : 'Meia'}</td>
                        <td className="px-2 py-2 text-right text-green-400">{formatarMoeda(venda.valor)}</td>
                        <td className="px-2 py-2 text-right text-cyan-300 font-semibold">{formatarMoeda(valorP1)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-600">
                      <td colSpan={5} className="px-2 py-2 font-semibold">Total valor das vendas:</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatarMoeda(vendedor.totalVendido)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-2 py-2">Total Vendido GAZIN:</td>
                      <td className="px-2 py-2 text-right">{formatarMoeda(vendedor.totalVendidoGazin)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-2 py-2">Total Vendido HS:</td>
                      <td className="px-2 py-2 text-right">{formatarMoeda(vendedor.totalVendidoHS)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-2 py-2 font-semibold text-white">
                        Total comissão P1 (vendas de {relatorio.mesVendasLabel}):
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-cyan-300">
                        {formatarMoeda(vendedor.totalComissaoP1)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>

        <footer className="p-4 flex justify-end gap-4 border-t border-gray-700 shrink-0">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 px-5 py-2 rounded-lg font-semibold">
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={relatorio.dadosAgrupados.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <FaPrint /> Imprimir Relatório
          </button>
        </footer>
      </div>
    </div>
  );
}
