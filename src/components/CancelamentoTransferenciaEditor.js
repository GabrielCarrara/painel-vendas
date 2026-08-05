import React, { useCallback, useMemo, useState } from 'react';
import { apenasDigitos, formatarCpfOuCnpj } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import PdfOverlayEditorShell from './pdfOverlay/PdfOverlayEditorShell';
import {
  PDF_TEMPLATE_BASE,
  POSICOES_CANCELAMENTO_TRANSFERENCIA,
} from './pdfOverlay/pdfLayouts';

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-xs font-medium text-gray-400';
const UF_PADRAO = 'MT';
const CIDADE_PADRAO = 'PONTES E LACERDA';

function cpfOuCnpjOk(digitos) {
  const d = apenasDigitos(digitos);
  return d.length === 11 || d.length === 14;
}

export default function CancelamentoTransferenciaEditor({ onVoltar }) {
  const [consorciado, setConsorciado] = useState('');
  const [gruposCotas, setGruposCotas] = useState([{ grupo: '', cota: '' }]);
  const [cpfConsorciado, setCpfConsorciado] = useState('');
  const [idConsorciado, setIdConsorciado] = useState('');
  const [orgaoCons, setOrgaoCons] = useState('');
  const [ufOrgaoCons, setUfOrgaoCons] = useState(UF_PADRAO);
  const [logradouroCons, setLogradouroCons] = useState('');
  const [numCons, setNumCons] = useState('');
  const [complCons, setComplCons] = useState('');
  const [bairroCons, setBairroCons] = useState('');
  const [cidadeCons, setCidadeCons] = useState(CIDADE_PADRAO);
  const [ufCons, setUfCons] = useState(UF_PADRAO);

  const [cessionario, setCessionario] = useState('');
  const [cpfCess, setCpfCess] = useState('');
  const [idCess, setIdCess] = useState('');
  const [orgaoCess, setOrgaoCess] = useState('');
  const [ufOrgaoCess, setUfOrgaoCess] = useState(UF_PADRAO);
  const [logradouroCess, setLogradouroCess] = useState('');
  const [numCess, setNumCess] = useState('');
  const [bairroCess, setBairroCess] = useState('');
  const [cidadeCess, setCidadeCess] = useState(CIDADE_PADRAO);

  const cpfConsFmt = formatarCpfOuCnpj(cpfConsorciado);
  const cpfCessFmt = formatarCpfOuCnpj(cpfCess);
  const grupoTxt = gruposCotas.map((g) => g.grupo).filter(Boolean).join('/');
  const cotaTxt = gruposCotas.map((g) => g.cota).filter(Boolean).join('/');

  const validate = useCallback(() => {
    if (!consorciado.trim()) return 'Informe o nome do consorciado.';
    if (!gruposCotas.some((g) => g.grupo.trim() && g.cota.trim())) return 'Informe ao menos um grupo/cota.';
    if (!cpfOuCnpjOk(cpfConsorciado)) return 'CPF/CNPJ do consorciado inválido.';
    if (!idConsorciado.trim()) return 'Informe o RG do consorciado.';
    if (!orgaoCons.trim()) return 'Informe o órgão (consorciado).';
    if (!logradouroCons.trim() || !numCons.trim() || !bairroCons.trim()) return 'Endereço do consorciado incompleto.';
    if (!cidadeCons.trim()) return 'Informe a cidade do consorciado.';
    if (!cessionario.trim()) return 'Informe o nome do cessionário.';
    if (!cpfOuCnpjOk(cpfCess)) return 'CPF/CNPJ do cessionário inválido.';
    if (!idCess.trim()) return 'Informe o RG do cessionário.';
    if (!orgaoCess.trim()) return 'Informe o órgão (cessionário).';
    if (!logradouroCess.trim() || !numCess.trim() || !bairroCess.trim()) return 'Endereço do cessionário incompleto.';
    if (!cidadeCess.trim()) return 'Informe a cidade do cessionário.';
    return null;
  }, [
    consorciado,
    gruposCotas,
    cpfConsorciado,
    idConsorciado,
    orgaoCons,
    logradouroCons,
    numCons,
    bairroCons,
    cidadeCons,
    cessionario,
    cpfCess,
    idCess,
    orgaoCess,
    logradouroCess,
    numCess,
    bairroCess,
    cidadeCess,
  ]);

  const formReady = !validate();

  const buildCards = useCallback(
    () => [
      { id: 'consNome', text: consorciado.trim().toUpperCase() },
      { id: 'grupo', text: grupoTxt },
      { id: 'cota', text: cotaTxt },
      { id: 'consCpf', text: cpfConsFmt },
      { id: 'consRg', text: idConsorciado.trim() },
      { id: 'consOrgao', text: `${orgaoCons.trim()}/${ufOrgaoCons}`.toUpperCase() },
      {
        id: 'consLogradouro',
        text: `${logradouroCons.trim()}, ${cidadeCons.trim()}-${ufCons}`.toUpperCase(),
      },
      { id: 'consNum', text: numCons.trim() },
      { id: 'consCompl', text: complCons.trim().toUpperCase() },
      { id: 'consBairro', text: bairroCons.trim().toUpperCase() },
      { id: 'consCidade', text: cidadeCons.trim().toUpperCase() },
      { id: 'cessNome', text: cessionario.trim().toUpperCase() },
      { id: 'cessCpf', text: cpfCessFmt },
      { id: 'cessRg', text: idCess.trim() },
      { id: 'cessOrgao', text: `${orgaoCess.trim()}/${ufOrgaoCess}`.toUpperCase() },
      { id: 'cessLogradouro', text: logradouroCess.trim().toUpperCase() },
      { id: 'cessNum', text: numCess.trim() },
      { id: 'cessBairro', text: bairroCess.trim().toUpperCase() },
      { id: 'cessCidade', text: cidadeCess.trim().toUpperCase() },
      { id: 'assConsNome', text: consorciado.trim().toUpperCase() },
      { id: 'assConsCpf', text: cpfConsFmt },
      { id: 'assCessNome', text: cessionario.trim().toUpperCase() },
      { id: 'assCessCpf', text: cpfCessFmt },
    ],
    [
      consorciado,
      grupoTxt,
      cotaTxt,
      cpfConsFmt,
      idConsorciado,
      orgaoCons,
      ufOrgaoCons,
      logradouroCons,
      cidadeCons,
      ufCons,
      numCons,
      complCons,
      bairroCons,
      cessionario,
      cpfCessFmt,
      idCess,
      orgaoCess,
      ufOrgaoCess,
      logradouroCess,
      numCess,
      bairroCess,
      cidadeCess,
    ]
  );

  const form = useMemo(
    () => (
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide">Consorciado</p>
        <label className={labelClass}>
          Nome
          <input className={fieldClass} value={consorciado} onChange={(e) => setConsorciado(e.target.value)} />
        </label>
        {gruposCotas.map((gc, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <label className={labelClass}>
              Grupo {idx + 1}
              <input
                className={fieldClass}
                value={gc.grupo}
                onChange={(e) => {
                  const next = [...gruposCotas];
                  next[idx] = { ...next[idx], grupo: e.target.value };
                  setGruposCotas(next);
                }}
              />
            </label>
            <label className={labelClass}>
              Cota {idx + 1}
              <input
                className={fieldClass}
                value={gc.cota}
                onChange={(e) => {
                  const next = [...gruposCotas];
                  next[idx] = { ...next[idx], cota: e.target.value };
                  setGruposCotas(next);
                }}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="text-[11px] text-indigo-300 hover:underline"
          onClick={() => setGruposCotas((g) => [...g, { grupo: '', cota: '' }])}
        >
          + Grupo/cota
        </button>
        <label className={labelClass}>
          CPF/CNPJ
          <input
            className={fieldClass}
            inputMode="numeric"
            value={cpfConsorciado}
            onChange={(e) => setCpfConsorciado(apenasDigitos(e.target.value).slice(0, 14))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={idConsorciado} onChange={(e) => setIdConsorciado(e.target.value)} />
          </label>
          <label className={labelClass}>
            Órgão
            <input className={fieldClass} value={orgaoCons} onChange={(e) => setOrgaoCons(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          UF órgão
          <select className={fieldClass} value={ufOrgaoCons} onChange={(e) => setUfOrgaoCons(e.target.value)}>
            {SIGLAS_UF_BR.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Logradouro
          <input className={fieldClass} value={logradouroCons} onChange={(e) => setLogradouroCons(e.target.value)} />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className={labelClass}>
            Nº
            <input className={fieldClass} value={numCons} onChange={(e) => setNumCons(e.target.value)} />
          </label>
          <label className={labelClass}>
            Compl.
            <input className={fieldClass} value={complCons} onChange={(e) => setComplCons(e.target.value)} />
          </label>
          <label className={labelClass}>
            Bairro
            <input className={fieldClass} value={bairroCons} onChange={(e) => setBairroCons(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className={`${labelClass} col-span-2`}>
            Cidade
            <input className={fieldClass} value={cidadeCons} onChange={(e) => setCidadeCons(e.target.value)} />
          </label>
          <label className={labelClass}>
            UF
            <select className={fieldClass} value={ufCons} onChange={(e) => setUfCons(e.target.value)}>
              {SIGLAS_UF_BR.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide pt-2">Cessionário</p>
        <label className={labelClass}>
          Nome
          <input className={fieldClass} value={cessionario} onChange={(e) => setCessionario(e.target.value)} />
        </label>
        <label className={labelClass}>
          CPF/CNPJ
          <input
            className={fieldClass}
            inputMode="numeric"
            value={cpfCess}
            onChange={(e) => setCpfCess(apenasDigitos(e.target.value).slice(0, 14))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={idCess} onChange={(e) => setIdCess(e.target.value)} />
          </label>
          <label className={labelClass}>
            Órgão
            <input className={fieldClass} value={orgaoCess} onChange={(e) => setOrgaoCess(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          UF órgão
          <select className={fieldClass} value={ufOrgaoCess} onChange={(e) => setUfOrgaoCess(e.target.value)}>
            {SIGLAS_UF_BR.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Logradouro
          <input className={fieldClass} value={logradouroCess} onChange={(e) => setLogradouroCess(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            Nº
            <input className={fieldClass} value={numCess} onChange={(e) => setNumCess(e.target.value)} />
          </label>
          <label className={labelClass}>
            Bairro
            <input className={fieldClass} value={bairroCess} onChange={(e) => setBairroCess(e.target.value)} />
          </label>
        </div>
        <label className={labelClass}>
          Cidade
          <input className={fieldClass} value={cidadeCess} onChange={(e) => setCidadeCess(e.target.value)} />
        </label>
      </div>
    ),
    [
      consorciado,
      gruposCotas,
      cpfConsorciado,
      idConsorciado,
      orgaoCons,
      ufOrgaoCons,
      logradouroCons,
      numCons,
      complCons,
      bairroCons,
      cidadeCons,
      ufCons,
      cessionario,
      cpfCess,
      idCess,
      orgaoCess,
      ufOrgaoCess,
      logradouroCess,
      numCess,
      bairroCess,
      cidadeCess,
    ]
  );

  return (
    <PdfOverlayEditorShell
      docId="cancelamento_transferencia"
      title="Solicitação do Cancelamento de Transferência"
      badge="RECONHECIDO FIRMA / ASSINATURA GOV"
      pdfUrl={`${PDF_TEMPLATE_BASE}/cancelamento_transferencia_novo.pdf`}
      downloadPrefix="cancelamento_transferencia"
      defaultPositions={POSICOES_CANCELAMENTO_TRANSFERENCIA}
      renderForm={() => form}
      validate={validate}
      buildCards={buildCards}
      formReady={formReady}
      getDownloadSuffix={() => apenasDigitos(cpfConsorciado).slice(0, 4)}
      onVoltar={onVoltar}
    />
  );
}
