import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import {
  apenasDigitos,
  formatarCpfOuCnpj,
  formatarNumeroComDv,
} from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const CIDADE_PADRAO = 'PONTES E LACERDA';
const UF_PADRAO = 'MT';
const BADGE_RECONHECER_FIRMA = 'RECONHECIDO FIRMA / ASSINATURA GOV';

const TIPO_CONTA_OPCOES = [
  { value: 'POUPANÇA', label: 'Poupança' },
  { value: 'CORRENTE', label: 'Corrente' },
];

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

export default function ProcuracaoPagamentoVeiculoEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);
  const [dataExtensoPreview, setDataExtensoPreview] = useState(() => dataAtualPorExtenso());

  useEffect(() => {
    const t = setInterval(() => setDataExtensoPreview(dataAtualPorExtenso()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [nomeProprietario, setNomeProprietario] = useState('');
  const [docProprietario, setDocProprietario] = useState('');
  const [logradouroProprietario, setLogradouroProprietario] = useState('');
  const [numResProprietario, setNumResProprietario] = useState('');
  const [bairroProprietario, setBairroProprietario] = useState('');
  const [cidadeProprietario, setCidadeProprietario] = useState(CIDADE_PADRAO);
  const [ufProprietario, setUfProprietario] = useState(UF_PADRAO);

  const [nomeProcurador, setNomeProcurador] = useState('');
  const [docProcurador, setDocProcurador] = useState('');
  const [logradouroProcurador, setLogradouroProcurador] = useState('');
  const [numResProcurador, setNumResProcurador] = useState('');
  const [bairroProcurador, setBairroProcurador] = useState('');
  const [cidadeProcurador, setCidadeProcurador] = useState(CIDADE_PADRAO);
  const [ufProcurador, setUfProcurador] = useState(UF_PADRAO);

  const [banco, setBanco] = useState('');
  const [agenciaNum, setAgenciaNum] = useState('');
  const [agenciaDig, setAgenciaDig] = useState('');
  const [tipoConta, setTipoConta] = useState('CORRENTE');
  const [contaNum, setContaNum] = useState('');
  const [contaDig, setContaDig] = useState('');
  const [ufDetran, setUfDetran] = useState(UF_PADRAO);

  const [descricaoVeiculo, setDescricaoVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  const [renavam, setRenavam] = useState('');
  const [chassi, setChassi] = useState('');
  const [cor, setCor] = useState('');

  const docPropFmt = formatarCpfOuCnpj(docProprietario);
  const docProcFmt = formatarCpfOuCnpj(docProcurador);
  const agenciaFmt = formatarNumeroComDv(agenciaNum, agenciaDig);
  const contaFmt = formatarNumeroComDv(contaNum, contaDig);

  const validar = useCallback(() => {
    if (!nomeProprietario.trim()) return 'Informe o nome do proprietário.';
    if (!cpfOuCnpjCompleto(docProprietario)) return 'CPF (11 dígitos) ou CNPJ (14 dígitos) do proprietário inválido.';
    if (!logradouroProprietario.trim()) return 'Informe o logradouro do proprietário.';
    if (!numResProprietario.trim()) return 'Informe o nº residencial do proprietário.';
    if (!bairroProprietario.trim()) return 'Informe o bairro do proprietário.';
    if (!cidadeProprietario.trim()) return 'Informe a cidade do proprietário.';
    if (!nomeProcurador.trim()) return 'Informe o nome do procurador.';
    if (!cpfOuCnpjCompleto(docProcurador)) return 'CPF ou CNPJ do procurador inválido.';
    if (!logradouroProcurador.trim()) return 'Informe o logradouro do procurador.';
    if (!numResProcurador.trim()) return 'Informe o nº residencial do procurador.';
    if (!bairroProcurador.trim()) return 'Informe o bairro do procurador.';
    if (!cidadeProcurador.trim()) return 'Informe a cidade do procurador.';
    if (!banco.trim()) return 'Informe o banco.';
    if (!apenasDigitos(agenciaNum)) return 'Informe o número da agência.';
    if (!apenasDigitos(contaNum)) return 'Informe o número da conta.';
    if (!descricaoVeiculo.trim()) return 'Informe a descrição do veículo.';
    if (!placa.trim()) return 'Informe a placa.';
    if (!renavam.trim()) return 'Informe o Renavam.';
    if (!chassi.trim()) return 'Informe o chassi.';
    if (!cor.trim()) return 'Informe a cor.';
    return null;
  }, [
    nomeProprietario,
    docProprietario,
    logradouroProprietario,
    numResProprietario,
    bairroProprietario,
    cidadeProprietario,
    nomeProcurador,
    docProcurador,
    logradouroProcurador,
    numResProcurador,
    bairroProcurador,
    cidadeProcurador,
    banco,
    agenciaNum,
    contaNum,
    descricaoVeiculo,
    placa,
    renavam,
    chassi,
    cor,
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
      const sufixo = apenasDigitos(docProprietario).slice(0, 4) || 'doc';
      pdf.save(`procuracao_pagamento_veiculo_${sufixo}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const dataExtensoDoc = dataAtualPorExtenso();

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
          <h2 className="text-xl font-bold text-white">Procuração — pagamento do veículo</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_RECONHECER_FIRMA})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Proprietário do veículo</legend>
            <label className={labelClass}>
              Nome completo
              <input className={fieldClass} value={nomeProprietario} onChange={(e) => setNomeProprietario(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF ou CNPJ
              <input
                className={fieldClass}
                value={docProprietario}
                onChange={(e) => setDocProprietario(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {docProprietario.length > 0 && (
                <span className="mt-1 block text-xs text-gray-500">No PDF (com pontos e traços): {docPropFmt}</span>
              )}
            </label>
            <label className={labelClass}>
              Logradouro
              <input className={fieldClass} value={logradouroProprietario} onChange={(e) => setLogradouroProprietario(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numResProprietario} onChange={(e) => setNumResProprietario(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={bairroProprietario} onChange={(e) => setBairroProprietario(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidadeProprietario} onChange={(e) => setCidadeProprietario(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF
              <SelectUf value={ufProprietario} onChange={setUfProprietario} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Procurador</legend>
            <label className={labelClass}>
              Nome (pessoa ou empresa)
              <input className={fieldClass} value={nomeProcurador} onChange={(e) => setNomeProcurador(e.target.value)} />
            </label>
            <label className={labelClass}>
              CPF ou CNPJ
              <input
                className={fieldClass}
                value={docProcurador}
                onChange={(e) => setDocProcurador(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {docProcurador.length > 0 && (
                <span className="mt-1 block text-xs text-gray-500">No PDF (com pontos e traços): {docProcFmt}</span>
              )}
            </label>
            <label className={labelClass}>
              Logradouro
              <input className={fieldClass} value={logradouroProcurador} onChange={(e) => setLogradouroProcurador(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Número
                <input className={fieldClass} value={numResProcurador} onChange={(e) => setNumResProcurador(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={bairroProcurador} onChange={(e) => setBairroProcurador(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              Cidade
              <input className={fieldClass} value={cidadeProcurador} onChange={(e) => setCidadeProcurador(e.target.value)} />
            </label>
            <label className={labelClass}>
              UF
              <SelectUf value={ufProcurador} onChange={setUfProcurador} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Dados bancários e Detran</legend>
            <label className={labelClass}>
              Banco (instituição financeira)
              <input className={fieldClass} value={banco} onChange={(e) => setBanco(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Agência (número)
                <input
                  className={fieldClass}
                  value={agenciaNum}
                  onChange={(e) => setAgenciaNum(apenasDigitos(e.target.value))}
                  inputMode="numeric"
                />
              </label>
              <label className={labelClass}>
                Agência (dígito verificador, opcional)
                <input
                  className={fieldClass}
                  value={agenciaDig}
                  onChange={(e) => setAgenciaDig(apenasDigitos(e.target.value).slice(0, 2))}
                  inputMode="numeric"
                />
              </label>
            </div>
            {agenciaNum.length > 0 && (
              <p className="text-xs text-gray-500">
                No PDF: <strong className="text-gray-300">{agenciaFmt}</strong>
              </p>
            )}
            <label className={labelClass}>
              Tipo de conta
              <select className={fieldClass} value={tipoConta} onChange={(e) => setTipoConta(e.target.value)}>
                {TIPO_CONTA_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Conta (número)
                <input className={fieldClass} value={contaNum} onChange={(e) => setContaNum(apenasDigitos(e.target.value))} inputMode="numeric" />
              </label>
              <label className={labelClass}>
                Conta (dígito verificador, opcional)
                <input
                  className={fieldClass}
                  value={contaDig}
                  onChange={(e) => setContaDig(apenasDigitos(e.target.value).slice(0, 2))}
                  inputMode="numeric"
                />
              </label>
            </div>
            {contaNum.length > 0 && (
              <p className="text-xs text-gray-500">
                No PDF: <strong className="text-gray-300">{contaFmt}</strong>
              </p>
            )}
            <label className={labelClass}>
              UF do Detran
              <SelectUf value={ufDetran} onChange={setUfDetran} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Veículo</legend>
            <label className={labelClass}>
              Descrição do veículo
              <textarea className={`${fieldClass} min-h-[72px]`} value={descricaoVeiculo} onChange={(e) => setDescricaoVeiculo(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Placa
                <input className={fieldClass} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
              </label>
              <label className={labelClass}>
                Renavam
                <input className={fieldClass} value={renavam} onChange={(e) => setRenavam(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              Chassi
              <input className={fieldClass} value={chassi} onChange={(e) => setChassi(e.target.value.toUpperCase())} />
            </label>
            <label className={labelClass}>
              Cor
              <input className={fieldClass} value={cor} onChange={(e) => setCor(e.target.value)} />
            </label>
          </fieldset>

          <p className="text-xs text-gray-500">
            Data por extenso no PDF: <strong className="text-gray-300">{dataExtensoPreview}</strong> (data atual ao gerar).
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
              minHeight: '297mm',
              padding: '16mm 18mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '11pt',
              lineHeight: 1.42,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo />
            <p
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                textDecoration: 'underline',
                margin: '0 0 14px',
                fontSize: '12pt',
              }}
            >
              PROCURAÇÃO
            </p>

            <p style={{ textAlign: 'justify', margin: '0 0 14px' }}>
              Pelo presente instrumento particular de procuração eu <strong>{nomeProprietario.trim() || '…'}</strong> portador do CPF/CNPJ{' '}
              <strong>{docPropFmt || '…'}</strong> residente e domiciliado no endereço: <strong>{logradouroProprietario.trim() || '…'}</strong>,{' '}
              <strong>{numResProprietario.trim() || '…'}</strong>, <strong>{bairroProprietario.trim() || '…'}</strong>, cidade de{' '}
              <strong>{cidadeProprietario.trim() || '…'}</strong> – <strong>{ufProprietario || '…'}</strong>, nomeio e constituo como meu procurador a empresa{' '}
              <strong>{nomeProcurador.trim() || '…'}</strong> portador do CPF/CNPJ <strong>{docProcFmt || '…'}</strong>, residente e domiciliado no endereço:{' '}
              <strong>{logradouroProcurador.trim() || '…'}</strong>, <strong>{numResProcurador.trim() || '…'}</strong>, <strong>{bairroProcurador.trim() || '…'}</strong>,{' '}
              <strong>{cidadeProcurador.trim() || '…'}</strong> – <strong>{ufProcurador || '…'}</strong>, com poderes para receber pagamento pela venda do veículo na
              seguinte conta bancária: banco: <strong>{banco.trim() || '…'}</strong> – <strong>Agência {agenciaFmt || '…'}</strong>,{' '}
              <strong>
                {tipoConta}: {contaFmt || '…'}
              </strong>
              , e representar-me junto ao Detran – <strong>{ufDetran || '…'}</strong>, podendo solicitar e retirar a 2ª via do CRV, CRLV, efetuar transferência em
              meu nome, solicitar emplacamento, retirar o veículo do pátio, fazer quitação, solicitar baixa de gravame, reativação, assinar o recibo de
              transferência, podendo passar para o seu próprio nome ou a terceiros, assinar termos e declarações, baixa definitiva do veículo, assinar declaração
              de residência, não podendo substabelecer. Referente ao veículo: <strong>{descricaoVeiculo.trim() || '…'}</strong>, placa:{' '}
              <strong>{placa.trim() || '…'}</strong>, Renavam: <strong>{renavam.trim() || '…'}</strong>, chassi <strong>{chassi.trim() || '…'}</strong>, cor{' '}
              <strong>{cor.trim() || '…'}</strong>.
            </p>

            <p style={{ margin: '14mm 0 0' }}>
              <strong>{cidadeProprietario.trim() || '…'}</strong> – <strong>{ufProprietario || '…'}</strong>, <strong>{dataExtensoDoc}</strong>.
            </p>

            <div style={{ marginTop: '24mm', minHeight: '16mm' }} aria-hidden="true" />
            <div style={{ borderTop: '1px solid #000', width: '85%', margin: '0 auto' }} />
            <p style={{ textAlign: 'center', margin: '10pt 0 0', fontWeight: 'bold' }}>{nomeProprietario.trim() || '…'}</p>
            <p style={{ textAlign: 'center', margin: '4pt 0 0', fontWeight: 'bold' }}>{docPropFmt || '…'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
