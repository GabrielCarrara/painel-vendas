import React, { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaPlus, FaTrash } from 'react-icons/fa';
import { apenasDigitos } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const UF_PADRAO = 'MT';
const BADGE_ANEXO = 'OBRIGATÓRIO ENVIAR O IPTU OU MATRICULA';

const TIPOS_IMOVEL = ['APARTAMENTO', 'COMERCIAL', 'CASA', 'TERRENO', 'MISTO', 'RURAL'];

const TIPOS_OPERACAO = [
  { id: 'compra_venda', label: 'COMPRA E VENDA' },
  { id: 'reforma', label: 'REFORMA' },
  { id: 'construcao', label: 'CONSTRUÇÃO' },
  { id: 'etapa_constr', label: 'ETAPA DE CONSTR.' },
  { id: 'outros', label: 'OUTROS ->' },
];

function SelectUf({ value, onChange }) {
  return (
    <select
      className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SIGLAS_UF_BR.map((sigla) => (
        <option key={sigla} value={sigla}>
          {sigla}
        </option>
      ))}
    </select>
  );
}

function formatarParesGrupoCota(pares) {
  const ok = pares.filter((p) => String(p.grupo || '').trim() && String(p.cota || '').trim());
  return ok.map((p) => `${String(p.grupo).trim()} / ${String(p.cota).trim()}`).join(' - ');
}

function formatarTelefone(ddd, telefone) {
  const d = apenasDigitos(ddd).slice(0, 2);
  const n = apenasDigitos(telefone).slice(0, 11);
  if (!d || n.length < 8) return '';
  const corpo = n.length === 9 ? `${n.slice(0, 5)}-${n.slice(5)}` : `${n.slice(0, 4)}-${n.slice(4)}`;
  return `(${d}) ${corpo}`;
}

export default function VistoriaAntecipadaEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [gerandoXlsx, setGerandoXlsx] = useState(false);

  const [gruposCotas, setGruposCotas] = useState([{ grupo: '', cota: '' }]);
  const [nome, setNome] = useState('');
  const [ddd, setDdd] = useState('');
  const [telefone, setTelefone] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState(UF_PADRAO);
  const [tipoImovel, setTipoImovel] = useState('');

  const [anexoIptu, setAnexoIptu] = useState(false);
  const [anexoMatricula, setAnexoMatricula] = useState(false);
  const [iptu, setIptu] = useState('');
  const [matricula, setMatricula] = useState('');

  const [tipoOperacao, setTipoOperacao] = useState('');
  const [valorCompra, setValorCompra] = useState('');
  const [alternative, setAlternative] = useState(''); // SIM | NAO
  const [valorReforma, setValorReforma] = useState('');
  const [valorConst, setValorConst] = useState('');
  const [etapaConst, setEtapaConst] = useState('');
  const [outros, setOutros] = useState('');

  const textoGrupoCota = useMemo(() => formatarParesGrupoCota(gruposCotas), [gruposCotas]);
  const telefoneFmt = useMemo(() => formatarTelefone(ddd, telefone), [ddd, telefone]);

  const adicionarGrupoCota = () => setGruposCotas((prev) => [...prev, { grupo: '', cota: '' }]);
  const removerGrupoCota = (index) => {
    setGruposCotas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };
  const atualizarGrupoCota = (index, campo, valor) => {
    setGruposCotas((prev) => prev.map((row, i) => (i === index ? { ...row, [campo]: valor } : row)));
  };

  const validar = useCallback(() => {
    if (!textoGrupoCota) return 'Informe pelo menos um par Grupo e Cota.';
    if (!nome.trim()) return 'Informe o nome do consorciado ou responsável pela vistoria.';
    const d = apenasDigitos(ddd);
    const t = apenasDigitos(telefone);
    if (d.length !== 2) return 'DDD deve ter 2 dígitos.';
    if (t.length < 8 || t.length > 9) return 'Telefone deve ter 8 ou 9 dígitos (sem DDD).';
    if (!logradouro.trim()) return 'Informe o endereço do imóvel (com número, se houver).';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (!cidade.trim()) return 'Informe a cidade.';
    if (!uf || uf.length !== 2) return 'Selecione a UF.';
    if (!tipoImovel) return 'Selecione o tipo do imóvel.';
    if (anexoIptu && !iptu.trim()) return 'Informe o número do IPTU (anexo IPTU marcado).';
    if (anexoMatricula && !matricula.trim()) return 'Informe o número da matrícula (anexo matrícula marcado).';
    if (!anexoIptu && !anexoMatricula) return 'Marque ao menos um anexo (IPTU e/ou Matrícula).';
    if (!tipoOperacao) return 'Selecione uma característica da operação.';
    if (tipoOperacao === 'compra_venda') {
      if (!valorCompra.trim()) return 'Informe o valor da negociação (compra e venda).';
      if (!alternative) return 'Selecione SIM ou NÃO na pergunta sobre venda entre ascendentes/descendentes.';
    }
    if (tipoOperacao === 'reforma' && !valorReforma.trim()) return 'Informe o valor (reforma).';
    if (tipoOperacao === 'construcao' && !valorConst.trim()) return 'Informe o valor (construção).';
    if (tipoOperacao === 'etapa_constr' && !etapaConst.trim()) return 'Informe o valor ou descrição (etapa de constr.).';
    if (tipoOperacao === 'outros' && !outros.trim()) return 'Descreva / informe o valor em OUTROS.';
    return null;
  }, [
    textoGrupoCota,
    nome,
    ddd,
    telefone,
    logradouro,
    bairro,
    cidade,
    uf,
    tipoImovel,
    anexoIptu,
    anexoMatricula,
    iptu,
    matricula,
    tipoOperacao,
    valorCompra,
    alternative,
    valorReforma,
    valorConst,
    etapaConst,
    outros,
  ]);

  const montarLinhasOperacaoPdf = () => {
    const linhas = TIPOS_OPERACAO.map((op) => {
      let valor = '—';
      let extra = '—';
      if (op.id === 'compra_venda') {
        valor = tipoOperacao === 'compra_venda' ? valorCompra.trim() || '—' : '—';
        extra =
          tipoOperacao === 'compra_venda'
            ? alternative === 'SIM'
              ? 'SIM'
              : alternative === 'NAO'
                ? 'NÃO'
                : '—'
            : '—';
      } else if (op.id === 'reforma') {
        valor = tipoOperacao === 'reforma' ? valorReforma.trim() || '—' : '—';
      } else if (op.id === 'construcao') {
        valor = tipoOperacao === 'construcao' ? valorConst.trim() || '—' : '—';
      } else if (op.id === 'etapa_constr') {
        valor = tipoOperacao === 'etapa_constr' ? etapaConst.trim() || '—' : '—';
      } else if (op.id === 'outros') {
        valor = tipoOperacao === 'outros' ? outros.trim() || '—' : '—';
      }
      return { label: op.label, valor, extra };
    });
    return linhas;
  };

  const gerarPdf = async () => {
    const err = validar();
    if (err) {
      window.alert(err);
      return;
    }
    const el = printRef.current;
    if (!el) return;
    setGerandoPdf(true);
    try {
      await awaitDocumentImagesReady(el);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      const finalW = imgW * ratio;
      const finalH = imgH * ratio;
      const x = (pdfW - finalW) / 2;
      const y = (pdfH - finalH) / 2;
      pdf.addImage(imgData, 'PNG', x, y, finalW, finalH);
      pdf.save(`vistoria_antecipada_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const gerarXlsx = () => {
    const err = validar();
    if (err) {
      window.alert(err);
      return;
    }
    setGerandoXlsx(true);
    try {
      const linhasOp = montarLinhasOperacaoPdf();
      const dados = [
        ['VISTORIA ANTECIPADA'],
        [BADGE_ANEXO],
        [],
        ['GRUPO/COTA', textoGrupoCota],
        [],
        ['DADOS DO CLIENTE'],
        ['NOME:', nome.trim()],
        [],
        ['DADOS DO IMÓVEL'],
        ['Contato Vistoria:', nome.trim()],
        ['Telefone (DDD):', telefoneFmt],
        ['Endereço do imóvel:', logradouro.trim()],
        ['Bairro:', bairro.trim()],
        ['Cidade/UF:', `${cidade.trim()} / ${uf}`],
        ['Tipo do Imóvel:', tipoImovel],
        [],
        ['ANEXOS'],
        ['IPTU (Urbano) / CCIR - CAR (Rural)', anexoIptu ? iptu.trim() : '—'],
        ['Matrícula de inteiro teor', anexoMatricula ? matricula.trim() : '—'],
        [],
        ['Características da Operação', 'valor da negociação', 'Venda/compra ascendentes-descendentes ou PF-empresa'],
        ...linhasOp.map((r) => [r.label, r.valor, r.extra]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vistoria');
      XLSX.writeFile(wb, `vistoria_antecipada_${Date.now()}.xlsx`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o Excel. Tente novamente.');
    } finally {
      setGerandoXlsx(false);
    }
  };

  const fieldClass = 'mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white';
  const labelClass = 'block text-sm text-gray-400';
  const linhasOpPreview = montarLinhasOperacaoPdf();

  const cell = (style = {}) => ({
    border: '1px solid #333',
    padding: '6px 8px',
    fontSize: '9pt',
    verticalAlign: 'top',
    ...style,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600"
        >
          <FaArrowLeft /> Voltar
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-white">Vistoria antecipada</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-amber-200 sm:text-[10px]">
            ({BADGE_ANEXO})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-10rem)] space-y-4 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Grupo / Cota</legend>
            {gruposCotas.map((row, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className={`${labelClass} min-w-[100px] flex-1`}>
                  Grupo
                  <input
                    className={fieldClass}
                    value={row.grupo}
                    onChange={(e) => atualizarGrupoCota(index, 'grupo', e.target.value)}
                  />
                </label>
                <label className={`${labelClass} min-w-[100px] flex-1`}>
                  Cota
                  <input
                    className={fieldClass}
                    value={row.cota}
                    onChange={(e) => atualizarGrupoCota(index, 'cota', e.target.value)}
                  />
                </label>
                <div className="flex gap-1 pb-1">
                  <button
                    type="button"
                    onClick={adicionarGrupoCota}
                    className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500"
                    title="Adicionar grupo/cota"
                  >
                    <FaPlus />
                  </button>
                  {gruposCotas.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removerGrupoCota(index)}
                      className="rounded-lg bg-red-900/80 p-2 text-white hover:bg-red-800"
                      title="Remover"
                    >
                      <FaTrash />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">No documento: pares separados por traço (ex.: 288 / 1047 - 10 / 22).</p>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Cliente e imóvel</legend>
            <label className={labelClass}>
              Nome (consorciado ou responsável pela vistoria)
              <input className={fieldClass} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                DDD
                <input
                  className={fieldClass}
                  value={ddd}
                  onChange={(e) => setDdd(apenasDigitos(e.target.value).slice(0, 2))}
                  inputMode="numeric"
                  placeholder="00"
                />
              </label>
              <label className={labelClass}>
                Telefone
                <input
                  className={fieldClass}
                  value={telefone}
                  onChange={(e) => setTelefone(apenasDigitos(e.target.value).slice(0, 9))}
                  inputMode="numeric"
                  placeholder="Somente números"
                />
              </label>
            </div>
            {telefoneFmt ? <p className="text-xs text-gray-500">No documento: {telefoneFmt}</p> : null}
            <label className={labelClass}>
              Endereço do imóvel (rua e número)
              <input className={fieldClass} value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </label>
            <label className={labelClass}>
              Bairro
              <input className={fieldClass} value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Cidade
                <input className={fieldClass} value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </label>
              <label className={labelClass}>
                UF
                <SelectUf value={uf} onChange={setUf} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-indigo-300">Tipo do imóvel</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TIPOS_IMOVEL.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="tipoImovel"
                    checked={tipoImovel === t}
                    onChange={() => setTipoImovel(t)}
                    className="text-indigo-500"
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Anexos</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={anexoIptu} onChange={(e) => setAnexoIptu(e.target.checked)} className="rounded" />
              IPTU (Urbano) / CCIR - CAR (Rural)
            </label>
            {anexoIptu ? (
              <label className={labelClass}>
                Nº IPTU / referência
                <input className={fieldClass} value={iptu} onChange={(e) => setIptu(e.target.value)} />
              </label>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={anexoMatricula} onChange={(e) => setAnexoMatricula(e.target.checked)} className="rounded" />
              Matrícula de inteiro teor
            </label>
            {anexoMatricula ? (
              <label className={labelClass}>
                Nº matrícula
                <input className={fieldClass} value={matricula} onChange={(e) => setMatricula(e.target.value)} />
              </label>
            ) : null}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Características da operação</legend>
            <div className="space-y-2">
              {TIPOS_OPERACAO.map((op) => (
                <label key={op.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input
                    type="radio"
                    name="tipoOperacao"
                    checked={tipoOperacao === op.id}
                    onChange={() => setTipoOperacao(op.id)}
                    className="text-indigo-500"
                  />
                  {op.label}
                </label>
              ))}
            </div>
            {tipoOperacao === 'compra_venda' ? (
              <div className="space-y-3 rounded-lg border border-gray-600 p-3">
                <label className={labelClass}>
                  Valor da negociação
                  <input className={fieldClass} value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} placeholder="R$ ou valor" />
                </label>
                <div>
                  <span className="text-sm text-gray-400">Venda/compra entre ascendentes, descentes ou PF → empresa</span>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="radio" name="alt" checked={alternative === 'SIM'} onChange={() => setAlternative('SIM')} />
                      SIM
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="radio" name="alt" checked={alternative === 'NAO'} onChange={() => setAlternative('NAO')} />
                      NÃO
                    </label>
                  </div>
                </div>
              </div>
            ) : null}
            {tipoOperacao === 'reforma' ? (
              <label className={labelClass}>
                Valor (reforma)
                <input className={fieldClass} value={valorReforma} onChange={(e) => setValorReforma(e.target.value)} />
              </label>
            ) : null}
            {tipoOperacao === 'construcao' ? (
              <label className={labelClass}>
                Valor (construção)
                <input className={fieldClass} value={valorConst} onChange={(e) => setValorConst(e.target.value)} />
              </label>
            ) : null}
            {tipoOperacao === 'etapa_constr' ? (
              <label className={labelClass}>
                Valor / etapa (etapa de constr.)
                <input className={fieldClass} value={etapaConst} onChange={(e) => setEtapaConst(e.target.value)} />
              </label>
            ) : null}
            {tipoOperacao === 'outros' ? (
              <label className={labelClass}>
                Descrição / valor (outros)
                <input className={fieldClass} value={outros} onChange={(e) => setOutros(e.target.value)} />
              </label>
            ) : null}
          </fieldset>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={gerarPdf}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <FaFilePdf /> {gerandoPdf ? 'Gerando PDF…' : 'GERAR PDF'}
            </button>
            <button
              type="button"
              disabled={gerandoXlsx}
              onClick={gerarXlsx}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <FaFileExcel /> {gerandoXlsx ? 'Gerando Excel…' : 'GERAR EXCEL'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-gray-400">Pré-visualização (PDF)</h3>
          <div
            ref={printRef}
            className="mx-auto bg-white text-black shadow-lg"
            style={{
              width: '210mm',
              maxWidth: '100%',
              minHeight: '297mm',
              padding: '12mm',
              fontFamily: 'Arial, Helvetica Neue, Helvetica, sans-serif',
              fontSize: '9pt',
              lineHeight: 1.35,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo />
            <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 10px', fontSize: '11pt' }}>VISTORIA ANTECIPADA</p>
            <p
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '8pt',
                margin: '0 0 10px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {BADGE_ANEXO}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <span>
                <strong>GRUPO/COTA</strong> {textoGrupoCota || '…'}
              </span>
            </div>

            <p style={{ fontWeight: 'bold', margin: '0 0 6px' }}>DADOS DO CLIENTE:</p>
            <p style={{ margin: '0 0 10px' }}>
              <strong>NOME:</strong> {nome.trim() || '…'}
            </p>

            <p style={{ fontWeight: 'bold', margin: '10px 0 6px' }}>DADOS DO IMÓVEL</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={cell({ width: '38%' })}>Contato Vistoria:</td>
                  <td style={cell()}>{nome.trim() || '…'}</td>
                </tr>
                <tr>
                  <td style={cell()}>Telefone (DDD):</td>
                  <td style={cell()}>{telefoneFmt || '…'}</td>
                </tr>
                <tr>
                  <td style={cell()}>Endereço do imóvel:</td>
                  <td style={cell()}>{logradouro.trim() || '…'}</td>
                </tr>
                <tr>
                  <td style={cell()}>Bairro:</td>
                  <td style={cell()}>{bairro.trim() || '…'}</td>
                </tr>
                <tr>
                  <td style={cell()}>Cidade/UF:</td>
                  <td style={cell()}>
                    {cidade.trim() || '…'} / {(uf || '').toUpperCase() || '…'}
                  </td>
                </tr>
                <tr>
                  <td style={cell()}>Tipo do Imóvel:</td>
                  <td style={cell()}>{tipoImovel || '…'}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontWeight: 'bold', margin: '10px 0 6px' }}>ANEXOS</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
              <tbody>
                <tr>
                  <td style={cell({ width: '6%', textAlign: 'center' })}>{anexoIptu ? '☑' : '☐'}</td>
                  <td style={cell()}>IPTU (Urbano) / CCIR - CAR (Rural)</td>
                  <td style={cell()}>{anexoIptu ? iptu.trim() || '…' : '—'}</td>
                </tr>
                <tr>
                  <td style={cell({ textAlign: 'center' })}>{anexoMatricula ? '☑' : '☐'}</td>
                  <td style={cell()}>Matrícula de inteiro teor</td>
                  <td style={cell()}>{anexoMatricula ? matricula.trim() || '…' : '—'}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontWeight: 'bold', margin: '10px 0 6px' }}>Características da Operação</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={cell({ fontWeight: 'bold', background: '#f0f0f0' })}>Características da Operação</th>
                  <th style={cell({ fontWeight: 'bold', background: '#f0f0f0' })}>valor da negociação</th>
                  <th style={cell({ fontWeight: 'bold', background: '#f0f0f0', fontSize: '7.5pt' })}>
                    Trata-se de uma venda/compra de ascendentes para descentes (vice-versa) ou de sócio pessoa física para sua empresa
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhasOpPreview.map((r) => {
                  const opDaLinha = TIPOS_OPERACAO.find((o) => o.label === r.label);
                  const selecionada = opDaLinha && opDaLinha.id === tipoOperacao;
                  return (
                    <tr key={r.label}>
                      <td style={{ ...cell(), fontWeight: selecionada ? 'bold' : 'normal' }}>{r.label}</td>
                      <td style={cell()}>{r.valor}</td>
                      <td style={cell()}>{r.extra}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
