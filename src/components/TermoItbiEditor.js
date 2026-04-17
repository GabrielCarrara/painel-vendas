import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FaArrowLeft, FaFilePdf } from 'react-icons/fa';
import { apenasDigitos, formatarCep, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import { awaitDocumentImagesReady } from '../utils/awaitDocumentImagesReady';

const BADGE_ASSINATURA = 'ASSINAR FÍSICO OU GOV';
const CIDADE_PADRAO = 'PONTES E LACERDA';
const UF_PADRAO = 'MT';
const LOGO_PREF = `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/arquivos/logo_pontes_e_lacerda.jpg`;

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

function fmtData(d, m, a) {
  const dd = apenasDigitos(d).slice(0, 2);
  const mm = apenasDigitos(m).slice(0, 2);
  const aa = apenasDigitos(a).slice(0, 4);
  if (!dd || !mm || !aa) return '';
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${aa}`;
}

function parseBrNumber(v) {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function fmtBrMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0,00';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StepPill({ active, done, children, onClick }) {
  const base =
    'cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition';
  const cls = done
    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
    : active
      ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-100'
      : 'border-gray-600 bg-gray-800/40 text-gray-300 hover:border-gray-500';
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

export default function TermoItbiEditor({ onVoltar }) {
  const printRef = useRef(null);
  const [gerando, setGerando] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1: Adquirente
  const [cons, setCons] = useState('');
  const [idCons, setIdCons] = useState('');
  const [consIdDig, setConsIdDig] = useState('');
  const [logCons, setLogCons] = useState('');
  const [baiCons, setBaiCons] = useState('');
  const [cepConsDig, setCepConsDig] = useState('');
  const [cityCons, setCityCons] = useState('');
  const [ufCons, setUfCons] = useState(UF_PADRAO);
  const [telCons, setTelCons] = useState('');
  const [emailCons, setEmailCons] = useState('');
  const [orgao, setOrgao] = useState('');
  const [ufDoc, setUfDoc] = useState(UF_PADRAO);
  const [diaDoc, setDiaDoc] = useState('');
  const [mesDoc, setMesDoc] = useState('');
  const [anoDoc, setAnoDoc] = useState('');
  const [cepConsStatus, setCepConsStatus] = useState('');

  // Step 2: Vendedor
  const [vend, setVend] = useState('');
  const [idVend, setIdVend] = useState('');
  const [vendIdDig, setVendIdDig] = useState('');
  const [logVend, setLogVend] = useState('');
  const [baiVend, setBaiVend] = useState('');
  const [cepVendDig, setCepVendDig] = useState('');
  const [cityVend, setCityVend] = useState('');
  const [ufVend, setUfVend] = useState(UF_PADRAO);
  const [telVend, setTelVend] = useState('');
  const [emailVend, setEmailVend] = useState('');
  const [cepVendStatus, setCepVendStatus] = useState('');

  // Step 3: Imóvel + valores
  const [ins, setIns] = useState('');
  const [mat, setMat] = useState('');
  const [endImovel, setEndImovel] = useState('');
  const [numeroImovel, setNumeroImovel] = useState('');
  const [bairroImovel, setBairroImovel] = useState('');
  const [complemento, setComplemento] = useState('');
  const [tipoImovel, setTipoImovel] = useState('CASA');
  const [area, setArea] = useState('');
  const [fracao, setFracao] = useState('100,00%');
  const [areaEd, setAreaEd] = useState('');
  const [valorBolso, setValorBolso] = useState('0,00');
  const [valorCarta, setValorCarta] = useState('');

  // Step 4: Assinatura
  const [cityGer, setCityGer] = useState(CIDADE_PADRAO);
  const [ufGer, setUfGer] = useState(UF_PADRAO);
  const [dataLinhaPdf, setDataLinhaPdf] = useState(() => dataAtualPorExtenso());

  const consIdFmt = formatarCpfOuCnpj(consIdDig);
  const vendIdFmt = formatarCpfOuCnpj(vendIdDig);
  const cepConsFmt = formatarCep(cepConsDig);
  const cepVendFmt = formatarCep(cepVendDig);
  const dataDocFmt = useMemo(() => fmtData(diaDoc, mesDoc, anoDoc), [diaDoc, mesDoc, anoDoc]);

  const total = useMemo(() => parseBrNumber(valorBolso) + parseBrNumber(valorCarta), [valorBolso, valorCarta]);
  const totalFmt = useMemo(() => fmtBrMoney(total), [total]);

  useEffect(() => {
    const d = apenasDigitos(cepConsDig);
    if (d.length !== 8) {
      setCepConsStatus('');
      return undefined;
    }
    let cancel = false;
    const h = setTimeout(async () => {
      setCepConsStatus('Consultando…');
      const r = await buscarEnderecoPorCep(d);
      if (cancel) return;
      if (r.ok) {
        setCityCons(r.localidade || '');
        setUfCons((r.uf || '').toUpperCase());
        setCepConsStatus('');
      } else {
        setCepConsStatus(r.erro || 'CEP inválido.');
      }
    }, 400);
    return () => {
      cancel = true;
      clearTimeout(h);
    };
  }, [cepConsDig]);

  useEffect(() => {
    const d = apenasDigitos(cepVendDig);
    if (d.length !== 8) {
      setCepVendStatus('');
      return undefined;
    }
    let cancel = false;
    const h = setTimeout(async () => {
      setCepVendStatus('Consultando…');
      const r = await buscarEnderecoPorCep(d);
      if (cancel) return;
      if (r.ok) {
        setCityVend(r.localidade || '');
        setUfVend((r.uf || '').toUpperCase());
        setCepVendStatus('');
      } else {
        setCepVendStatus(r.erro || 'CEP inválido.');
      }
    }, 400);
    return () => {
      cancel = true;
      clearTimeout(h);
    };
  }, [cepVendDig]);

  const validar = useCallback(() => {
    if (!cons.trim()) return 'Informe o nome do consorciado (adquirente).';
    if (!idCons.trim()) return 'Informe a identificação do documento (adquirente).';
    if (![11, 14].includes(apenasDigitos(consIdDig).length)) return 'CPF/CNPJ do adquirente inválido (11 ou 14 dígitos).';
    if (!logCons.trim() || !baiCons.trim()) return 'Preencha endereço e bairro do adquirente.';
    if (apenasDigitos(cepConsDig).length !== 8) return 'CEP do adquirente deve ter 8 dígitos.';
    if (!cityCons.trim() || !ufCons) return 'Cidade/UF do adquirente não preenchidos. Aguarde o CEP ou corrija.';
    if (!telCons.trim()) return 'Informe o telefone do adquirente.';
    if (!emailCons.trim()) return 'Informe o e-mail do adquirente.';
    if (!orgao.trim()) return 'Informe o órgão expedidor.';
    if (!ufDoc || ufDoc.length !== 2) return 'Informe a UF do documento.';
    if (!dataDocFmt) return 'Preencha a data de emissão da identificação (dia/mês/ano).';

    if (!vend.trim()) return 'Informe o nome do vendedor (transmitente).';
    if (!idVend.trim()) return 'Informe a identificação do documento (vendedor).';
    if (![11, 14].includes(apenasDigitos(vendIdDig).length)) return 'CPF/CNPJ do vendedor inválido (11 ou 14 dígitos).';
    if (!logVend.trim() || !baiVend.trim()) return 'Preencha endereço e bairro do vendedor.';
    if (apenasDigitos(cepVendDig).length !== 8) return 'CEP do vendedor deve ter 8 dígitos.';
    if (!cityVend.trim() || !ufVend) return 'Cidade/UF do vendedor não preenchidos. Aguarde o CEP ou corrija.';
    if (!telVend.trim()) return 'Informe o telefone do vendedor.';
    if (!emailVend.trim()) return 'Informe o e-mail do vendedor.';

    if (!ins.trim()) return 'Informe a inscrição imobiliária.';
    if (!mat.trim()) return 'Informe a matrícula.';
    if (!endImovel.trim()) return 'Informe o endereço do imóvel.';
    if (!numeroImovel.trim()) return 'Informe o número do imóvel.';
    if (!bairroImovel.trim()) return 'Informe o bairro do imóvel.';
    if (!tipoImovel) return 'Selecione o tipo do imóvel (Casa/Terreno).';
    if (!area.trim()) return 'Informe a área do terreno total.';
    if (!fracao.trim()) return 'Informe a fração ideal.';
    if (!areaEd.trim()) return 'Informe a área total edificada.';
    if (!valorCarta.trim()) return 'Informe o valor da carta de crédito.';

    if (!cityGer.trim()) return 'Informe a cidade de assinatura.';
    if (!ufGer || ufGer.length !== 2) return 'Selecione a UF de assinatura.';
    return null;
  }, [
    cons,
    idCons,
    consIdDig,
    logCons,
    baiCons,
    cepConsDig,
    cityCons,
    ufCons,
    telCons,
    emailCons,
    orgao,
    ufDoc,
    dataDocFmt,
    vend,
    idVend,
    vendIdDig,
    logVend,
    baiVend,
    cepVendDig,
    cityVend,
    ufVend,
    telVend,
    emailVend,
    ins,
    mat,
    endImovel,
    numeroImovel,
    bairroImovel,
    tipoImovel,
    area,
    fracao,
    areaEd,
    valorCarta,
    cityGer,
    ufGer,
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
      // Margem de segurança para evitar corte nas bordas (linhas/tabelas).
      const margin = 4; // mm
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
      const sufixo = apenasDigitos(consIdDig).slice(0, 4) || 'doc';
      pdf.save(`termo_itbi_${sufixo}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setGerando(false);
    }
  };

  const fieldClass = 'mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white';
  const labelClass = 'block text-sm text-gray-400';

  const passos = [
    { id: 0, label: 'Dados consorciado' },
    { id: 1, label: 'Dados vendedor' },
    { id: 2, label: 'Dados do imóvel' },
    { id: 3, label: 'Assinatura' },
  ];

  const done = (i) => i < step;

  const Cell = ({ children, style, ...rest }) => (
    <td {...rest} style={{ border: '1px solid #111', padding: '4px 6px', verticalAlign: 'top', ...style }}>
      {children}
    </td>
  );
  const TH = ({ children, style, ...rest }) => (
    <th {...rest} style={{ border: '1px solid #111', padding: '4px 6px', textAlign: 'left', ...style }}>
      {children}
    </th>
  );

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
          <h2 className="text-xl font-bold text-white">Termo de Solicitação do ITBI</h2>
          <span className="shrink-0 rounded border border-amber-500/50 bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-200">
            ({BADGE_ASSINATURA})
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {passos.map((p) => (
          <StepPill key={p.id} active={p.id === step} done={done(p.id)} onClick={() => setStep(p.id)}>
            {p.label}
          </StepPill>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          {step === 0 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-indigo-300">DADOS CONSORCIADO (Adquirente)</legend>
              <label className={labelClass}>
                Nome
                <input className={fieldClass} value={cons} onChange={(e) => setCons(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Identificação (documento)
                  <input className={fieldClass} value={idCons} onChange={(e) => setIdCons(e.target.value)} />
                </label>
                <label className={labelClass}>
                  CPF/CNPJ (só números)
                  <input
                    className={fieldClass}
                    value={consIdDig}
                    onChange={(e) => setConsIdDig(apenasDigitos(e.target.value).slice(0, 14))}
                    inputMode="numeric"
                    placeholder="Apenas números"
                  />
                  {consIdDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {consIdFmt}</span> : null}
                </label>
              </div>
              <label className={labelClass}>
                Endereço (logradouro + nº)
                <input className={fieldClass} value={logCons} onChange={(e) => setLogCons(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={baiCons} onChange={(e) => setBaiCons(e.target.value)} />
              </label>
              <label className={labelClass}>
                CEP
                <input
                  className={fieldClass}
                  value={cepConsDig}
                  onChange={(e) => setCepConsDig(apenasDigitos(e.target.value).slice(0, 8))}
                  inputMode="numeric"
                  placeholder="Apenas números"
                />
                {cepConsDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cepConsFmt || '—'}</span> : null}
                {cepConsStatus ? <p className="mt-1 text-xs text-amber-400">{cepConsStatus}</p> : null}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Município (auto pelo CEP; pode editar)
                  <input className={fieldClass} value={cityCons} onChange={(e) => setCityCons(e.target.value)} />
                </label>
                <label className={labelClass}>
                  UF
                  <SelectUf value={ufCons} onChange={setUfCons} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Telefone
                  <input className={fieldClass} value={telCons} onChange={(e) => setTelCons(e.target.value)} />
                </label>
                <label className={labelClass}>
                  E-mail
                  <input className={fieldClass} value={emailCons} onChange={(e) => setEmailCons(e.target.value)} inputMode="email" />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className={labelClass}>
                  Órgão expedidor
                  <input className={fieldClass} value={orgao} onChange={(e) => setOrgao(e.target.value)} />
                </label>
                <label className={labelClass}>
                  UF do documento
                  <SelectUf value={ufDoc} onChange={setUfDoc} />
                </label>
                <div className={labelClass}>
                  Data emissão identificação
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <input className={fieldClass} value={diaDoc} onChange={(e) => setDiaDoc(apenasDigitos(e.target.value).slice(0, 2))} placeholder="DD" />
                    <input className={fieldClass} value={mesDoc} onChange={(e) => setMesDoc(apenasDigitos(e.target.value).slice(0, 2))} placeholder="MM" />
                    <input className={fieldClass} value={anoDoc} onChange={(e) => setAnoDoc(apenasDigitos(e.target.value).slice(0, 4))} placeholder="AAAA" />
                  </div>
                  {dataDocFmt ? <span className="mt-1 block text-xs text-gray-500">No PDF: {dataDocFmt}</span> : null}
                </div>
              </div>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-indigo-300">DADOS DO VENDEDOR (Transmitente)</legend>
              <label className={labelClass}>
                Nome
                <input className={fieldClass} value={vend} onChange={(e) => setVend(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Identificação (documento)
                  <input className={fieldClass} value={idVend} onChange={(e) => setIdVend(e.target.value)} />
                </label>
                <label className={labelClass}>
                  CPF/CNPJ (só números)
                  <input
                    className={fieldClass}
                    value={vendIdDig}
                    onChange={(e) => setVendIdDig(apenasDigitos(e.target.value).slice(0, 14))}
                    inputMode="numeric"
                    placeholder="Apenas números"
                  />
                  {vendIdDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {vendIdFmt}</span> : null}
                </label>
              </div>
              <label className={labelClass}>
                Endereço (logradouro + nº)
                <input className={fieldClass} value={logVend} onChange={(e) => setLogVend(e.target.value)} />
              </label>
              <label className={labelClass}>
                Bairro
                <input className={fieldClass} value={baiVend} onChange={(e) => setBaiVend(e.target.value)} />
              </label>
              <label className={labelClass}>
                CEP
                <input
                  className={fieldClass}
                  value={cepVendDig}
                  onChange={(e) => setCepVendDig(apenasDigitos(e.target.value).slice(0, 8))}
                  inputMode="numeric"
                  placeholder="Apenas números"
                />
                {cepVendDig ? <span className="mt-1 block text-xs text-gray-500">No PDF: {cepVendFmt || '—'}</span> : null}
                {cepVendStatus ? <p className="mt-1 text-xs text-amber-400">{cepVendStatus}</p> : null}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Município (auto pelo CEP; pode editar)
                  <input className={fieldClass} value={cityVend} onChange={(e) => setCityVend(e.target.value)} />
                </label>
                <label className={labelClass}>
                  UF
                  <SelectUf value={ufVend} onChange={setUfVend} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Telefone
                  <input className={fieldClass} value={telVend} onChange={(e) => setTelVend(e.target.value)} />
                </label>
                <label className={labelClass}>
                  E-mail
                  <input className={fieldClass} value={emailVend} onChange={(e) => setEmailVend(e.target.value)} inputMode="email" />
                </label>
              </div>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-indigo-300">DADOS DO IMÓVEL + VALORES</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Inscrição imobiliária
                  <input className={fieldClass} value={ins} onChange={(e) => setIns(e.target.value)} />
                </label>
                <label className={labelClass}>
                  Matrícula
                  <input className={fieldClass} value={mat} onChange={(e) => setMat(e.target.value)} />
                </label>
              </div>
              <label className={labelClass}>
                Endereço do imóvel
                <input className={fieldClass} value={endImovel} onChange={(e) => setEndImovel(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Nº
                  <input className={fieldClass} value={numeroImovel} onChange={(e) => setNumeroImovel(e.target.value)} />
                </label>
                <label className={labelClass}>
                  Bairro
                  <input className={fieldClass} value={bairroImovel} onChange={(e) => setBairroImovel(e.target.value)} />
                </label>
              </div>
              <label className={labelClass}>
                Complemento (opcional)
                <input className={fieldClass} value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Tipo do imóvel
                  <select className={fieldClass} value={tipoImovel} onChange={(e) => setTipoImovel(e.target.value)}>
                    <option value="CASA">Casa</option>
                    <option value="TERRENO">Terreno</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Fração ideal
                  <input className={fieldClass} value={fracao} onChange={(e) => setFracao(e.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Área terreno total (m²)
                  <input className={fieldClass} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex.: 302,00m²" />
                </label>
                <label className={labelClass}>
                  Área total edificada (m²)
                  <input className={fieldClass} value={areaEd} onChange={(e) => setAreaEd(e.target.value)} placeholder="Ex.: 128,09m²" />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className={labelClass}>
                  Valor do bolso (R$)
                  <input className={fieldClass} value={valorBolso} onChange={(e) => setValorBolso(e.target.value)} />
                </label>
                <label className={labelClass}>
                  Valor financiado / carta (R$)
                  <input className={fieldClass} value={valorCarta} onChange={(e) => setValorCarta(e.target.value)} />
                </label>
                <label className={labelClass}>
                  Total (R$)
                  <input className={fieldClass} value={totalFmt} readOnly />
                </label>
              </div>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-indigo-300">DATA E CIDADE/UF (assinatura)</legend>
              <label className={labelClass}>
                Cidade
                <input className={fieldClass} value={cityGer} onChange={(e) => setCityGer(e.target.value)} />
              </label>
              <label className={labelClass}>
                UF
                <SelectUf value={ufGer} onChange={setUfGer} />
              </label>
              <p className="text-xs text-gray-500">
                Data no PDF: <strong className="text-gray-300">{dataLinhaPdf}</strong> (atualizada ao clicar em Gerar PDF).
              </p>
            </fieldset>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600 disabled:opacity-50"
              disabled={step === 0}
            >
              Voltar etapa
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500"
              >
                Próxima etapa
              </button>
            ) : (
              <button
                type="button"
                disabled={gerando}
                onClick={gerarPdf}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <FaFilePdf /> {gerando ? 'Gerando…' : 'GERAR PDF'}
              </button>
            )}
          </div>
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
                minHeight: '297mm',
                padding: '9mm 9mm',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '9.5pt',
                lineHeight: 1.25,
                boxSizing: 'border-box',
                position: 'relative',
                margin: '0 auto',
              }}
            >
            <div style={{ width: '192mm', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6mm' }}>
                <img
                  src={LOGO_PREF}
                  alt="Prefeitura Municipal de Pontes e Lacerda"
                  style={{ width: '22mm', height: '22mm', objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0, fontSize: '8.5pt', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>ESTADO DE MATO GROSSO</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>PREFEITURA MUNICIPAL DE PONTES E LACERDA</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>SECRETARIA DE FAZENDA E PLANEJAMENTO</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>COORDENADORIA DE GESTÃO FISCAL TRIBUTÁRIA</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>SETOR DE FISCALIZAÇÃO TRIBUTÁRIA</div>
                </div>
                <div style={{ border: '1px solid #111', padding: '2mm 3mm', fontWeight: 'bold', fontSize: '9pt', whiteSpace: 'nowrap' }}>
                  PROTOCOLO Nº
                </div>
              </div>

              <div style={{ marginTop: '4mm', textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline' }}>
                DECLARAÇÃO DE VENDA E TRANSAÇÃO IMOBILIÁRIA – URBANO
              </div>

              <div style={{ height: '3mm' }} aria-hidden="true" />

              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <TH colSpan={6} style={{ fontWeight: 'bold' }}>
                    1. DADOS DO(A) ADQUIRENTE(S)
                  </TH>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Nome: <u>{cons.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    IDENTIFICAÇÃO: <u>{idCons.trim() || '…'}</u>
                  </Cell>
                  <Cell>
                    CPF/CNPJ: <u>{consIdFmt || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Endereço: <u>{logCons.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Bairro: <u>{baiCons.trim() || '…'}</u>
                  </Cell>
                  <Cell>
                    Município: <u>{cityCons.trim() || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={2}>
                    CEP: <u>{cepConsFmt || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Telefone: <u>{telCons.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    E-mail: <u>{emailCons.trim() || '…'}</u>
                  </Cell>
                </tr>

                <tr>
                  <TH colSpan={6} style={{ fontWeight: 'bold' }}>
                    2. DADOS DO(S) TRANSMITENTE(S)
                  </TH>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Nome: <u>{vend.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    IDENTIFICAÇÃO: <u>{idVend.trim() || '…'}</u>
                  </Cell>
                  <Cell>
                    CPF/CNPJ: <u>{vendIdFmt || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Endereço: <u>{logVend.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Bairro: <u>{baiVend.trim() || '…'}</u>
                  </Cell>
                  <Cell>
                    Município: <u>{cityVend.trim() || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={2}>
                    CEP: <u>{cepVendFmt || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Telefone: <u>{telVend.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    E-mail: <u>{emailVend.trim() || '…'}</u>
                  </Cell>
                </tr>

                <tr>
                  <TH colSpan={6} style={{ fontWeight: 'bold' }}>
                    3. NATUREZA DA TRANSAÇÃO:
                  </TH>
                </tr>
                <tr>
                  <TH colSpan={6} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    AQUISIÇÃO DE IMÓVEL URBANO
                  </TH>
                </tr>

                <tr>
                  <TH colSpan={6} style={{ fontWeight: 'bold' }}>
                    4. DADOS DO IMÓVEL OBJETO DA TRANSAÇÃO
                  </TH>
                </tr>
                <tr>
                  <Cell colSpan={2}>
                    Inscrição Imobiliária: <u>{ins.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Matrícula: <u>{mat.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={2}>
                    Bairro: <u>{bairroImovel.trim() || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={4}>
                    Endereço: <u>{endImovel.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={1}>
                    Nº <u>{numeroImovel.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={1}>
                    {/* Mantém a estrutura do modelo */}{' '}
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Complemento: <u>{complemento.trim() || '—'}</u>
                  </Cell>
                  <Cell colSpan={3}>
                    Tipo de imóvel (Casa/Terreno): <u>{tipoImovel === 'CASA' ? 'Casa' : 'Terreno'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Área do Terreno: <u>{area.trim() || '…'}</u>
                  </Cell>
                  <Cell colSpan={3}>
                    Fração Ideal: <u>{fracao.trim() || '…'}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={6}>
                    Área Edificada Total: <u>{areaEd.trim() || '…'}</u>
                  </Cell>
                </tr>

                <tr>
                  <TH colSpan={6} style={{ fontWeight: 'bold' }}>
                    5. VALOR DA OPERAÇÃO
                  </TH>
                </tr>
                <tr>
                  <Cell colSpan={3}>
                    Valor não Financiado: R$ <u>{fmtBrMoney(parseBrNumber(valorBolso))}</u>
                  </Cell>
                  <Cell colSpan={3}>
                    Valor Financiado: R$ <u>{fmtBrMoney(parseBrNumber(valorCarta))}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={6}>
                    Total Declarado: R$ <u>{totalFmt}</u>
                  </Cell>
                </tr>
                <tr>
                  <Cell colSpan={6} style={{ fontSize: '8.2pt', lineHeight: 1.25, padding: '5px 7px' }}>
                    <p style={{ margin: '0 0 6px', textAlign: 'justify' }}>
                      Constitui crime contra a ordem tributária suprimir ou reduzir tributo mediante declaração falsa às autoridades fazendárias. Pena de reclusão de 2
                      (dois) a 5 (cinco) anos, e multa. (Art. 1º, I, Lei Federal 8.137/90), e o Artigo 2° da Lei n° 8.137, de 27 de dezembro de 1990.
                    </p>
                    <p style={{ margin: '0 0 6px', textAlign: 'justify' }}>
                      A base de cálculo será determinada pela administração tributária, através de avaliação feita com base nos elementos de que dispuser, ainda que
                      declarado pelo sujeito passivo, conforme artigo 95, do Código Tributário Municipal: periodicamente atualizada pelo Município, e considerando o de
                      maior valor de base de cálculo.
                    </p>
                    <p style={{ margin: 0, textAlign: 'justify' }}>
                      Em conformidade com o artigo 344, inciso I, do Código Tributário Municipal, será punido com multa de 100 (cem) vezes a UFPL (Unidade Fiscal de
                      Pontes e Lacerda) quaisquer pessoas, independentemente de cargo, ofício ou função, ministério, atividade ou profissão, que embaraçarem, eludirem
                      ou dificultarem a ação da Fazenda Municipal.,
                    </p>
                  </Cell>
                </tr>
              </tbody>
            </table>

            <div style={{ height: '6mm' }} aria-hidden="true" />

            <div style={{ border: '1px solid #111' }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '2mm 0' }}>
                ADQUIRENTE OU RESPONSÁVEL ELE AUTORIZADO PELAS INFORMAÇÕES
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <Cell colSpan={2}>
                      Nome: <u>{cons.trim() || '…'}</u>
                    </Cell>
                    <Cell colSpan={2}>
                      Telefone p/Contato: <u>{telCons.trim() || '…'}</u>
                    </Cell>
                    <Cell colSpan={2}>
                      {' '}
                    </Cell>
                  </tr>
                  <tr>
                    <Cell colSpan={2}>
                      CPF/CNPJ: <u>{consIdFmt || '…'}</u>
                    </Cell>
                    <Cell colSpan={2}>
                      IDENTIFICAÇÃO: <u>{idCons.trim() || '…'}</u>
                    </Cell>
                    <Cell colSpan={2}>
                      Data de Emissão da IDENTIFICAÇÃO: <u>{dataDocFmt || '…'}</u>
                    </Cell>
                  </tr>
                  <tr>
                    <Cell colSpan={3}>
                      Órgão Expedidor: <u>{orgao.trim() || '…'}</u>
                    </Cell>
                    <Cell colSpan={1}>
                      UF: <u>{ufDoc || '…'}</u>
                    </Cell>
                    <Cell colSpan={2}>{' '}</Cell>
                  </tr>
                  <tr>
                    <Cell colSpan={6} style={{ fontSize: '8.5pt' }}>
                      Declaro, sob as penas da lei, que as informações prestadas acima são verdadeiras,
                    </Cell>
                  </tr>
                  <tr>
                    <Cell colSpan={6} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      {cityGer.trim() || '…'} – {(ufGer || '').toUpperCase() || '…'}, {dataLinhaPdf}.
                    </Cell>
                  </tr>
                  <tr>
                    <Cell colSpan={6} style={{ textAlign: 'center' }}>
                      <div style={{ minHeight: '14mm' }} aria-hidden="true" />
                      <div style={{ borderTop: '1px solid #000', width: '70%', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '9pt' }}>Assinatura do Adquirente ou Responsável que Autoriza</div>
                    </Cell>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

