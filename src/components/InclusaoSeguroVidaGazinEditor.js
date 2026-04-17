import React, { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCpf } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const CIDADE_PADRAO = 'PONTES E LACERDA';
const UF_PADRAO = 'MT';
const BADGE_ASSINATURA = 'ASSINAR FÍSICO OU GOV';

const MESES = [
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

const ANO_ATUAL = new Date().getFullYear();
const ANOS_NASCIMENTO = Array.from({ length: ANO_ATUAL - 1919 }, (_, i) => String(ANO_ATUAL - i));

function cpfCompleto(d) {
  return apenasDigitos(d).length === 11;
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

function formatarDataNascimentoPdf(dia, mes, ano) {
  const d = apenasDigitos(dia).slice(0, 2);
  if (!d || !mes || !ano) return '';
  const n = Math.min(31, Math.max(1, parseInt(d, 10) || 0));
  if (n < 1) return '';
  return `${String(n).padStart(2, '0')}/${mes}/${ano}`;
}

export default function InclusaoSeguroVidaGazinEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const [cons, setCons] = useState('');
  const [grupo, setGrupo] = useState('');
  const [cota, setCota] = useState('');
  const [contrato, setContrato] = useState('');
  const [cpfCons, setCpfCons] = useState('');

  const [nomeBen, setNomeBen] = useState('');
  const [cpfBen, setCpfBen] = useState('');
  const [diaBen, setDiaBen] = useState('');
  const [mesBen, setMesBen] = useState('');
  const [anoBen, setAnoBen] = useState('');
  const [grau, setGrau] = useState('');

  const [cidade, setCidade] = useState(CIDADE_PADRAO);
  const [uf, setUf] = useState(UF_PADRAO);

  const cpfConsFmt = formatarCpf(cpfCons);
  const cpfBenFmt = formatarCpf(cpfBen);
  const dataBenPdf = useMemo(() => formatarDataNascimentoPdf(diaBen, mesBen, anoBen), [diaBen, mesBen, anoBen]);
  const dataExtensoDoc = dataAtualPorExtenso();

  const validar = useCallback(() => {
    if (!cons.trim()) return 'Informe o nome do consorciado.';
    if (!grupo.trim() || !cota.trim() || !contrato.trim()) return 'Preencha grupo, cota e contrato.';
    if (!cpfCompleto(cpfCons)) return 'CPF do consorciado deve ter 11 dígitos.';
    if (!nomeBen.trim()) return 'Informe o nome do beneficiário.';
    if (!cpfCompleto(cpfBen)) return 'CPF do beneficiário deve ter 11 dígitos.';
    if (!diaBen.trim() || !mesBen || !anoBen) return 'Preencha a data de nascimento do beneficiário (dia, mês e ano).';
    const diaNum = parseInt(apenasDigitos(diaBen), 10);
    if (diaNum < 1 || diaNum > 31) return 'Dia de nascimento inválido.';
    if (!grau.trim()) return 'Informe o grau de parentesco.';
    if (!cidade.trim()) return 'Informe a cidade.';
    return null;
  }, [cons, grupo, cota, contrato, cpfCons, nomeBen, cpfBen, diaBen, mesBen, anoBen, grau, cidade]);

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
      const sufixo = apenasDigitos(cpfCons).slice(0, 4) || 'doc';
      pdf.save(`seguro_vida_gazin_${sufixo}.pdf`);
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
          <h2 className="text-xl font-bold text-white">Solicitação de Inclusão de Seguro de Vida Gazin</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_ASSINATURA})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Consorciado e contrato</legend>
            <label className={labelClass}>
              Nome do consorciado
              <input className={fieldClass} value={cons} onChange={(e) => setCons(e.target.value)} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className={labelClass}>
                Grupo
                <input className={fieldClass} value={grupo} onChange={(e) => setGrupo(e.target.value)} />
              </label>
              <label className={labelClass}>
                Cota
                <input className={fieldClass} value={cota} onChange={(e) => setCota(e.target.value)} />
              </label>
              <label className={labelClass}>
                Contrato
                <input className={fieldClass} value={contrato} onChange={(e) => setContrato(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              CPF do consorciado (assinatura)
              <input
                className={fieldClass}
                value={cpfCons}
                onChange={(e) => setCpfCons(apenasDigitos(e.target.value).slice(0, 11))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {cpfCons.length > 0 && (
                <span className="mt-1 block text-xs text-gray-500">No PDF: {cpfConsFmt}</span>
              )}
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Beneficiário</legend>
            <p className="text-xs text-amber-200/90">
              Não utilize o próprio nome do consorciado — deve ser outra pessoa.
            </p>
            <label className={labelClass}>
              Nome do beneficiário
              <input className={fieldClass} value={nomeBen} onChange={(e) => setNomeBen(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF do beneficiário
              <input
                className={fieldClass}
                value={cpfBen}
                onChange={(e) => setCpfBen(apenasDigitos(e.target.value).slice(0, 11))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {cpfBen.length > 0 && <span className="mt-1 block text-xs text-gray-500">No PDF: {cpfBenFmt}</span>}
            </label>
            <span className={labelClass}>Data de nascimento</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-gray-500">
                Dia
                <input
                  className={fieldClass}
                  value={diaBen}
                  onChange={(e) => setDiaBen(apenasDigitos(e.target.value).slice(0, 2))}
                  inputMode="numeric"
                  placeholder="DD"
                />
              </label>
              <label className="text-xs text-gray-500">
                Mês
                <select className={fieldClass} value={mesBen} onChange={(e) => setMesBen(e.target.value)}>
                  <option value="">—</option>
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Ano
                <select className={fieldClass} value={anoBen} onChange={(e) => setAnoBen(e.target.value)}>
                  <option value="">—</option>
                  {ANOS_NASCIMENTO.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {dataBenPdf ? (
              <p className="text-xs text-gray-500">
                No PDF: <strong className="text-gray-300">{dataBenPdf}</strong>
              </p>
            ) : null}
            <label className={labelClass}>
              Grau de parentesco
              <input className={fieldClass} value={grau} onChange={(e) => setGrau(e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Local (rodapé)</legend>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF
              <SelectUf value={uf} onChange={setUf} />
            </label>
            <p className="text-xs text-gray-500">
              Data por extenso no PDF: <strong className="text-gray-300">{dataExtensoDoc}</strong> (ao gerar).
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
              padding: '18mm 20mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '11pt',
              lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo />
            <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 20px', fontSize: '12pt' }}>
              SOLICITAÇÃO DE INCLUSÃO DE SEGURO DE VIDA
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 16px' }}>
              Eu, <strong>{cons.trim() || '…'}</strong>, titular do grupo <strong>{grupo.trim() || '…'}</strong> a cota <strong>{cota.trim() || '…'}</strong> contrato{' '}
              <strong>{contrato.trim() || '…'}</strong> venho por meio solicitar a inclusão do seguro de vida, e declaro estar ciente que o mesmo valerá apenas o
              pagamento da parcela com o valor referente ao seguro, em seguida à participação na assembleia.
            </p>

            <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>Informe abaixo os dados do SEU BENEFICIÁRIO</p>
            <p style={{ margin: '0 0 12px', fontSize: '10pt' }}>(Favor não colocar o próprio nome – necessita ser outra pessoa)</p>

            <p style={{ margin: '0 0 6px' }}>
              Nome: <strong>{nomeBen.trim() || '…'}</strong>
            </p>
            <p style={{ margin: '0 0 6px' }}>
              CPF: <strong>{cpfBenFmt || '…'}</strong>
            </p>
            <p style={{ margin: '0 0 6px' }}>
              Data de Nascimento: <strong>{dataBenPdf || '…'}</strong>
            </p>
            <p style={{ margin: '0 0 20px' }}>
              Grau de parentesco: <strong>{grau.trim() || '…'}</strong>
            </p>

            <p style={{ margin: '0 0 18mm' }}>Sendo o que cabia para momento, agradeço.</p>

            <div style={{ marginTop: '6mm' }}>
              <div style={{ minHeight: '20mm', marginBottom: '2mm' }} aria-hidden />
              <div style={{ borderTop: '1px solid #000', width: '70%', margin: '0 0 8pt' }} />
              <p style={{ margin: '0 0 4pt', fontWeight: 'bold' }}>{cons.trim() || '…'}</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{cpfConsFmt || '…'}</p>
            </div>

            <p style={{ textAlign: 'right', marginTop: '14mm', fontWeight: 'bold' }}>
              {cidade.trim() || '…'} – {uf || '…'}, {dataExtensoDoc}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
