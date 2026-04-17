import React, { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const UF_PADRAO = 'MT';
const BADGE_ASSINATURA = 'ASSINAR FÍSICO OU GOV';

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

export default function CancelamentoSeguroVidaEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState(UF_PADRAO);
  const [nome, setNome] = useState('');
  const [cota, setCota] = useState('');
  const [grupo, setGrupo] = useState('');
  /** Data por extenso na linha do documento; atualizada no clique em Gerar PDF para refletir o dia da geração. */
  const [dataLinhaPdf, setDataLinhaPdf] = useState(() => dataAtualPorExtenso());

  const validar = useCallback(() => {
    if (!nome.trim()) return 'Informe o nome do consorciado.';
    if (!grupo.trim()) return 'Informe o grupo.';
    if (!cota.trim()) return 'Informe a cota.';
    if (!cidade.trim()) return 'Informe a cidade.';
    return null;
  }, [nome, grupo, cota, cidade]);

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
      flushSync(() => {
        setDataLinhaPdf(dataAtualPorExtenso());
      });
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
      const sufixo = apenasDigitos(cota).slice(0, 4) || apenasDigitos(grupo).slice(0, 4) || 'doc';
      pdf.save(`cancelamento_seguro_vida_${sufixo}.pdf`);
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
          <h2 className="text-xl font-bold text-white">Cancelamento do seguro de prestamista</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_ASSINATURA})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Dados</legend>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Nome da cidade" />
            </label>
            <label className={labelClass}>
              UF (opcional — não consta no PDF deste modelo)
              <SelectUf value={uf} onChange={setUf} />
            </label>
            <label className={labelClass}>
              Nome do consorciado
              <input className={fieldClass} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className={labelClass}>
              Grupo
              <input className={fieldClass} value={grupo} onChange={(e) => setGrupo(e.target.value)} />
            </label>
            <label className={labelClass}>
              Cota
              <input className={fieldClass} value={cota} onChange={(e) => setCota(e.target.value)} />
            </label>
            <p className="text-xs text-gray-500">
              Data por extenso no PDF: <strong className="text-gray-300">{dataLinhaPdf}</strong> (atualizada ao clicar em Gerar PDF).
            </p>
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
              fontFamily: 'Arial, Helvetica Neue, Helvetica, sans-serif',
              fontSize: '11pt',
              lineHeight: 1.55,
              boxSizing: 'border-box',
              color: '#111',
            }}
          >
            <GazinDocHeaderLogo variant="prestamista_letterhead" />

            <p style={{ textAlign: 'left', fontWeight: 'bold', margin: '0 0 10mm', textTransform: 'uppercase' }}>
              {(cidade.trim() || '…').toUpperCase()}, {dataLinhaPdf}.
            </p>

            <p
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                textDecoration: 'underline',
                textTransform: 'uppercase',
                margin: '0 0 12mm',
                fontSize: '11.5pt',
                letterSpacing: '0.04em',
              }}
            >
              Cancelamento do seguro de prestamista
            </p>

            <p style={{ textAlign: 'left', margin: '0 0 5mm' }}>
              Eu, <strong>{nome.trim() || '…'}</strong> Titular do grupo <strong>{grupo.trim() || '…'}</strong> Da cota <strong>{cota.trim() || '…'}</strong> , venho
              por meio desta solicitar o cancelamento do Seguro Prestamista o qual pago mensalmente em minhas parcelas do Consórcio Nacional Gazin..
            </p>

            <p style={{ textAlign: 'left', margin: '0 0 28mm' }}>Sendo o que cabia para o momento, agradeço.</p>

            <div style={{ marginTop: '12mm' }}>
              <div style={{ minHeight: '16mm', marginBottom: '2mm' }} aria-hidden />
              <div style={{ borderTop: '1px solid #000', width: '78%', margin: '0 auto 10pt' }} />
              <p style={{ margin: 0, fontWeight: 'bold', textAlign: 'center' }}>{nome.trim() || '…'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
