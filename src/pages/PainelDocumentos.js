import React, { useEffect, useState } from 'react';
import { FaDownload, FaEdit, FaFileAlt, FaFileExcel, FaFileWord } from 'react-icons/fa';
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Documentos</h2>
        <p className="mt-1 text-gray-400">
          Arquivos disponíveis na pasta institucional. Modelos <strong className="text-gray-300">.doc</strong>,{' '}
          <strong className="text-gray-300">.docx</strong> e <strong className="text-gray-300">.xlsx</strong> podem ser preenchidos no painel e exportados em PDF
          e/ou Excel, conforme o documento.
        </p>
      </div>

      {carregando && <p className="text-gray-500">Carregando…</p>}
      {erro && <p className="text-amber-400">{erro}</p>}

      {!carregando && !erro && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {itens.map((item) => {
            const ext = (item.filename || '').split('.').pop()?.toLowerCase() || '';
            const isWord = ext === 'doc' || ext === 'docx';
            const isExcel = ext === 'xlsx' || ext === 'xls';
            const fileIcon = isWord ? <FaFileWord size={22} /> : isExcel ? <FaFileExcel size={22} /> : <FaFileAlt size={22} />;
            return (
              <li
                key={item.id}
                className="flex flex-col rounded-xl border border-gray-700 bg-gray-800/40 p-5 shadow-lg transition hover:border-indigo-500/50"
              >
                <div className="mb-3 flex items-start gap-3">
                  <span className="mt-0.5 text-indigo-400">{fileIcon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      {item.badge ? (
                        <span
                          className="max-w-full break-words rounded border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase leading-snug tracking-wide text-amber-200 sm:text-[10px]"
                          title={item.badge}
                        >
                          ({item.badge})
                        </span>
                      ) : null}
                    </div>
                    {item.subtitle ? <p className="text-sm text-gray-500">{item.subtitle}</p> : null}
                    <p className="mt-1 truncate text-xs text-gray-600" title={item.filename}>
                      {item.filename}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {item.editor ? (
                    <button
                      type="button"
                      onClick={() => setEditor(item.editor)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      <FaEdit />{' '}
                      {item.editor === 'vistoria_antecipada' ? 'Preencher (PDF / Excel)' : 'Preencher e gerar PDF'}
                    </button>
                  ) : null}
                  <a
                    href={urlArquivo(item.filename)}
                    download={item.filename}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
                  >
                    <FaDownload /> Baixar
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
