import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { apenasDigitos, formatarCep, formatarCpf } from '../utils/documentosFormat';
import { buscarEnderecoPorCep } from '../utils/viacep';
import { nomeEstadoPorUf, SIGLAS_UF_BR } from '../utils/ufNome';
import PdfOverlayEditorShell from './pdfOverlay/PdfOverlayEditorShell';
import {
  PDF_TEMPLATE_BASE,
  POSICOES_DECLARACAO_RESIDENCIA,
} from './pdfOverlay/pdfLayouts';

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-xs font-medium text-gray-400';

function mesAtualPorExtenso() {
  return dayjs().locale('pt-br').format('MMMM');
}

export default function DeclaracaoResidenciaEditor({ onVoltar }) {
  const [nomeConsorciado, setNomeConsorciado] = useState('');
  const [grupo, setGrupo] = useState('');
  const [cota, setCota] = useState('');
  const [cpfDigitos, setCpfDigitos] = useState('');
  const [nacionalidade, setNacionalidade] = useState('BRASILEIRA');
  const [estadoCivil, setEstadoCivil] = useState('SOLTEIRO (A)');
  const [logradouro, setLogradouro] = useState('');
  const [numeroResidencial, setNumeroResidencial] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cepDigitos, setCepDigitos] = useState('78250000');
  const [cidade, setCidade] = useState('PONTES E LACERDA');
  const [uf, setUf] = useState('MT');
  const [cepStatus, setCepStatus] = useState('');

  const [dataCidade, setDataCidade] = useState('Pontes e Lacerda');
  const [dataDia, setDataDia] = useState(() => String(dayjs().date()));
  const [dataMes, setDataMes] = useState(() => mesAtualPorExtenso());
  const [dataAno, setDataAno] = useState(() => String(dayjs().year()));

  const cpfFormatado = formatarCpf(cpfDigitos);
  const estadoNome = nomeEstadoPorUf(uf) || uf;

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
        setCidade(loc);
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
    if (!nomeConsorciado.trim()) return 'Informe o nome completo.';
    if (apenasDigitos(cpfDigitos).length !== 11) return 'CPF deve ter 11 dígitos.';
    if (!grupo.trim()) return 'Informe o grupo.';
    if (!cota.trim()) return 'Informe a cota.';
    if (!logradouro.trim()) return 'Informe o logradouro.';
    if (!numeroResidencial.trim()) return 'Informe o número.';
    if (!bairro.trim()) return 'Informe o bairro.';
    if (apenasDigitos(cepDigitos).length !== 8) return 'CEP deve ter 8 dígitos.';
    if (!cidade.trim() || !uf.trim()) return 'Informe cidade e UF.';
    if (!dataCidade.trim()) return 'Informe a cidade da data.';
    if (!dataDia.trim()) return 'Informe o dia.';
    if (!dataMes.trim()) return 'Informe o mês.';
    if (!dataAno.trim() || dataAno.trim().length < 4) return 'Informe o ano (4 dígitos).';
    return null;
  }, [
    nomeConsorciado,
    cpfDigitos,
    grupo,
    cota,
    logradouro,
    numeroResidencial,
    bairro,
    cepDigitos,
    cidade,
    uf,
    dataCidade,
    dataDia,
    dataMes,
    dataAno,
  ]);

  const formReady = !validate();

  const buildCards = useCallback(
    () => [
      { id: 'nome', text: nomeConsorciado.trim().toUpperCase() },
      { id: 'grupo', text: grupo.trim() },
      { id: 'cota', text: cota.trim() },
      { id: 'cpf', text: cpfFormatado },
      { id: 'nacionalidade', text: nacionalidade.trim().toUpperCase() },
      { id: 'estadoCivil', text: estadoCivil.trim().toUpperCase() },
      { id: 'logradouro', text: logradouro.trim().toUpperCase() },
      { id: 'numero', text: numeroResidencial.trim() },
      { id: 'complemento', text: complemento.trim().toUpperCase() },
      { id: 'bairro', text: bairro.trim().toUpperCase() },
      { id: 'cep', text: formatarCep(cepDigitos) },
      { id: 'cidade', text: cidade.trim().toUpperCase() },
      { id: 'uf', text: String(estadoNome).toUpperCase() },
      { id: 'dataCidade', text: dataCidade.trim() },
      { id: 'dataDia', text: dataDia.trim() },
      { id: 'dataMes', text: dataMes.trim().toLowerCase() },
      { id: 'dataAno', text: dataAno.trim() },
    ],
    [
      nomeConsorciado,
      grupo,
      cota,
      cpfFormatado,
      nacionalidade,
      estadoCivil,
      logradouro,
      numeroResidencial,
      complemento,
      bairro,
      cepDigitos,
      cidade,
      estadoNome,
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
          Nome completo
          <input className={fieldClass} value={nomeConsorciado} onChange={(e) => setNomeConsorciado(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Grupo
            <input className={fieldClass} value={grupo} onChange={(e) => setGrupo(e.target.value)} />
          </label>
          <label className={labelClass}>
            Cota
            <input className={fieldClass} value={cota} onChange={(e) => setCota(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          CPF
          <input
            className={fieldClass}
            inputMode="numeric"
            value={cpfDigitos}
            onChange={(e) => setCpfDigitos(apenasDigitos(e.target.value).slice(0, 11))}
          />
        </label>
        <label className={labelClass}>
          Nacionalidade
          <input className={fieldClass} value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} />
        </label>
        <label className={labelClass}>
          Estado civil
          <select className={fieldClass} value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)}>
            {['SOLTEIRO (A)', 'CASADO (A)', 'DIVORCIADO (A)', 'VIÚVO (A)', 'UNIÃO ESTÁVEL', 'SEPARADO (A)'].map((o) => (
              <option key={o} value={o}>
                {o}
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
            <input className={fieldClass} value={numeroResidencial} onChange={(e) => setNumeroResidencial(e.target.value)} />
          </label>
          <label className={labelClass}>
            Complemento
            <input className={fieldClass} value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          Bairro
          <input className={fieldClass} value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className={`${labelClass} col-span-2`}>
            Cidade
            <input className={fieldClass} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </label>
          <label className={labelClass}>
            UF
            <select className={fieldClass} value={uf} onChange={(e) => setUf(e.target.value)}>
              {SIGLAS_UF_BR.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-gray-500 pt-1">
          No PDF o estado aparece por extenso: <span className="text-indigo-300">{estadoNome}</span>
        </p>

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
      nomeConsorciado,
      grupo,
      cota,
      cpfDigitos,
      nacionalidade,
      estadoCivil,
      cepDigitos,
      cepStatus,
      logradouro,
      numeroResidencial,
      complemento,
      bairro,
      cidade,
      uf,
      estadoNome,
      dataCidade,
      dataDia,
      dataMes,
      dataAno,
    ]
  );

  return (
    <PdfOverlayEditorShell
      docId="declaracao_residencia_v3"
      title="Declaração de residência"
      badge="ASSINAR FÍSICO OU GOV"
      pdfUrl={`${PDF_TEMPLATE_BASE}/declaracao_residencia_novo.pdf`}
      downloadPrefix="declaracao_residencia"
      defaultPositions={POSICOES_DECLARACAO_RESIDENCIA}
      renderForm={() => form}
      validate={validate}
      buildCards={buildCards}
      formReady={formReady}
      getDownloadSuffix={() => apenasDigitos(cpfDigitos).slice(0, 4)}
      onVoltar={onVoltar}
    />
  );
}
