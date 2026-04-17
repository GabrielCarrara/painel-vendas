import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCep, formatarCpf } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { nomeEstadoPorUf, SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const BADGE_ASSINATURA = 'ASSINAR FÍSICO OU GOV';

const ESTADO_CIVIL_OPCOES = [
  'SOLTEIRO (A)',
  'VIÚVO',
  'CASADO',
  'UNIÃO ESTÁVEL',
  'DIVORCIADO',
];

export default function DeclaracaoResidenciaEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);
  const [cepStatus, setCepStatus] = useState('');

  const [nomeConsorciado, setNomeConsorciado] = useState('');
  const [cpfDigitos, setCpfDigitos] = useState('');
  const [nacionalidade, setNacionalidade] = useState('BRASILEIRA');
  const [estadoCivil, setEstadoCivil] = useState('SOLTEIRO (A)');
  const [logradouro, setLogradouro] = useState('');
  const [numeroResidencial, setNumeroResidencial] = useState('');
  const [bairro, setBairro] = useState('');
  const [cepDigitos, setCepDigitos] = useState('78250000');
  const [cidade, setCidade] = useState('PONTES E LACERDA');
  const [uf, setUf] = useState('MT');

  const cpfFormatado = formatarCpf(cpfDigitos);
  const cepFormatado = formatarCep(cepDigitos);
  const estadoNome = nomeEstadoPorUf(uf);
  const [dataExtensoPreview, setDataExtensoPreview] = useState(() => dataAtualPorExtenso());

  useEffect(() => {
    const t = setInterval(() => setDataExtensoPreview(dataAtualPorExtenso()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const d = apenasDigitos(cepDigitos);
    if (d.length !== 8) {
      setCepStatus('');
      return undefined;
    }
    let cancel = false;
    const h = setTimeout(async () => {
      setCepStatus('Consultando…');
      const r = await buscarEnderecoPorCep(d);
      if (cancel) return;
      if (r.ok) {
        if (d === '78250000') {
          setCidade('PONTES E LACERDA');
          setUf('MT');
        } else {
          setCidade(r.localidade || '');
          setUf((r.uf || '').toUpperCase());
        }
        setCepStatus('');
      } else {
        setCepStatus(r.erro || 'CEP inválido.');
      }
    }, 400);
    return () => {
      cancel = true;
      clearTimeout(h);
    };
  }, [cepDigitos]);

  const validar = useCallback(() => {
    if (!nomeConsorciado.trim()) return 'Informe o nome completo.';
    if (apenasDigitos(cpfDigitos).length !== 11) return 'CPF deve ter 11 dígitos.';
    if (!logradouro.trim()) return 'Informe o logradouro.';
    if (!numeroResidencial.trim()) return 'Informe o número.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (apenasDigitos(cepDigitos).length !== 8) return 'CEP deve ter 8 dígitos.';
    if (!cidade.trim()) return 'Informe a cidade (ou aguarde o preenchimento pelo CEP).';
    if (!uf.trim() || uf.trim().length !== 2) return 'Informe a UF (ou aguarde o preenchimento pelo CEP).';
    return null;
  }, [nomeConsorciado, cpfDigitos, logradouro, numeroResidencial, bairro, cepDigitos, cidade, uf]);

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
      pdf.save(`declaracao_residencia_${sufixo}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const dataExtensoDoc = dataAtualPorExtenso();

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
          <h2 className="text-xl font-bold text-white">Declaração de residência (Lei 7115/83)</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_ASSINATURA})
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-5 space-y-4">
          <h3 className="font-semibold text-indigo-300">Dados para preenchimento</h3>

          <label className="block text-sm">
            <span className="text-gray-400">Nome completo do consorciado</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={nomeConsorciado}
              onChange={(e) => setNomeConsorciado(e.target.value)}
              placeholder="Nome completo"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-400">CPF</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={cpfDigitos}
              onChange={(e) => setCpfDigitos(apenasDigitos(e.target.value).slice(0, 11))}
              placeholder="Apenas números"
              inputMode="numeric"
              autoComplete="off"
            />
            {cpfDigitos.length > 0 && (
              <span className="mt-1 block text-xs text-gray-500">No PDF (com pontos e traço): {cpfFormatado}</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="text-gray-400">Nacionalidade</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={nacionalidade}
              onChange={(e) => setNacionalidade(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-400">Estado civil</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={estadoCivil}
              onChange={(e) => setEstadoCivil(e.target.value)}
            >
              {ESTADO_CIVIL_OPCOES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-400">Logradouro (rua/avenida)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-gray-400">Número</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                value={numeroResidencial}
                onChange={(e) => setNumeroResidencial(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-400">Bairro</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-400">CEP (somente números)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
              value={cepDigitos}
              onChange={(e) => setCepDigitos(apenasDigitos(e.target.value).slice(0, 8))}
              placeholder="00000000"
              inputMode="numeric"
            />
            {cepDigitos.length > 0 && (
              <span className="mt-1 block text-xs text-gray-500">No PDF: {cepFormatado || '—'}</span>
            )}
            {cepStatus ? <p className="mt-1 text-xs text-amber-400">{cepStatus}</p> : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-gray-400">Cidade</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-400">UF</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
              >
                {SIGLAS_UF_BR.map((sigla) => (
                  <option key={sigla} value={sigla}>
                    {sigla}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-xs text-gray-500">
            Data por extenso no PDF: <strong className="text-gray-300">{dataExtensoPreview}</strong> (atualizada ao gerar o arquivo).
          </p>

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
          <h3 className="mb-2 font-semibold text-gray-400">Pré-visualização (conteúdo do PDF)</h3>
          <div
            ref={printRef}
            className="mx-auto bg-white text-black shadow-lg"
            style={{
              width: '210mm',
              maxWidth: '100%',
              minHeight: '260mm',
              padding: '18mm 20mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt',
              lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo />
            <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 4px' }}>DECLARAÇÃO DE RESIDÊNCIA</p>
            <p style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 22px' }}>LEI 7115/83</p>

            <p style={{ textAlign: 'justify', margin: '0 0 14px' }}>
              Eu, <strong>{nomeConsorciado.trim() || '…'}</strong>, portador CPF <strong>{cpfFormatado || '…'}</strong>, Nacionalidade{' '}
              <strong>{nacionalidade.trim() || '…'}</strong>, Estado civil <strong>{estadoCivil}</strong>, declaro que resido na{' '}
              <strong>{logradouro.trim() || '…'}</strong>, <strong>{numeroResidencial.trim() || '…'}</strong>, <strong>{bairro.trim() || '…'}</strong>, CEP:{' '}
              <strong>{cepFormatado || '…'}</strong> – Cidade <strong>{cidade.trim() || '…'}</strong>, Estado <strong>{estadoNome || uf || '…'}</strong>, conforme
              dados citados no comprovante de residência apresentado.
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 36px' }}>
              Declaro também, estar ciente de que a falsidade da presente declaração, sujeitará as sanções civis, administrativas e criminais previstas na
              legislação aplicável.
            </p>

            <p style={{ margin: 0 }}>
              <strong>{cidade.trim() || '…'}</strong> – <strong>{(uf || '').toUpperCase() || '…'}</strong>, <strong>{dataExtensoDoc}</strong>
            </p>

            {/* Espaço em branco para o cliente assinar acima da linha */}
            <div style={{ marginTop: '24mm', minHeight: '16mm' }} aria-hidden="true" />

            <div style={{ borderTop: '1px solid #000', width: '72%', margin: '0 auto' }} />
            <p style={{ textAlign: 'center', margin: '10pt 0 0', fontWeight: 'bold' }}>{nomeConsorciado.trim() || '…'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
