import React, { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf, FaPlus, FaTrash } from 'react-icons/fa';
import { apenasDigitos, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const CIDADE_PADRAO = 'PONTES E LACERDA';
const UF_PADRAO = 'MT';
const BADGE_FIRMA_GOV = 'RECONHECIDO FIRMA / ASSINATURA GOV';

function cpfOuCnpjCompleto(digitos) {
  const n = apenasDigitos(digitos).length;
  return n === 11 || n === 14;
}

function SelectUf({ value, onChange }) {
  return (
    <select
      className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SIGLAS_UF_BR.map((uf) => (
        <option key={uf} value={uf}>
          {uf}
        </option>
      ))}
    </select>
  );
}

function formatarGruposCotasParaTexto(pares) {
  const ok = pares.filter((p) => String(p.grupo || '').trim() && String(p.cota || '').trim());
  return ok.map((p) => `GRUPO: ${String(p.grupo).trim()} / COTA: ${String(p.cota).trim()}`).join(', ');
}

export default function CancelamentoTransferenciaEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const [consorciado, setConsorciado] = useState('');
  const [gruposCotas, setGruposCotas] = useState([{ grupo: '', cota: '' }]);
  const [cpfConsorciado, setCpfConsorciado] = useState('');
  const [idConsorciado, setIdConsorciado] = useState('');
  const [orgaoCons, setOrgaoCons] = useState('');
  const [ufOrgaoCons, setUfOrgaoCons] = useState(UF_PADRAO);
  const [logradouroCons, setLogradouroCons] = useState('');
  const [numCons, setNumCons] = useState('');
  const [bairroCons, setBairroCons] = useState('');
  const [cidadeCons, setCidadeCons] = useState(CIDADE_PADRAO);
  const [ufCons, setUfCons] = useState(UF_PADRAO);

  const [cessionario, setCessionario] = useState('');
  const [cpfCess, setCpfCess] = useState('');
  const [idCess, setIdCess] = useState('');
  const [orgaoCess, setOrgaoCess] = useState('');
  const [ufOrgaoCess, setUfOrgaoCess] = useState(UF_PADRAO);
  const [logradouroCess, setLogradouroCess] = useState('');
  const [numCess, setNumCess] = useState('');
  const [bairroCess, setBairroCess] = useState('');
  const [cidadeCess, setCidadeCess] = useState(CIDADE_PADRAO);
  const [ufCess, setUfCess] = useState(UF_PADRAO);

  const cpfConsFmt = formatarCpfOuCnpj(cpfConsorciado);
  const cpfCessFmt = formatarCpfOuCnpj(cpfCess);
  const textoGruposCotas = useMemo(() => formatarGruposCotasParaTexto(gruposCotas), [gruposCotas]);

  const adicionarGrupoCota = () => {
    setGruposCotas((prev) => [...prev, { grupo: '', cota: '' }]);
  };

  const removerGrupoCota = (index) => {
    setGruposCotas((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const atualizarGrupoCota = (index, campo, valor) => {
    setGruposCotas((prev) => prev.map((row, i) => (i === index ? { ...row, [campo]: valor } : row)));
  };

  const validar = useCallback(() => {
    if (!consorciado.trim()) return 'Informe o nome do consorciado.';
    if (!textoGruposCotas) return 'Informe pelo menos um par Grupo e Cota.';
    if (!cpfOuCnpjCompleto(cpfConsorciado)) return 'CPF ou CNPJ do consorciado inválido (11 ou 14 dígitos).';
    if (!idConsorciado.trim()) return 'Informe o RG/IE do consorciado.';
    if (!orgaoCons.trim()) return 'Informe o órgão expedidor (consorciado).';
    if (!logradouroCons.trim() || !numCons.trim() || !bairroCons.trim()) return 'Preencha endereço completo do consorciado.';
    if (!cidadeCons.trim()) return 'Informe a cidade do consorciado.';
    if (!cessionario.trim()) return 'Informe o nome do cessionário.';
    if (!cpfOuCnpjCompleto(cpfCess)) return 'CPF ou CNPJ do cessionário inválido.';
    if (!idCess.trim()) return 'Informe o RG/IE do cessionário.';
    if (!orgaoCess.trim()) return 'Informe o órgão expedidor (cessionário).';
    if (!logradouroCess.trim() || !numCess.trim() || !bairroCess.trim()) return 'Preencha endereço completo do cessionário.';
    if (!cidadeCess.trim()) return 'Informe a cidade do cessionário.';
    return null;
  }, [
    consorciado,
    textoGruposCotas,
    cpfConsorciado,
    idConsorciado,
    orgaoCons,
    logradouroCons,
    numCons,
    bairroCons,
    cidadeCons,
    cessionario,
    cpfCess,
    idCess,
    orgaoCess,
    logradouroCess,
    numCess,
    bairroCess,
    cidadeCess,
  ]);

  const gerarPdf = async () => {
    const err = validar();
    if (err) {
      window.alert(err);
      return;
    }
    const el = printRef.current;
    if (!el) return;
    setGerando(true);
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
      const sufixo = apenasDigitos(cpfConsorciado).slice(0, 4) || 'doc';
      pdf.save(`cancelamento_transferencia_${sufixo}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const fieldClass = 'mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white';
  const labelClass = 'block text-sm text-gray-400';

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
          <h2 className="text-xl font-bold text-white">Solicitação do Cancelamento de Transferência</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_FIRMA_GOV})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Consorciado</legend>
            <label className={labelClass}>
              Nome
              <input className={fieldClass} value={consorciado} onChange={(e) => setConsorciado(e.target.value)} />
            </label>

            <div>
              <span className={labelClass}>Grupo e cota</span>
              <p className="mb-2 text-xs text-gray-500">Um ou mais pares; no PDF ficam separados por vírgula.</p>
              <div className="space-y-2">
                {gruposCotas.map((row, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[100px] flex-1">
                      <span className="text-xs text-gray-500">Grupo</span>
                      <input
                        className={fieldClass}
                        value={row.grupo}
                        onChange={(e) => atualizarGrupoCota(index, 'grupo', e.target.value)}
                      />
                    </label>
                    <label className="min-w-[100px] flex-1">
                      <span className="text-xs text-gray-500">Cota</span>
                      <input
                        className={fieldClass}
                        value={row.cota}
                        onChange={(e) => atualizarGrupoCota(index, 'cota', e.target.value)}
                      />
                    </label>
                    {gruposCotas.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removerGrupoCota(index)}
                        className="mb-0.5 rounded-lg border border-red-800/60 p-2 text-red-300 hover:bg-red-900/30"
                        title="Remover par"
                      >
                        <FaTrash />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={adicionarGrupoCota}
                  className="mt-1 inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  <FaPlus /> Adicionar grupo/cota
                </button>
              </div>
            </div>

            <label className={labelClass}>
              CPF ou CNPJ
              <input
                className={fieldClass}
                value={cpfConsorciado}
                onChange={(e) => setCpfConsorciado(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {cpfConsorciado.length > 0 && (
                <span className="mt-1 block text-xs text-gray-500">No PDF: {cpfConsFmt}</span>
              )}
            </label>
            <label className={labelClass}>
              RG / Inscrição estadual (nº do documento)
              <input className={fieldClass} value={idConsorciado} onChange={(e) => setIdConsorciado(e.target.value)} />
            </label>
            <label className={labelClass}>
              Órgão expedidor
              <input className={fieldClass} value={orgaoCons} onChange={(e) => setOrgaoCons(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF do órgão expedidor
              <SelectUf value={ufOrgaoCons} onChange={setUfOrgaoCons} />
            </label>
            <label className={labelClass}>
              Logradouro
              <input className={fieldClass} value={logradouroCons} onChange={(e) => setLogradouroCons(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numCons} onChange={(e) => setNumCons(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={bairroCons} onChange={(e) => setBairroCons(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidadeCons} onChange={(e) => setCidadeCons(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF
              <SelectUf value={ufCons} onChange={setUfCons} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Cessionário</legend>
            <label className={labelClass}>
              Nome
              <input className={fieldClass} value={cessionario} onChange={(e) => setCessionario(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF ou CNPJ
              <input
                className={fieldClass}
                value={cpfCess}
                onChange={(e) => setCpfCess(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {cpfCess.length > 0 && <span className="mt-1 block text-xs text-gray-500">No PDF: {cpfCessFmt}</span>}
            </label>
            <label className={labelClass}>
              RG / Inscrição estadual
              <input className={fieldClass} value={idCess} onChange={(e) => setIdCess(e.target.value)} />
            </label>
            <label className={labelClass}>
              Órgão expedidor
              <input className={fieldClass} value={orgaoCess} onChange={(e) => setOrgaoCess(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF do órgão expedidor
              <SelectUf value={ufOrgaoCess} onChange={setUfOrgaoCess} />
            </label>
            <label className={labelClass}>
              Logradouro
              <input className={fieldClass} value={logradouroCess} onChange={(e) => setLogradouroCess(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numCess} onChange={(e) => setNumCess(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={bairroCess} onChange={(e) => setBairroCess(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidadeCess} onChange={(e) => setCidadeCess(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF
              <SelectUf value={ufCess} onChange={setUfCess} />
            </label>
          </fieldset>

          <button
            type="button"
            disabled={gerando}
            onClick={gerarPdf}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <FaFilePdf /> {gerando ? 'Gerando…' : 'GERAR PDF'}
          </button>
        </div>

        <div>
          <h3 className="mb-2 font-semibold text-gray-400">Pré-visualização</h3>
          <div
            ref={printRef}
            className="mx-auto bg-white text-black shadow-lg"
            style={{
              width: '210mm',
              maxWidth: '100%',
              minHeight: '297mm',
              padding: '16mm 18mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '11pt',
              lineHeight: 1.42,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo />
            <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 16px', fontSize: '12pt' }}>
              Solicitação do Cancelamento de Transferência
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 10mm' }}>
              Eu, <strong>{consorciado.trim() || '…'}</strong>, Titular do seguinte consorcio:{' '}
              <strong>{textoGruposCotas || '…'}</strong>, do <strong>CONSORCIO NACIONAL GAZIN</strong>, CPF/CNPJ nº{' '}
              <strong>{cpfConsFmt || '…'}</strong> e inscrito no RG/IE sob o nº <strong>{idConsorciado.trim() || '…'}</strong> - Órgão expedidor{' '}
              <strong>{orgaoCons.trim() || '…'}</strong> – <strong>{ufOrgaoCons || '…'}</strong>, residente e domiciliado(a) na{' '}
              <strong>{logradouroCons.trim() || '…'}</strong>, <strong>{numCons.trim() || '…'}</strong>, bairro <strong>{bairroCons.trim() || '…'}</strong>, cidade
              de <strong>{cidadeCons.trim() || '…'}</strong> – <strong>{ufCons || '…'}</strong>, pelo presente termo estou ciente em autorizar a{' '}
              <strong>Administradora de Consórcio Nacional Gazin LTDA</strong>, inscrita no CNPJ sob o nº <strong>06.044.551/0001-33</strong>, residente na{' '}
              <strong>Rua Pedrelina de Macedo e Silva nº 100, Jardim Leoni</strong>, a CANCELAR o instrumento particular de cessão e transferência de direitos e
              obrigações no nome do CESSIONÁRIO: <strong>{cessionario.trim() || '…'}</strong>, CPF/CNPJ nº <strong>{cpfCessFmt || '…'}</strong> e inscrito no RG/IE
              sob o nº <strong>{idCess.trim() || '…'}</strong>, Órgão expedidor <strong>{orgaoCess.trim() || '…'}</strong> – <strong>{ufOrgaoCess || '…'}</strong>,
              residente e domiciliado(a) na <strong>{logradouroCess.trim() || '…'}</strong>, <strong>{numCess.trim() || '…'}</strong>, bairro{' '}
              <strong>{bairroCess.trim() || '…'}</strong>, cidade de <strong>{cidadeCess.trim() || '…'}</strong> – <strong>{ufCess || '…'}</strong>, solicitando assim
              o cancelamento da transferência, fazendo declarar ciente o Consorciado e Cessionário.
            </p>

            <div style={{ marginTop: '16mm' }}>
              <div style={{ minHeight: '24mm', marginBottom: '2mm' }} aria-hidden />
              <div style={{ borderTop: '1px solid #000', width: '88%', margin: '0 auto 8pt' }} />
              <p style={{ textAlign: 'center', margin: '0 0 2pt', fontWeight: 'bold', fontSize: '10pt' }}>
                CONSORCIADO: {consorciado.trim() || '…'}
              </p>
              <p style={{ textAlign: 'center', margin: 0, fontWeight: 'bold', fontSize: '10pt' }}>CPF/CNPJ: {cpfConsFmt || '…'}</p>
            </div>

            <div style={{ marginTop: '32mm' }}>
              <div style={{ minHeight: '24mm', marginBottom: '2mm' }} aria-hidden />
              <div style={{ borderTop: '1px solid #000', width: '88%', margin: '0 auto 8pt' }} />
              <p style={{ textAlign: 'center', margin: '0 0 2pt', fontWeight: 'bold', fontSize: '10pt' }}>
                CESSIONÁRIO: {cessionario.trim() || '…'}
              </p>
              <p style={{ textAlign: 'center', margin: 0, fontWeight: 'bold', fontSize: '10pt' }}>CPF/CNPJ: {cpfCessFmt || '…'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
