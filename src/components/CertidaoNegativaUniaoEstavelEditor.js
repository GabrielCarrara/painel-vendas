import React, { useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCpf } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import logoGazinNacional from '../assets/logo-gazin.png';

const BADGE =
  'OBRIGATÓRIO TESTEMUNHAS E RECONHECER FIRMA DE TODOS.';

const AZUL = '#1e4bb8';
const LINHA = '2px solid ' + AZUL;

const ESTADO_CIVIL_OPCOES = [
  'SOLTEIRO (A)',
  'VIÚVO',
  'CASADO',
  'SEPARADO (A)',
  'DIVORCIADO (A)',
  'UNIÃO ESTÁVEL',
];

/** Marca “consórcio de imóveis Gazin” em SVG (não há PNG no repositório; reproduz o layout do modelo). */
function LogoGazinImoveisMarca() {
  return (
    <div style={{ width: '74mm', maxWidth: '42%' }} aria-hidden>
      <svg viewBox="0 0 220 76" width="100%" height="auto" style={{ display: 'block' }}>
        <polygon points="10,32 110,6 210,32" fill="#facc15" stroke="#eab308" strokeWidth="0.8" />
        <text x="110" y="50" textAnchor="middle" fill={AZUL} fontSize="11" fontFamily="Arial, sans-serif" fontWeight="600">
          consórcio de
        </text>
        <text x="110" y="68" textAnchor="middle" fill={AZUL} fontSize="13" fontFamily="Arial, sans-serif" fontWeight="bold">
          IMÓVEIS GAZIN
        </text>
      </svg>
    </div>
  );
}

function CabecalhoDuploLogos() {
  return (
    <div style={{ marginBottom: '8mm' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4mm' }}>
        <img
          src={logoGazinNacional}
          alt="Consórcio Nacional Gazin"
          style={{ maxWidth: '78mm', width: '48%', height: 'auto', objectFit: 'contain' }}
        />
        <LogoGazinImoveisMarca />
      </div>
      <div style={{ borderBottom: LINHA, marginTop: '4mm' }} />
    </div>
  );
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

function exibirOuLinha(valor, fallback = '______________') {
  const t = String(valor ?? '').trim();
  return t || fallback;
}

export default function CertidaoNegativaUniaoEstavelEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const [consorciado, setConsorciado] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('SOLTEIRO (A)');
  const [rg, setRg] = useState('');
  const [orgao, setOrgao] = useState('');
  const [ufOrgao, setUfOrgao] = useState('MT');
  const [cpfDigitos, setCpfDigitos] = useState('');

  const [localEData, setLocalEData] = useState('');

  const [t1Nome, setT1Nome] = useState('');
  const [t1Rg, setT1Rg] = useState('');
  const [t1Cpf, setT1Cpf] = useState('');
  const [t2Nome, setT2Nome] = useState('');
  const [t2Rg, setT2Rg] = useState('');
  const [t2Cpf, setT2Cpf] = useState('');

  const cpfFmt = formatarCpf(cpfDigitos);
  const t1CpfFmt = formatarCpf(t1Cpf);
  const t2CpfFmt = formatarCpf(t2Cpf);

  const validar = useCallback(() => {
    if (!consorciado.trim()) return 'Informe o nome do consorciado.';
    if (!estadoCivil) return 'Selecione o estado civil.';
    if (!rg.trim()) return 'Informe o número do RG.';
    if (!orgao.trim()) return 'Informe o órgão expedidor.';
    if (!ufOrgao || ufOrgao.length !== 2) return 'Selecione a UF do órgão expedidor.';
    if (apenasDigitos(cpfDigitos).length !== 11) return 'CPF deve ter 11 dígitos.';
    return null;
  }, [consorciado, estadoCivil, rg, orgao, ufOrgao, cpfDigitos]);

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
      const sufixo = apenasDigitos(cpfDigitos).slice(0, 4) || 'doc';
      pdf.save(`certidao_negativa_uniao_estavel_${sufixo}.pdf`);
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
          <h2 className="text-xl font-bold text-white">Certidão negativa de união estável</h2>
          <span className="shrink-0 rounded border border-rose-500/50 bg-rose-500/15 px-2 py-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-rose-100 sm:text-[10px]">
            ({BADGE})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Declarante</legend>
            <label className={labelClass}>
              Nome do consorciado
              <input className={fieldClass} value={consorciado} onChange={(e) => setConsorciado(e.target.value)} />
            </label>
            <label className={labelClass}>
              Estado civil
              <select
                className={fieldClass}
                value={estadoCivil}
                onChange={(e) => setEstadoCivil(e.target.value)}
              >
                {ESTADO_CIVIL_OPCOES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              RG nº
              <input className={fieldClass} value={rg} onChange={(e) => setRg(e.target.value)} />
            </label>
            <label className={labelClass}>
              Órgão expedidor
              <input className={fieldClass} value={orgao} onChange={(e) => setOrgao(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF do órgão expedidor
              <SelectUf value={ufOrgao} onChange={setUfOrgao} />
            </label>
            <label className={labelClass}>
              CPF
              <input
                className={fieldClass}
                value={cpfDigitos}
                onChange={(e) => setCpfDigitos(apenasDigitos(e.target.value).slice(0, 11))}
                inputMode="numeric"
                placeholder="Apenas números"
              />
              {cpfDigitos.length > 0 ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cpfFmt}</span> : null}
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Local e data (opcional no PDF)</legend>
            <label className={labelClass}>
              Texto completo (ex.: Douradina, 03 de dezembro de 2024)
              <input
                className={fieldClass}
                value={localEData}
                onChange={(e) => setLocalEData(e.target.value)}
                placeholder="Deixe em branco para linhas à mão no impresso"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Testemunhas (opcional)</legend>
            <p className="text-xs text-gray-500">
              Somente o <strong className="text-gray-300">consorciado (declarante)</strong> é obrigatório. As testemunhas podem ficar em branco no sistema e ser
              preenchidas à mão no papel após as assinaturas.
            </p>
            <p className="text-xs font-semibold text-gray-400">Testemunha 1</p>
            <label className={labelClass}>
              Nome
              <input className={fieldClass} value={t1Nome} onChange={(e) => setT1Nome(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                RG
                <input className={fieldClass} value={t1Rg} onChange={(e) => setT1Rg(e.target.value)} />
              </label>
              <label className={labelClass}>
                CPF
                <input
                  className={fieldClass}
                  value={t1Cpf}
                  onChange={(e) => setT1Cpf(apenasDigitos(e.target.value).slice(0, 11))}
                  inputMode="numeric"
                />
              </label>
            </div>
            <p className="text-xs font-semibold text-gray-400">Testemunha 2</p>
            <label className={labelClass}>
              Nome
              <input className={fieldClass} value={t2Nome} onChange={(e) => setT2Nome(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                RG
                <input className={fieldClass} value={t2Rg} onChange={(e) => setT2Rg(e.target.value)} />
              </label>
              <label className={labelClass}>
                CPF
                <input
                  className={fieldClass}
                  value={t2Cpf}
                  onChange={(e) => setT2Cpf(apenasDigitos(e.target.value).slice(0, 11))}
                  inputMode="numeric"
                />
              </label>
            </div>
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
              padding: '14mm 16mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '11pt',
              lineHeight: 1.45,
              boxSizing: 'border-box',
              color: '#111',
            }}
          >
            <CabecalhoDuploLogos />

            <p
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                textDecoration: 'underline',
                margin: '0 0 12mm',
                fontSize: '12pt',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              DECLARAÇÃO NEGATIVA DE UNIÃO ESTÁVEL
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 10px' }}>
              Eu, <strong>{consorciado.trim() || '…'}</strong>, brasileiro(a), estado civil <strong>{estadoCivil}</strong>, portador(a) da cédula de identidade RG
              nº <u>{rg.trim() || '………………'}</u>, Órgão Expedidor <u>{orgao.trim() || '……'}</u>/<u>{ufOrgao || '…'}</u> e inscrito(a) no CPF/MF sob nº{' '}
              <u>{cpfFmt || '…………………'}</u>, declaro expressamente sob responsabilidade civil e criminal que não mantenho relação de vida em comum ou união estável
              com outra pessoa, nas condições estabelecidas pelo artigo 1.723 e seguintes do Novo Código Civil Brasileiro, permanecendo para todos os fins e efeitos no
              estado civil de solteiro(a).
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 10px' }}>
              Declaro ainda estar ciente de que, comprovada a falsidade da presente declaração, estarei sujeito(a) às penas previstas no artigo 299, do Código Penal
              Brasileiro.
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 14mm' }}>
              E, para que surta seus efeitos legais, assino esta declaração na presença das testemunhas abaixo identificadas.
            </p>

            <p style={{ margin: '0 0 6px' }}>
              <strong>Local e data</strong>{' '}
              {localEData.trim() ? (
                <span style={{ fontWeight: 'bold' }}>{localEData.trim()}</span>
              ) : (
                <span>
                  ______________________________, ___/___/______.
                </span>
              )}
            </p>

            <div style={{ marginTop: '14mm' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 5mm' }}>Declarante</p>
              <div style={{ minHeight: '22mm', marginBottom: '2mm' }} aria-hidden="true" />
              <div style={{ borderTop: '1px solid #000', width: '92%', margin: '0 0 7mm' }} />
              <div style={{ marginTop: '1mm' }}>
                <p style={{ margin: '0 0 5px' }}>
                  <strong>Nome:</strong> {consorciado.trim() || '…'}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>CPF:</strong> {cpfFmt || '…'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12mm', marginTop: '18mm' }}>
              <div>
                <p style={{ fontWeight: 'bold', margin: '0 0 5mm' }}>Testemunha (1):</p>
                <div style={{ minHeight: '18mm', marginBottom: '2mm' }} aria-hidden="true" />
                <div style={{ borderTop: '1px solid #000', margin: '0 0 6mm' }} />
                <p style={{ margin: '0 0 5px' }}>
                  <strong>Nome:</strong> {exibirOuLinha(t1Nome)}
                </p>
                <p style={{ margin: '0 0 5px' }}>
                  <strong>RG:</strong> {exibirOuLinha(t1Rg)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>CPF:</strong> {t1CpfFmt || exibirOuLinha('', '________________')}
                </p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', margin: '0 0 5mm' }}>Testemunha (2):</p>
                <div style={{ minHeight: '18mm', marginBottom: '2mm' }} aria-hidden="true" />
                <div style={{ borderTop: '1px solid #000', margin: '0 0 6mm' }} />
                <p style={{ margin: '0 0 5px' }}>
                  <strong>Nome:</strong> {exibirOuLinha(t2Nome)}
                </p>
                <p style={{ margin: '0 0 5px' }}>
                  <strong>RG:</strong> {exibirOuLinha(t2Rg)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>CPF:</strong> {t2CpfFmt || exibirOuLinha('', '________________')}
                </p>
              </div>
            </div>

            <p style={{ marginTop: '18mm', fontWeight: 'bold', textAlign: 'center' }}>Assinatura(s) com reconhecimento de firma(s).</p>

            <div style={{ borderBottom: LINHA, marginTop: '10mm' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
