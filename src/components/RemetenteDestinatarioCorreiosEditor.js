import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCep, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';

const UF_PADRAO_MT = 'MT';
const UF_PADRAO_PR = 'PR';

function useCepEndereco(cepDigitos, setCidade, setUf, setStatus) {
  useEffect(() => {
    const d = apenasDigitos(cepDigitos);
    if (d.length !== 8) {
      setStatus('');
      return undefined;
    }
    let cancel = false;
    const h = setTimeout(async () => {
      setStatus('Consultando…');
      const r = await buscarEnderecoPorCep(d);
      if (cancel) return;
      if (r.ok) {
        setCidade(r.localidade || '');
        setUf((r.uf || '').toUpperCase());
        setStatus('');
      } else {
        setStatus(r.erro || 'CEP inválido.');
      }
    }, 400);
    return () => {
      cancel = true;
      clearTimeout(h);
    };
  }, [cepDigitos, setCidade, setUf, setStatus]);
}

function Quadrante({ titulo, valor }) {
  return (
    <div
      style={{
        border: '1px solid #000',
        padding: '5mm 4mm',
        minHeight: '18mm',
        fontSize: '11pt',
        lineHeight: 1.25,
      }}
    >
      <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '2mm', textTransform: 'uppercase' }}>{titulo}</div>
      <div style={{ fontWeight: 'bold' }}>{valor || '—'}</div>
    </div>
  );
}

function BlocoCorreios({ titulo, nome, docFmt, cepFmt, cidade, uf, log, num, bairro, comp, tel }) {
  const cidadeUf = [cidade?.trim(), (uf || '').toUpperCase()].filter(Boolean).join(' – ');
  return (
    <div style={{ border: '3px solid #000', padding: '6mm', marginBottom: '10mm' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', marginBottom: '5mm', letterSpacing: '0.06em' }}>{titulo}</div>
      <div style={{ marginBottom: '4mm', fontSize: '12pt' }}>
        <strong>NOME:</strong> {nome?.trim() || '—'}
      </div>
      <div style={{ marginBottom: '4mm', fontSize: '12pt' }}>
        <strong>CPF/CNPJ:</strong> {docFmt || '—'}
      </div>
      <div style={{ marginBottom: '4mm', fontSize: '12pt' }}>
        <strong>CEP:</strong> {cepFmt || '—'} {cidadeUf ? <span> / {cidadeUf}</span> : null}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3mm',
          marginBottom: '4mm',
        }}
      >
        <Quadrante titulo="Logradouro (rua ou avenida)" valor={log} />
        <Quadrante titulo="Número" valor={num} />
        <Quadrante titulo="Bairro" valor={bairro} />
        <Quadrante titulo="Complemento" valor={comp} />
      </div>
      <div style={{ fontSize: '12pt' }}>
        <strong>CONTATO:</strong> {tel?.trim() || '—'}
      </div>
    </div>
  );
}

export default function RemetenteDestinatarioCorreiosEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const [remetente, setRemetente] = useState('GABRIEL COSTA CARRARA');
  const [docRemDig, setDocRemDig] = useState('06065979139');
  const [logRem, setLogRem] = useState('RUA ANTÔNIO BENTO NETO');
  const [numRem, setNumRem] = useState('887');
  const [baiRem, setBaiRem] = useState('CENTRO');
  const [compRem, setCompRem] = useState('FÊNIX CONSÓRCIOS');
  const [cepRemDig, setCepRemDig] = useState('78250000');
  const [cityRem, setCityRem] = useState('PONTES E LACERDA');
  const [ufRem, setUfRem] = useState(UF_PADRAO_MT);
  const [telRem, setTelRem] = useState('(65) 9 8127-8212');
  const [cepRemStatus, setCepRemStatus] = useState('');

  const [destinatario, setDestinatario] = useState('EDSON PIOTTO');
  const [docDestDig, setDocDestDig] = useState('01789891930');
  const [logDest, setLogDest] = useState('AVENIDA BRASIL');
  const [numDest, setNumDest] = useState('4140');
  const [baiDest, setBaiDest] = useState('CENTRO');
  const [compDest, setCompDest] = useState('SALA 12, GALERIA ESPAÇO ALTERNATIVO — PIOTTO CONSÓRCIOS');
  const [cepDestDig, setCepDestDig] = useState('87501000');
  const [cityDest, setCityDest] = useState('UMUARAMA');
  const [ufDest, setUfDest] = useState(UF_PADRAO_PR);
  const [telDest, setTelDest] = useState('(44) 9 8413-7105');
  const [cepDestStatus, setCepDestStatus] = useState('');

  useCepEndereco(cepRemDig, setCityRem, setUfRem, setCepRemStatus);
  useCepEndereco(cepDestDig, setCityDest, setUfDest, setCepDestStatus);

  const docRemFmt = formatarCpfOuCnpj(docRemDig);
  const docDestFmt = formatarCpfOuCnpj(docDestDig);
  const cepRemFmt = formatarCep(cepRemDig);
  const cepDestFmt = formatarCep(cepDestDig);

  const validar = useCallback(() => {
    if (!remetente.trim()) return 'Informe o nome do remetente.';
    if (![11, 14].includes(apenasDigitos(docRemDig).length)) return 'CPF/CNPJ do remetente inválido.';
    if (!logRem.trim() || !numRem.trim() || !baiRem.trim()) return 'Preencha logradouro, número e bairro do remetente.';
    if (apenasDigitos(cepRemDig).length !== 8) return 'CEP do remetente deve ter 8 dígitos.';
    if (!cityRem.trim() || !ufRem) return 'Cidade/UF do remetente: aguarde o CEP ou preencha manualmente.';
    if (!telRem.trim()) return 'Informe o telefone do remetente.';

    if (!destinatario.trim()) return 'Informe o nome do destinatário.';
    if (![11, 14].includes(apenasDigitos(docDestDig).length)) return 'CPF/CNPJ do destinatário inválido.';
    if (!logDest.trim() || !numDest.trim() || !baiDest.trim()) return 'Preencha logradouro, número e bairro do destinatário.';
    if (apenasDigitos(cepDestDig).length !== 8) return 'CEP do destinatário deve ter 8 dígitos.';
    if (!cityDest.trim() || !ufDest) return 'Cidade/UF do destinatário: aguarde o CEP ou preencha manualmente.';
    if (!telDest.trim()) return 'Informe o telefone do destinatário.';
    return null;
  }, [
    remetente,
    docRemDig,
    logRem,
    numRem,
    baiRem,
    cepRemDig,
    cityRem,
    ufRem,
    telRem,
    destinatario,
    docDestDig,
    logDest,
    numDest,
    baiDest,
    cepDestDig,
    cityDest,
    ufDest,
    telDest,
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
      const margin = 4;
      const maxW = pdfW - margin * 2;
      const maxH = pdfH - margin * 2;
      const imgRatio = canvas.width > 0 ? canvas.height / canvas.width : 1;
      let finalW = maxW;
      let finalH = finalW * imgRatio;
      if (finalH > maxH) {
        finalH = maxH;
        finalW = finalH / imgRatio;
      }
      const x = (pdfW - finalW) / 2;
      const y = (pdfH - finalH) / 2;
      pdf.addImage(imgData, 'PNG', x, y, finalW, finalH);
      pdf.save(`remetente_destinatario_correios_${Date.now()}.pdf`);
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
        <h2 className="text-xl font-bold text-white">Remetente e destinatário (Correios)</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-10rem)] space-y-6 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Remetente</legend>
            <label className={labelClass}>
              Nome completo
              <input className={fieldClass} value={remetente} onChange={(e) => setRemetente(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF ou CNPJ (só números)
              <input
                className={fieldClass}
                value={docRemDig}
                onChange={(e) => setDocRemDig(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
              />
              {docRemDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {docRemFmt}</span> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Logradouro
                <input className={fieldClass} value={logRem} onChange={(e) => setLogRem(e.target.value)} />
              </label>
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numRem} onChange={(e) => setNumRem(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={baiRem} onChange={(e) => setBaiRem(e.target.value)} />
              </label>
              <label className={labelClass}>
                Complemento
                <input className={fieldClass} value={compRem} onChange={(e) => setCompRem(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              CEP
              <input
                className={fieldClass}
                value={cepRemDig}
                onChange={(e) => setCepRemDig(apenasDigitos(e.target.value).slice(0, 8))}
                inputMode="numeric"
              />
              {cepRemDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cepRemFmt}</span> : null}
              {cepRemStatus ? <p className="mt-1 text-xs text-amber-400">{cepRemStatus}</p> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Cidade (ViaCEP; pode editar)
                <input className={fieldClass} value={cityRem} onChange={(e) => setCityRem(e.target.value)} />
              </label>
              <label className={labelClass}>
                UF
                <input className={fieldClass} value={ufRem} onChange={(e) => setUfRem(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
              </label>
            </div>
            <label className={labelClass}>
              Telefone
              <input className={fieldClass} value={telRem} onChange={(e) => setTelRem(e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Destinatário</legend>
            <label className={labelClass}>
              Nome completo
              <input className={fieldClass} value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF ou CNPJ (só números)
              <input
                className={fieldClass}
                value={docDestDig}
                onChange={(e) => setDocDestDig(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
              />
              {docDestDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {docDestFmt}</span> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Logradouro
                <input className={fieldClass} value={logDest} onChange={(e) => setLogDest(e.target.value)} />
              </label>
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numDest} onChange={(e) => setNumDest(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={baiDest} onChange={(e) => setBaiDest(e.target.value)} />
              </label>
              <label className={labelClass}>
                Complemento
                <input className={fieldClass} value={compDest} onChange={(e) => setCompDest(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              CEP
              <input
                className={fieldClass}
                value={cepDestDig}
                onChange={(e) => setCepDestDig(apenasDigitos(e.target.value).slice(0, 8))}
                inputMode="numeric"
              />
              {cepDestDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cepDestFmt}</span> : null}
              {cepDestStatus ? <p className="mt-1 text-xs text-amber-400">{cepDestStatus}</p> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Cidade (ViaCEP; pode editar)
                <input className={fieldClass} value={cityDest} onChange={(e) => setCityDest(e.target.value)} />
              </label>
              <label className={labelClass}>
                UF
                <input className={fieldClass} value={ufDest} onChange={(e) => setUfDest(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
              </label>
            </div>
            <label className={labelClass}>
              Telefone
              <input className={fieldClass} value={telDest} onChange={(e) => setTelDest(e.target.value)} />
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
          <div className="overflow-x-auto rounded-lg border border-gray-700/60 bg-gray-900/20 p-2">
            <div
              ref={printRef}
              className="bg-white text-black shadow-lg"
              style={{
                width: '210mm',
                minWidth: '210mm',
                minHeight: '260mm',
                padding: '10mm',
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica Neue, Helvetica, sans-serif',
                color: '#000',
                margin: '0 auto',
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '8mm' }}>
                REMETENTE E DESTINATÁRIO (CORREIOS)
              </div>
              <BlocoCorreios
                titulo="REMETENTE"
                nome={remetente}
                docFmt={docRemFmt}
                cepFmt={cepRemFmt}
                cidade={cityRem}
                uf={ufRem}
                log={logRem}
                num={numRem}
                bairro={baiRem}
                comp={compRem}
                tel={telRem}
              />
              <BlocoCorreios
                titulo="DESTINATÁRIO"
                nome={destinatario}
                docFmt={docDestFmt}
                cepFmt={cepDestFmt}
                cidade={cityDest}
                uf={ufDest}
                log={logDest}
                num={numDest}
                bairro={baiDest}
                comp={compDest}
                tel={telDest}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
