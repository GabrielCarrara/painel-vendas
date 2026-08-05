import React, { useCallback, useMemo, useState } from 'react';
import { apenasDigitos, formatarCpf } from '../utils/documentosFormat';
import { SIGLAS_UF_BR } from '../utils/ufNome';
import { dataAtualPorExtenso } from '../utils/dataExtenso';
import PdfOverlayEditorShell from './pdfOverlay/PdfOverlayEditorShell';
import { PDF_TEMPLATE_BASE, POSICOES_UNIAO_ESTAVEL } from './pdfOverlay/pdfLayouts';

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-600 bg-gray-900/60 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-xs font-medium text-gray-400';

const ESTADO_CIVIL_OPCOES = [
  'SOLTEIRO (A)',
  'VIÚVO',
  'CASADO',
  'SEPARADO (A)',
  'DIVORCIADO (A)',
  'UNIÃO ESTÁVEL',
];

export default function CertidaoNegativaUniaoEstavelEditor({ onVoltar }) {
  const [consorciado, setConsorciado] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('SOLTEIRO (A)');
  const [rg, setRg] = useState('');
  const [ufOrgao, setUfOrgao] = useState('MT');
  const [cpfDigitos, setCpfDigitos] = useState('');
  const [localEData, setLocalEData] = useState(() => `Pontes e Lacerda - MT, ${dataAtualPorExtenso()}`);

  const [t1Nome, setT1Nome] = useState('');
  const [t1Rg, setT1Rg] = useState('');
  const [t1Cpf, setT1Cpf] = useState('');
  const [t2Nome, setT2Nome] = useState('');
  const [t2Rg, setT2Rg] = useState('');
  const [t2Cpf, setT2Cpf] = useState('');

  const cpfFmt = formatarCpf(cpfDigitos);
  const t1CpfFmt = formatarCpf(t1Cpf);
  const t2CpfFmt = formatarCpf(t2Cpf);

  const validate = useCallback(() => {
    if (!consorciado.trim()) return 'Informe o nome do declarante.';
    if (!rg.trim()) return 'Informe o RG.';
    if (apenasDigitos(cpfDigitos).length !== 11) return 'CPF deve ter 11 dígitos.';
    if (!localEData.trim()) return 'Informe local e data.';
    return null;
  }, [consorciado, rg, cpfDigitos, localEData]);

  const formReady = !validate();

  const buildCards = useCallback(() => {
    const cards = [
      { id: 'nome', text: consorciado.trim().toUpperCase() },
      { id: 'estadoCivil', text: estadoCivil.trim().toUpperCase() },
      { id: 'rg', text: rg.trim() },
      { id: 'ssp', text: ufOrgao.trim().toUpperCase() },
      { id: 'cpf', text: cpfFmt },
      { id: 'localData', text: localEData.trim() },
      { id: 'declNome', text: consorciado.trim().toUpperCase() },
      { id: 'declCpf', text: cpfFmt },
    ];
    if (t1Nome.trim()) {
      cards.push(
        { id: 't1Nome', text: t1Nome.trim().toUpperCase() },
        { id: 't1Rg', text: t1Rg.trim() },
        { id: 't1Cpf', text: t1CpfFmt }
      );
    }
    if (t2Nome.trim()) {
      cards.push(
        { id: 't2Nome', text: t2Nome.trim().toUpperCase() },
        { id: 't2Rg', text: t2Rg.trim() },
        { id: 't2Cpf', text: t2CpfFmt }
      );
    }
    return cards;
  }, [
    consorciado,
    estadoCivil,
    rg,
    ufOrgao,
    cpfFmt,
    localEData,
    t1Nome,
    t1Rg,
    t1CpfFmt,
    t2Nome,
    t2Rg,
    t2CpfFmt,
  ]);

  const form = useMemo(
    () => (
      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
        <label className={labelClass}>
          Declarante
          <input className={fieldClass} value={consorciado} onChange={(e) => setConsorciado(e.target.value)} />
        </label>
        <label className={labelClass}>
          Estado civil
          <select className={fieldClass} value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)}>
            {ESTADO_CIVIL_OPCOES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={rg} onChange={(e) => setRg(e.target.value)} />
          </label>
          <label className={labelClass}>
            UF (SSP/__)
            <select className={fieldClass} value={ufOrgao} onChange={(e) => setUfOrgao(e.target.value)}>
              {SIGLAS_UF_BR.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
          Local e data
          <input className={fieldClass} value={localEData} onChange={(e) => setLocalEData(e.target.value)} />
        </label>

        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide pt-1">Testemunha 1</p>
        <label className={labelClass}>
          Nome
          <input className={fieldClass} value={t1Nome} onChange={(e) => setT1Nome(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={t1Rg} onChange={(e) => setT1Rg(e.target.value)} />
          </label>
          <label className={labelClass}>
            CPF
            <input
              className={fieldClass}
              inputMode="numeric"
              value={t1Cpf}
              onChange={(e) => setT1Cpf(apenasDigitos(e.target.value).slice(0, 11))}
            />
          </label>
        </div>

        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide pt-1">Testemunha 2</p>
        <label className={labelClass}>
          Nome
          <input className={fieldClass} value={t2Nome} onChange={(e) => setT2Nome(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClass}>
            RG
            <input className={fieldClass} value={t2Rg} onChange={(e) => setT2Rg(e.target.value)} />
          </label>
          <label className={labelClass}>
            CPF
            <input
              className={fieldClass}
              inputMode="numeric"
              value={t2Cpf}
              onChange={(e) => setT2Cpf(apenasDigitos(e.target.value).slice(0, 11))}
            />
          </label>
        </div>
      </div>
    ),
    [
      consorciado,
      estadoCivil,
      rg,
      ufOrgao,
      cpfDigitos,
      localEData,
      t1Nome,
      t1Rg,
      t1Cpf,
      t2Nome,
      t2Rg,
      t2Cpf,
    ]
  );

  return (
    <PdfOverlayEditorShell
      docId="certidao_negativa_uniao_estavel"
      title="Declaração negativa de união estável"
      badge="OBRIGATÓRIO TESTEMUNHAS E RECONHECER FIRMA DE TODOS."
      pdfUrl={`${PDF_TEMPLATE_BASE}/declaracao_negativa_uniao_estavel_novo.pdf`}
      downloadPrefix="certidao_negativa_uniao_estavel"
      defaultPositions={POSICOES_UNIAO_ESTAVEL}
      renderForm={() => form}
      validate={validate}
      buildCards={buildCards}
      formReady={formReady}
      getDownloadSuffix={() => apenasDigitos(cpfDigitos).slice(0, 4)}
      onVoltar={onVoltar}
    />
  );
}
