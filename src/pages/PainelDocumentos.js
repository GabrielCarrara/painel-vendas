import React, { useEffect, useState } from 'react';
import { FaDownload, FaEdit, FaFileAlt, FaFileExcel, FaFileWord, FaSpinner } from 'react-icons/fa';
import DeclaracaoResidenciaEditor from '../components/DeclaracaoResidenciaEditor';
import ProcuracaoPagamentoVeiculoEditor from '../components/ProcuracaoPagamentoVeiculoEditor';
import CancelamentoTransferenciaEditor from '../components/CancelamentoTransferenciaEditor';
import InclusaoSeguroVidaGazinEditor from '../components/InclusaoSeguroVidaGazinEditor';
import CancelamentoSeguroVidaEditor from '../components/CancelamentoSeguroVidaEditor';
import TermoVeiculoComMultaEditor from '../components/TermoVeiculoComMultaEditor';
import TermoVeiculoComSinistroEditor from '../components/TermoVeiculoComSinistroEditor';
import VistoriaAntecipadaEditor from '../components/VistoriaAntecipadaEditor';
import CertidaoNegativaUniaoEstavelEditor from '../components/CertidaoNegativaUniaoEstavelEditor';
import TermoItbiEditor from '../components/TermoItbiEditor';
import RemetenteDestinatarioCorreiosEditor from '../components/RemetenteDestinatarioCorreiosEditor';

function urlArquivo(filename) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const enc = encodeURIComponent(filename);
  return `${base}/arquivos/${enc}`;
}

export default function PainelDocumentos() {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
        const res = await fetch(`${base}/arquivos/manifest.json`, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Manifest não encontrado.');
        const data = await res.json();
        if (!cancel) setItens(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setErro('Não foi possível carregar a lista de documentos.');
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (editor === 'declaracao_residencia') {
    return <DeclaracaoResidenciaEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'procuracao_pagamento_veiculo') {
    return <ProcuracaoPagamentoVeiculoEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'cancelamento_transferencia') {
    return <CancelamentoTransferenciaEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'seguro_vida_gazin') {
    return <InclusaoSeguroVidaGazinEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'cancelamento_seguro_vida') {
    return <CancelamentoSeguroVidaEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'veiculo_multa') {
    return <TermoVeiculoComMultaEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'veiculo_sinistro') {
    return <TermoVeiculoComSinistroEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'vistoria_antecipada') {
    return <VistoriaAntecipadaEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'certidao_negativa_uniao_estavel') {
    return <CertidaoNegativaUniaoEstavelEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'termo_itbi') {
    return <TermoItbiEditor onVoltar={() => setEditor(null)} />;
  }
  if (editor === 'remetente_destinatario_correios') {
    return <RemetenteDestinatarioCorreiosEditor onVoltar={() => setEditor(null)} />;
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-800/50 rounded-xl">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-300">
            <FaFileAlt size={12} /> Documentos
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Modelos .doc, .docx e .xlsx — preencha no painel e exporte em PDF/Excel.
          </p>
        </div>
        {!carregando && !erro && (
          <span className="text-xs text-gray-500 shrink-0">
            {itens.length} arquivo{itens.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {carregando && (
        <div className="flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-indigo-400" size={28} />
        </div>
      )}
      {erro && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      {!carregando && !erro && (
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((item) => {
            const ext = (item.filename || '').split('.').pop()?.toLowerCase() || '';
            const isWord = ext === 'doc' || ext === 'docx';
            const isExcel = ext === 'xlsx' || ext === 'xls';
            const fileIcon = isWord ? (
              <FaFileWord size={16} className="text-blue-400" />
            ) : isExcel ? (
              <FaFileExcel size={16} className="text-emerald-400" />
            ) : (
              <FaFileAlt size={16} className="text-indigo-400" />
            );

            return (
              <li
                key={item.id}
                className="flex flex-col rounded-lg border border-gray-700/60 bg-gray-800/40 p-3 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-start gap-2.5 mb-2.5 min-w-0">
                  <span className="mt-0.5 shrink-0">{fileIcon}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
                    {item.badge ? (
                      <span
                        className="inline-block mt-1 max-w-full break-words rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-snug tracking-wide text-amber-200"
                        title={item.badge}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-auto flex gap-1.5">
                  {item.editor ? (
                    <button
                      type="button"
                      onClick={() => setEditor(item.editor)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      <FaEdit size={11} />
                      {item.editor === 'vistoria_antecipada' ? 'Preencher' : 'Preencher PDF'}
                    </button>
                  ) : null}
                  <a
                    href={urlArquivo(item.filename)}
                    download={item.filename}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 text-xs font-semibold text-white shrink-0"
                    title="Baixar arquivo"
                  >
                    <FaDownload size={11} /> Baixar
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
