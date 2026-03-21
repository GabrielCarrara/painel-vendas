// src/components/RelatorioGeralModal.js — comissão mensal: P1 do mês anterior; P2/P3 liberadas no mês do filtro
import React, { useMemo } from 'react';
import { FaTimes, FaPrint } from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import {
  isParcelaCheia,
  valorComissaoParcela,
  mesAnteriorYYYYMM,
  normalizarMesVenda,
  totalComissaoP1RecebidaNoMes,
  totaisPagamentosP2P3,
  calcularEstornoMes,
  dayjsMesRef,
} from '../utils/comissoes';

function mesmoUsuario(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** P2 ou P3 contabilizada no mês do relatório (pagamentos_comissao + venda ainda PAGO). */
function valorComissaoP2P3NoMes(pagamentosDoMes, venda, parcelaIndex, usuarioId) {
  const temRegistro = (pagamentosDoMes || []).some(
    (p) =>
      mesmoUsuario(p.usuario_id, usuarioId) &&
      String(p.venda_id) === String(venda.id) &&
      p.parcela_index === parcelaIndex
  );
  if (!temRegistro) return 0;
  if (venda[`status_parcela_${parcelaIndex}`] !== 'PAGO') return 0;
  return valorComissaoParcela(venda, parcelaIndex);
}

export default function RelatorioGeralModal({
  vendas,
  usuarios,
  filtros,
  listaFiliais,
  pagamentosDoMes = [],
  onClose,
}) {
  const relatorio = useMemo(() => {
    dayjs.locale('pt-br');
    const mesComissao = filtros.mes;
    const dMes = dayjsMesRef(mesComissao);
    const mesLabel = dMes.format('MMMM [de] YYYY');
    const mesVendaP1 = mesAnteriorYYYYMM(mesComissao);
    const mesVendasP1Label = dayjsMesRef(mesVendaP1).format('MMMM [de] YYYY');

    const filialSelecionada = listaFiliais.find((f) => String(f.id) === String(filtros.filial));
    const filialLabel = filialSelecionada ? filialSelecionada.nome : 'Todas as Filiais';

    const usuariosFiltrados = filtros.filial
      ? usuarios.filter((u) => String(u.id_filial) === String(filtros.filial))
      : usuarios;

    const vendasPorId = {};
    (vendas || []).forEach((v) => {
      if (v && v.id != null) vendasPorId[String(v.id)] = v;
    });

    const dadosAgrupados = usuariosFiltrados
      .map((vendedor) => {
        const uid = vendedor.id;
        const ids = new Set();

        (vendas || []).forEach((v) => {
          if (!mesmoUsuario(v.usuario_id, uid)) return;
          if (normalizarMesVenda(v.mes) === mesVendaP1 && v.status_parcela_1 === 'PAGO') {
            ids.add(v.id);
          }
        });

        (pagamentosDoMes || []).forEach((p) => {
          if (!mesmoUsuario(p.usuario_id, uid)) return;
          if (p.parcela_index !== 2 && p.parcela_index !== 3) return;
          ids.add(p.venda_id);
        });

        const linhas = [...ids]
          .map((id) => vendasPorId[String(id)])
          .filter(Boolean)
          .map((venda) => {
            const mesV = normalizarMesVenda(venda.mes);
            const entraP1 = mesV === mesVendaP1;
            const valorP1 =
              entraP1 && venda.status_parcela_1 === 'PAGO' ? valorComissaoParcela(venda, 1) : null;
            const valorP2 = valorComissaoP2P3NoMes(pagamentosDoMes, venda, 2, uid);
            const valorP3 = valorComissaoP2P3NoMes(pagamentosDoMes, venda, 3, uid);
            return { venda, valorP1, valorP2, valorP3, entraP1 };
          })
          .sort((a, b) => (a.venda.cliente || '').localeCompare(b.venda.cliente || ''));

        const vendasDoVendedorFull = (vendas || []).filter((v) => mesmoUsuario(v.usuario_id, uid));

        const totalVendido = linhas.reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);
        const totalVendidoGazin = linhas
          .filter(({ venda }) => venda.administradora === 'GAZIN')
          .reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);
        const totalVendidoHS = linhas
          .filter(({ venda }) => venda.administradora === 'HS')
          .reduce((acc, { venda }) => acc + (parseFloat(venda.valor) || 0), 0);

        const totalComissaoP1 = totalComissaoP1RecebidaNoMes(vendasDoVendedorFull, uid, mesComissao);
        const { totalComissaoP2Liberada, totalComissaoP3Liberada } = totaisPagamentosP2P3(
          pagamentosDoMes,
          uid,
          vendasPorId
        );
        const { totalEstorno } = calcularEstornoMes(vendasDoVendedorFull, mesComissao);
        const totalComissaoLiquida =
          totalComissaoP1 + totalComissaoP2Liberada + totalComissaoP3Liberada - totalEstorno;

        return {
          id: vendedor.id,
          nome: vendedor.nome,
          linhas,
          totalVendido,
          totalVendidoGazin,
          totalVendidoHS,
          totalComissaoP1,
          totalComissaoP2Liberada,
          totalComissaoP3Liberada,
          totalEstorno,
          totalComissaoLiquida,
        };
      })
      .filter((v) => v.linhas.length > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return {
      mesLabel,
      mesVendasP1Label,
      filialLabel,
      dadosAgrupados,
    };
  }, [vendas, usuarios, filtros, listaFiliais, pagamentosDoMes]);

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
        .na { color: #666; }
      </style>
    `;

    document.body.innerHTML = printStyles + printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const formatarMoeda = (valor) => (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const celP1 = (valorP1, entraP1) => {
    if (!entraP1) return <span className="na">—</span>;
    return formatarMoeda(valorP1);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-700 animate-fade-in flex flex-col">
        <header className="p-4 flex justify-between items-center border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Relatório de Comissão Mensal</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full">
            <FaTimes size={20} />
          </button>
        </header>

        <div id="relatorio-geral-print-area" className="p-6 max-h-[70vh] overflow-y-auto">
          <h1 className="text-white print:text-black">Relatório de Comissão Mensal</h1>
          <h3 className="text-gray-300 print:text-black">
            Mês de pagamento (comissão): {relatorio.mesLabel}
          </h3>
          <h3 className="text-gray-300 print:text-black text-sm mt-1">
            P1: vendas lançadas em {relatorio.mesVendasP1Label}. P2 e P3: valores conferidos como PAGO neste
            mês (qualquer mês de lançamento da venda).
          </h3>
          <h3 className="text-gray-300 print:text-black">Filial: {relatorio.filialLabel}</h3>

          {relatorio.dadosAgrupados.length === 0 && (
            <p className="text-gray-400">Nenhuma linha de comissão para os filtros selecionados.</p>
          )}

          {relatorio.dadosAgrupados.map((vendedor) => (
            <div key={vendedor.id} style={{ breakInside: 'avoid' }}>
              <h2 className="text-white print:text-black">VENDEDOR: {vendedor.nome.toUpperCase()}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Mês venda</th>
                    <th>Admin</th>
                    <th>Grupo/Cota</th>
                    <th>Parcela</th>
                    <th className="valor">Valor</th>
                    <th className="valor">Comissão P1</th>
                    <th className="valor">Comissão P2</th>
                    <th className="valor">Comissão P3</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedor.linhas.map(({ venda, valorP1, valorP2, valorP3, entraP1 }) => (
                    <tr key={venda.id}>
                      <td>{venda.cliente}</td>
                      <td>{dayjsMesRef(venda.mes).format('MM/YYYY')}</td>
                      <td>{venda.administradora}</td>
                      <td>
                        {venda.grupo}/{venda.cota}
                      </td>
                      <td className={isParcelaCheia(venda) ? 'parcela-cheia' : 'parcela-meia'}>
                        {isParcelaCheia(venda) ? 'Cheia' : 'Meia'}
                      </td>
                      <td className="valor">{formatarMoeda(venda.valor)}</td>
                      <td className="valor">{celP1(valorP1, entraP1)}</td>
                      <td className="valor">{formatarMoeda(valorP2)}</td>
                      <td className="valor">{formatarMoeda(valorP3)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5">Total valor das vendas (linhas acima):</td>
                    <td className="valor">{formatarMoeda(vendedor.totalVendido)}</td>
                    <td colSpan="3" />
                  </tr>
                  <tr>
                    <td colSpan="5">Total Vendido GAZIN:</td>
                    <td className="valor">{formatarMoeda(vendedor.totalVendidoGazin)}</td>
                    <td colSpan="3" />
                  </tr>
                  <tr>
                    <td colSpan="5">Total Vendido HS:</td>
                    <td className="valor">{formatarMoeda(vendedor.totalVendidoHS)}</td>
                    <td colSpan="3" />
                  </tr>
                  <tr>
                    <td colSpan="6">Total comissão P1 (mês venda {relatorio.mesVendasP1Label}):</td>
                    <td className="valor">{formatarMoeda(vendedor.totalComissaoP1)}</td>
                    <td colSpan="2" />
                  </tr>
                  <tr>
                    <td colSpan="6">Total comissão P2 liberada neste mês:</td>
                    <td className="valor">{formatarMoeda(vendedor.totalComissaoP2Liberada)}</td>
                    <td colSpan="2" />
                  </tr>
                  <tr>
                    <td colSpan="6">Total comissão P3 liberada neste mês:</td>
                    <td className="valor">{formatarMoeda(vendedor.totalComissaoP3Liberada)}</td>
                    <td colSpan="2" />
                  </tr>
                  <tr>
                    <td colSpan="6">Total estorno (P2–P5 conferidos neste mês):</td>
                    <td className="valor">{formatarMoeda(vendedor.totalEstorno)}</td>
                    <td colSpan="2" />
                  </tr>
                  <tr>
                    <td colSpan="6">Total líquido a receber (P1 + P2 + P3 − estorno):</td>
                    <td className="valor">{formatarMoeda(vendedor.totalComissaoLiquida)}</td>
                    <td colSpan="2" />
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
