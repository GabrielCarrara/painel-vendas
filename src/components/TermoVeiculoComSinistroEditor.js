import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCep, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';
import GazinDocHeaderLogo from './GazinDocHeaderLogo';

const BADGE_ASSINATURA = 'ASSINAR FÍSICO OU GOV';
const UF_PADRAO = 'MT';

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

export default function TermoVeiculoComSinistroEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);
  const [cepStatus, setCepStatus] = useState('');

  const [nome, setNome] = useState('');
  const [doc, setDoc] = useState('');
  const [orgao, setOrgao] = useState('');
  const [ufOrgao, setUfOrgao] = useState(UF_PADRAO);
  const [idDigitos, setIdDigitos] = useState('');

  const [logradouro, setLogradouro] = useState('');
  const [number, setNumber] = useState('');
  const [bairro, setBairro] = useState('');
  const [cepDigitos, setCepDigitos] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');

  const [descricao, setDescricao] = useState('');
  const [renavam, setRenavam] = useState('');
  const [chassi, setChassi] = useState('');
  const [placa, setPlaca] = useState('');

  const idFmt = formatarCpfOuCnpj(idDigitos);
  const cepFmt = formatarCep(cepDigitos);
  const dataExtensoDoc = dataAtualPorExtenso();

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
        setCity(r.localidade || '');
        setUf((r.uf || '').toUpperCase());
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
    if (!nome.trim()) return 'Informe o nome do consorciado.';
    if (!doc.trim()) return 'Informe o número do documento de identificação.';
    if (!orgao.trim()) return 'Informe o órgão expedidor.';
    const idN = apenasDigitos(idDigitos);
    if (idN.length !== 11 && idN.length !== 14) return 'CPF ou CNPJ inválido (11 ou 14 dígitos).';
    if (!logradouro.trim()) return 'Informe o logradouro.';
    if (!number.trim()) return 'Informe o número.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (apenasDigitos(cepDigitos).length !== 8) return 'CEP deve ter 8 dígitos.';
    if (!city.trim() || !uf.trim()) return 'Aguarde o preenchimento de cidade/UF pelo CEP (ou corrija manualmente).';
    if (!descricao.trim()) return 'Informe a descrição do veículo.';
    if (!renavam.trim()) return 'Informe o Renavam.';
    if (!chassi.trim()) return 'Informe o chassi.';
    if (!placa.trim()) return 'Informe a placa.';
    return null;
  }, [
    nome,
    doc,
    orgao,
    idDigitos,
    logradouro,
    number,
    bairro,
    cepDigitos,
    city,
    uf,
    descricao,
    renavam,
    chassi,
    placa,
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
      const sufixo = apenasDigitos(idDigitos).slice(0, 4) || 'doc';
      pdf.save(`termo_veiculo_sinistro_${sufixo}.pdf`);
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
          <h2 className="text-xl font-bold text-white">Autorização — veículo com sinistro</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_ASSINATURA})
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Dados do consorciado</legend>
            <label className={labelClass}>
              Nome do consorciado
              <input className={fieldClass} value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label className={labelClass}>
              Nº do documento de identificação (RG/IE etc.)
              <input className={fieldClass} value={doc} onChange={(e) => setDoc(e.target.value)} />
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
              CPF ou CNPJ
              <input
                className={fieldClass}
                value={idDigitos}
                onChange={(e) => setIdDigitos(apenasDigitos(e.target.value).slice(0, 14))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {idDigitos.length > 0 ? <span className="mt-1 block text-xs text-gray-500">No PDF: {idFmt}</span> : null}
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Endereço</legend>
            <label className={labelClass}>
              Logradouro (rua ou avenida)
              <input className={fieldClass} value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Número residencial
                <input className={fieldClass} value={number} onChange={(e) => setNumber(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </label>
            </div>
            <label className={labelClass}>
              CEP
              <input
                className={fieldClass}
                value={cepDigitos}
                onChange={(e) => setCepDigitos(apenasDigitos(e.target.value).slice(0, 8))}
                inputMode="numeric"
                placeholder="Apenas números"
                autoComplete="off"
              />
              {cepDigitos.length > 0 ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cepFmt || '—'}</span> : null}
              {cepStatus ? <p className="mt-1 text-xs text-amber-400">{cepStatus}</p> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>
                Cidade (preenchida pelo CEP; pode editar)
                <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label className={labelClass}>
                UF
                <SelectUf value={uf || UF_PADRAO} onChange={setUf} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-indigo-300">Veículo</legend>
            <label className={labelClass}>
              Descrição do veículo
              <input className={fieldClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </label>
            <label className={labelClass}>
              Renavam
              <input className={fieldClass} value={renavam} onChange={(e) => setRenavam(e.target.value)} />
            </label>
            <label className={labelClass}>
              Chassi
              <input className={fieldClass} value={chassi} onChange={(e) => setChassi(e.target.value.toUpperCase())} />
            </label>
            <label className={labelClass}>
              Placa
              <input className={fieldClass} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
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
              padding: '16mm 18mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '11pt',
              lineHeight: 1.42,
              boxSizing: 'border-box',
            }}
          >
            <GazinDocHeaderLogo variant="autorizacao_banda" />

            <p style={{ textAlign: 'justify', margin: 0 }}>
              Eu, <strong>{nome.trim() || '…'}</strong>, inscrito(a) no documento sob o nº <strong>{doc.trim() || '…'}</strong>, Órgão expedidor{' '}
              <strong>{orgao.trim() || '…'}</strong> – <strong>{ufOrgao || '…'}</strong>, CPF/CNPJ nº <strong>{idFmt || '…'}</strong>, residente e domiciliado(a) na{' '}
              <strong>{logradouro.trim() || '…'}</strong>, <strong>{number.trim() || '…'}</strong>, <strong>{bairro.trim() || '…'}</strong>, cidade{' '}
              <strong>{city.trim() || '…'}</strong>, CEP <strong>{cepFmt || '…'}</strong>, UF <strong>{(uf || '').toUpperCase() || '…'}</strong>. DECLARO, pelo presente
              termo, ser responsável e autorizar a{' '}
              <strong>
                <u>Administradora de Consórcio Nacional Gazin LTDA</u>
              </strong>
              , inscrita no CNPJ sob o nº{' '}
              <strong>
                <u>06.044.551/0001-33</u>
              </strong>
              , residente na{' '}
              <strong>
                <u>Rua Pedrelina Macedo e Silva nº 100, Jardim Leoni</u>
              </strong>
              , a pagar o Veículo: <strong>{descricao.trim() || '…'}</strong> Renavam: <strong>{renavam.trim() || '…'}</strong> Chassi:{' '}
              <strong>{chassi.trim() || '…'}</strong> Placa: <strong>{placa.trim() || '…'}</strong>, sabendo que o mesmo possui algumas das restrições, indício de
              Sinistro, parecer Técnico desfavorável, alerta de leilão, <strong>Renajud</strong> ou Alerta de Roubo e Furto, sendo assim autorizando o pagamento do Bem
              e tirando toda responsabilidade da Administradora de Consórcio Nacional <strong>Gazin</strong> sobre quaisquer eventualidades de desacordo entre as
              partes.
            </p>

            <p style={{ textAlign: 'center', marginTop: '18mm', fontWeight: 'bold' }}>
              {city.trim() || '…'} – {(uf || '').toUpperCase() || '…'}, {dataExtensoDoc}.
            </p>

            <div style={{ marginTop: '22mm' }}>
              <div style={{ minHeight: '20mm', marginBottom: '2mm' }} aria-hidden />
              <div style={{ borderTop: '1px solid #000', width: '92%', margin: '0 0 8pt' }} />
              <p style={{ margin: '0 0 4pt', fontWeight: 'bold' }}>Nome: {nome.trim() || '…'}</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>CPF/CNPJ: {idFmt || '…'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
