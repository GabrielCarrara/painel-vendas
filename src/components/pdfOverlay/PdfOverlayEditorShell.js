import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaFilePdf, FaMinus, FaPlus, FaSave } from 'react-icons/fa';
import PdfOverlayCanvas from './PdfOverlayCanvas';
import { exportPdfWithOverlay } from './exportPdfWithOverlay';

const STORAGE_PREFIX = 'fenix_pdf_overlay_pos_v2:';

function carregarPosicoes(docId, defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + docId);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    const merged = { ...defaults };
    Object.keys(saved || {}).forEach((id) => {
      merged[id] = { ...defaults[id], ...saved[id] };
    });
    return merged;
  } catch {
    return defaults;
  }
}

/**
 * Shell: formulário à esquerda + PDF com cards à direita.
 *
 * props:
 * - docId, title, badge, pdfUrl, downloadPrefix
 * - defaultPositions: { [cardId]: { page, xPct, yPct, fontSize, maxWidthPct? } }
 * - renderForm(helpers)
 * - validate(): string|null
 * - buildCards(positions): cards com text + id (+ page/x/y/font from positions)
 * - formReady: boolean (quando true, mostra cards)
 * - getDownloadSuffix(): string
 */
export default function PdfOverlayEditorShell({
  docId,
  title,
  badge,
  pdfUrl,
  downloadPrefix,
  defaultPositions,
  renderForm,
  validate,
  buildCards,
  formReady,
  getDownloadSuffix,
  onVoltar,
}) {
  const [positions, setPositions] = useState(() =>
    carregarPosicoes(docId, defaultPositions || {})
  );
  const [selectedId, setSelectedId] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    setPositions(carregarPosicoes(docId, defaultPositions || {}));
  }, [docId, defaultPositions]);

  const cards = useMemo(() => {
    if (!formReady) return [];
    const built = buildCards(positions) || [];
    return built.map((c) => {
      const pos = positions[c.id] || defaultPositions?.[c.id] || {};
      return {
        ...c,
        page: c.page ?? pos.page ?? 1,
        xPct: c.xPct ?? pos.xPct ?? 10,
        yPct: c.yPct ?? pos.yPct ?? 10,
        fontSize: c.fontSize ?? pos.fontSize ?? 11,
        maxWidthPct: c.maxWidthPct ?? pos.maxWidthPct,
      };
    });
  }, [formReady, buildCards, positions, defaultPositions]);

  const onMove = useCallback((id, { xPct, yPct }) => {
    setPositions((prev) => ({
      ...prev,
      [id]: { ...prev[id], xPct, yPct },
    }));
  }, []);

  const ajustarFonte = (delta) => {
    if (!selectedId) {
      setAviso('Selecione um texto no PDF para alterar a fonte.');
      return;
    }
    setAviso('');
    setPositions((prev) => {
      const cur = prev[selectedId] || defaultPositions?.[selectedId] || { fontSize: 11 };
      const next = Math.min(22, Math.max(7, (cur.fontSize || 11) + delta));
      return { ...prev, [selectedId]: { ...cur, fontSize: next } };
    });
  };

  const salvarPosicoesPadrao = () => {
    try {
      localStorage.setItem(STORAGE_PREFIX + docId, JSON.stringify(positions));
      setAviso('Posições salvas neste navegador.');
    } catch {
      setAviso('Não foi possível salvar as posições.');
    }
  };

  const gerar = async () => {
    const erro = typeof validate === 'function' ? validate() : null;
    if (erro) {
      setAviso(erro);
      return;
    }
    setGerando(true);
    setAviso('');
    try {
      const sufixo = (getDownloadSuffix?.() || 'doc').replace(/\W/g, '').slice(0, 8) || 'doc';
      await exportPdfWithOverlay(pdfUrl, cards, `${downloadPrefix}_${sufixo}.pdf`);
    } catch (e) {
      setAviso(e?.message || 'Erro ao gerar PDF.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          <FaArrowLeft size={11} /> Voltar
        </button>
        <div className="text-right min-w-0">
          <h2 className="text-sm font-bold text-white truncate">{title}</h2>
          {badge ? (
            <span className="inline-block mt-0.5 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,380px)_1fr] gap-3">
        <aside className="bg-gray-800/50 rounded-xl border border-gray-700/60 p-3 space-y-3 h-fit xl:sticky xl:top-2">
          <p className="text-xs text-gray-400">
            1) Preencha os dados · 2) Ajuste os textos no PDF · 3) Baixe o PDF original preenchido
          </p>
          {renderForm?.()}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-700">
            <button
              type="button"
              onClick={() => ajustarFonte(-1)}
              disabled={!formReady}
              className="inline-flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-1.5 text-xs font-semibold"
              title="Diminuir fonte do texto selecionado"
            >
              <FaMinus size={10} /> Fonte
            </button>
            <button
              type="button"
              onClick={() => ajustarFonte(1)}
              disabled={!formReady}
              className="inline-flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-1.5 text-xs font-semibold"
              title="Aumentar fonte do texto selecionado"
            >
              <FaPlus size={10} /> Fonte
            </button>
            <button
              type="button"
              onClick={salvarPosicoesPadrao}
              disabled={!formReady}
              className="inline-flex items-center gap-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-2 py-1.5 text-xs font-semibold"
              title="Salvar posições neste navegador"
            >
              <FaSave size={10} /> Posições
            </button>
            <button
              type="button"
              onClick={gerar}
              disabled={gerando || !formReady}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 px-2.5 py-1.5 text-xs font-semibold"
            >
              <FaFilePdf size={12} />
              {gerando ? 'Gerando…' : 'Baixar PDF'}
            </button>
          </div>
          {aviso ? (
            <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-md px-2 py-1.5">
              {aviso}
            </p>
          ) : null}
          {selectedId && formReady ? (
            <p className="text-[11px] text-gray-500">
              Selecionado: <span className="text-indigo-300">{selectedId}</span>
              {' · '}
              {positions[selectedId]?.fontSize || defaultPositions?.[selectedId]?.fontSize || 11}pt
            </p>
          ) : null}
        </aside>

        <div className="bg-gray-900/40 rounded-xl border border-gray-700/50 p-2 sm:p-3 overflow-auto max-h-[80vh]">
          <PdfOverlayCanvas
            pdfUrl={pdfUrl}
            cards={cards}
            cardsEnabled={!!formReady}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={onMove}
          />
        </div>
      </div>
    </div>
  );
}
