import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { apenasDigitos, formatarCep, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import PdfOverlayEditorShell from './pdfOverlay/PdfOverlayEditorShell';
import { PDF_TEMPLATE_BASE, POSICOES_TERMO_MULTA } from './pdfOverlay/pdfLayouts';

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-xs font-medium text-gray-400';

function mesAtualPorExtenso() {
  return dayjs().locale('pt-br').format('MMMM');
}

export default function TermoVeiculoComMultaEditor({ onVoltar }) {
  const [cons, setCons] = useState('');
  const [consCpf, setConsCpf] = useState('');
  const [consId, setConsId] = useState('');
  const [orgao, setOrgao] = useState('');
  const [ufOrgao, setUfOrgao] = useState('MT');
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
  const [cepStatus, setCepStatus] = useState('');

  const [dataCidade, setDataCidade] = useState('');
  const [dataDia, setDataDia] = useState(() => String(dayjs().date()));
  const [dataMes, setDataMes] = useState(() => mesAtualPorExtenso());
  const [dataAno, setDataAno] = useState(() => String(dayjs().year()));

  const consCpfFmt = formatarCpfOuCnpj(consCpf);

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
        if (r.logradouro) setLogradouro(r.logradouro);
        if (r.bairro) setBairro(r.bairro);
        const loc = r.localidade || '';
        setCity(loc);
        if (loc) setDataCidade(loc);
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

  const validate = useCallback(() => {
    if (!cons.trim()) return 'Informe o nome do consorciado.';
    const dig = apenasDigitos(consCpf);
    if (dig.length !== 11 && dig.length !== 14) return 'CPF ou CNPJ inválido.';
    if (!consId.trim()) return 'Informe o RG.';
    if (!orgao.trim()) return 'Informe o órgão.';
    if (!logradouro.trim() || !number.trim() || !bairro.trim()) return 'Preencha o endereço completo.';
    if (apenasDigitos(cepDigitos).length !== 8) return 'CEP inválido.';
    if (!city.trim() || !uf.trim()) return 'Informe cidade e UF.';
    if (!descricao.trim()) return 'Informe a descrição do veículo.';
    if (!renavam.trim()) return 'Informe o Renavam.';
    if (!chassi.trim()) return 'Informe o chassi.';
    if (!placa.trim()) return 'Informe a placa.';
    if (!dataCidade.trim()) return 'Informe a cidade da data.';
    if (!dataDia.trim()) return 'Informe o dia.';
    if (!dataMes.trim()) return 'Informe o mês.';
    if (!dataAno.trim() || dataAno.trim().length < 4) return 'Informe o ano (4 dígitos).';
    return null;
  }, [
    cons,
    consCpf,
    consId,
    orgao,
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
    dataCidade,
    dataDia,
    dataMes,
    dataAno,
  ]);

  const formReady = !validate();
  const enderecoLinha = `${logradouro.trim()}, nº ${number.trim()}, ${bairro.trim()}`.toUpperCase();

  const buildCards = useCallback(
    () => [
      { id: 'nome', text: cons.trim().toUpperCase() },
      { id: 'rg', text: consId.trim() },
      { id: 'orgao', text: `${orgao.trim()}/${ufOrgao}`.toUpperCase() },
      { id: 'cpf', text: consCpfFmt },
      { id: 'logradouro', text: enderecoLinha },
      { id: 'cidade', text: city.trim().toUpperCase() },
      { id: 'cep', text: formatarCep(cepDigitos) },
      { id: 'uf', text: uf.trim().toUpperCase() },
      { id: 'veiculo', text: descricao.trim().toUpperCase() },
      { id: 'renavam', text: renavam.trim().toUpperCase() },
      { id: 'chassi', text: chassi.trim().toUpperCase() },
      { id: 'placa', text: placa.trim().toUpperCase() },
      { id: 'dataCidade', text: dataCidade.trim() },
      { id: 'dataDia', text: dataDia.trim() },
      { id: 'dataMes', text: dataMes.trim().toLowerCase() },
      { id: 'dataAno', text: dataAno.trim() },
      { id: 'assNome', text: cons.trim().toUpperCase() },
      { id: 'assCpf', text: consCpfFmt },
    ],
    [
      cons,
      consId,
      orgao,
      ufOrgao,
      consCpfFmt,
      enderecoLinha,
      city,
      cepDigitos,
      uf,
      descricao,
      renavam,
      chassi,
      placa,
      dataCidade,
      dataDia,
      dataMes,
      dataAno,
    ]
  );

  const form = useMemo(
    () => (
      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
        <label className={labelClass}>
          Consorciado
          <input className={fieldClass} value={cons} onChange={(e) => setCons(e.target.value)} />
        </label>
        <label className={labelClass}>
          CPF/CNPJ
          <input
            className={fieldClass}
            inputMode="numeric"
            value={consCpf}
            onChange={(e) => setConsCpf(apenasDigitos(e.target.value).slice(0, 14))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={consId} onChange={(e) => setConsId(e.target.value)} />
          </label>
          <label className={labelClass}>
            Órgão
            <input className={fieldClass} value={orgao} onChange={(e) => setOrgao(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          UF órgão
          <select className={fieldClass} value={ufOrgao} onChange={(e) => setUfOrgao(e.target.value)}>
            {SIGLAS_UF_BR.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          CEP
          <input
            className={fieldClass}
            inputMode="numeric"
            value={cepDigitos}
            onChange={(e) => setCepDigitos(apenasDigitos(e.target.value).slice(0, 8))}
          />
          {cepStatus ? <span className="text-[11px] text-gray-500">{cepStatus}</span> : null}
        </label>
        <label className={labelClass}>
          Logradouro
          <input className={fieldClass} value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Nº
            <input className={fieldClass} value={number} onChange={(e) => setNumber(e.target.value)} />
          </label>
          <label className={labelClass}>
            Bairro
            <input className={fieldClass} value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className={`${labelClass} col-span-2`}>
            Cidade
            <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className={labelClass}>
            UF
            <select className={fieldClass} value={uf} onChange={(e) => setUf(e.target.value)}>
              <option value="">—</option>
              {SIGLAS_UF_BR.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={labelClass}>
          Veículo
          <input className={fieldClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>
        <label className={labelClass}>
          Renavam
          <input className={fieldClass} value={renavam} onChange={(e) => setRenavam(e.target.value)} />
        </label>
        <label className={labelClass}>
          Chassi
          <input className={fieldClass} value={chassi} onChange={(e) => setChassi(e.target.value)} />
        </label>
        <label className={labelClass}>
          Placa
          <input className={fieldClass} value={placa} onChange={(e) => setPlaca(e.target.value)} />
        </label>

        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide pt-2">
          Data no rodapé do documento
        </p>
        <label className={labelClass}>
          Cidade (data)
          <input className={fieldClass} value={dataCidade} onChange={(e) => setDataCidade(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className={labelClass}>
            Dia
            <input
              className={fieldClass}
              inputMode="numeric"
              value={dataDia}
              onChange={(e) => setDataDia(apenasDigitos(e.target.value).slice(0, 2))}
            />
          </label>
          <label className={labelClass}>
            Mês
            <input className={fieldClass} value={dataMes} onChange={(e) => setDataMes(e.target.value)} />
          </label>
          <label className={labelClass}>
            Ano
            <input
              className={fieldClass}
              inputMode="numeric"
              value={dataAno}
              onChange={(e) => setDataAno(apenasDigitos(e.target.value).slice(0, 4))}
            />
          </label>
        </div>
      </div>
    ),
    [
      cons,
      consCpf,
      consId,
      orgao,
      ufOrgao,
      cepDigitos,
      cepStatus,
      logradouro,
      number,
      bairro,
      city,
      uf,
      descricao,
      renavam,
      chassi,
      placa,
      dataCidade,
      dataDia,
      dataMes,
      dataAno,
    ]
  );

  return (
    <PdfOverlayEditorShell
      docId="veiculo_multa_v2"
      title="Termo de Veículo com Multa"
      badge="ASSINAR FÍSICO OU GOV"
      pdfUrl={`${PDF_TEMPLATE_BASE}/termo_multa_novo.pdf`}
      downloadPrefix="termo_veiculo_multa"
      defaultPositions={POSICOES_TERMO_MULTA}
      renderForm={() => form}
      validate={validate}
      buildCards={buildCards}
      formReady={formReady}
      getDownloadSuffix={() => apenasDigitos(consCpf).slice(0, 4)}
      onVoltar={onVoltar}
    />
  );
}
