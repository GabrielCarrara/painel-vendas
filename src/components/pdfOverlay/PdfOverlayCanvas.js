import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

const workerBase = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
GlobalWorkerOptions.workerSrc = `${workerBase}/pdf.worker.min.mjs`;

function resolverUrlPdf(pdfUrl) {
  if (!pdfUrl) return '';
  try {
    return new URL(pdfUrl, window.location.origin).href;
  } catch {
    return pdfUrl;
  }
}

/**
 * Renderiza páginas do PDF e sobrepõe cards arrastáveis.
 * cards: { id, text, page, xPct, yPct, fontSize }[]
 */
export default function PdfOverlayCanvas({
  pdfUrl,
  cards = [],
  cardsEnabled = false,
  selectedId,
  onSelect,
  onMove,
}) {
  const [pages, setPages] = useState([]); // { width, height, dataUrl }
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const dragRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCarregando(true);
      setErro('');
      setPages([]);
      try {
        const absoluteUrl = resolverUrlPdf(pdfUrl);
        if (!absoluteUrl) throw new Error('URL do PDF não informada.');

        const res = await fetch(absoluteUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`PDF não encontrado (${res.status}).`);
        const data = new Uint8Array(await res.arrayBuffer());
        if (!data.length) throw new Error('PDF vazio ou inválido.');

        const loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;
        const rendered = [];
        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({
            pageNum: i,
            width: viewport.width,
            height: viewport.height,
            dataUrl: canvas.toDataURL('image/png'),
          });
        }
        if (!cancel) setPages(rendered);
      } catch (e) {
        if (!cancel) setErro(e?.message || 'Falha ao abrir o PDF.');
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pdfUrl]);

  const onPointerDown = useCallback(
    (e, card, pageEl) => {
      if (!cardsEnabled || !onMove) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(card.id);
      const rect = pageEl.getBoundingClientRect();
      dragRef.current = {
        id: card.id,
        pageEl,
        offsetX: e.clientX - rect.left - (card.xPct / 100) * rect.width,
        offsetY: e.clientY - rect.top - (card.yPct / 100) * rect.height,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [cardsEnabled, onMove, onSelect]
  );

  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || !onMove) return;
      const rect = d.pageEl.getBoundingClientRect();
      const x = e.clientX - rect.left - d.offsetX;
      const y = e.clientY - rect.top - d.offsetY;
      const xPct = Math.min(95, Math.max(0, (x / rect.width) * 100));
      const yPct = Math.min(95, Math.max(0, (y / rect.height) * 100));
      onMove(d.id, { xPct, yPct });
    },
    [onMove]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Carregando PDF…
      </div>
    );
  }
  if (erro) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {erro}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((pg) => {
        const pageCards = cardsEnabled
          ? cards.filter((c) => (c.page || 1) === pg.pageNum && String(c.text || '').trim())
          : [];
        return (
          <div
            key={pg.pageNum}
            className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-md border border-gray-600 bg-white shadow-lg [container-type:inline-size]"
            data-page={pg.pageNum}
          >
            <img
              src={pg.dataUrl}
              alt={`Página ${pg.pageNum}`}
              className="block w-full h-auto select-none pointer-events-none"
              draggable={false}
            />
            {pageCards.map((card) => (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onPointerDown={(e) => onPointerDown(e, card, e.currentTarget.parentElement)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={() => onSelect?.(card.id)}
                className={`absolute cursor-move select-none px-0.5 py-0 leading-tight border ${
                  selectedId === card.id
                    ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-400'
                    : 'border-amber-400/70 bg-amber-200/40 hover:border-amber-500'
                }`}
                style={{
                  left: `${card.xPct}%`,
                  top: `${card.yPct}%`,
                  // Escala a fonte com a largura exibida da página (PDF ~595pt)
                  fontSize: `calc(${card.fontSize || 11} * 100cqw / 595.5)`,
                  color: '#000',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  whiteSpace: card.allowWrap ? 'pre-wrap' : 'nowrap',
                  maxWidth: card.allowWrap && card.maxWidthPct ? `${card.maxWidthPct}%` : undefined,
                  lineHeight: 1.05,
                  zIndex: 2,
                }}
                title="Arraste para posicionar"
              >
                {card.text}
              </div>
            ))}
          </div>
        );
      })}
      {!cardsEnabled && (
        <p className="text-center text-xs text-amber-200/90">
          Preencha os campos obrigatórios à esquerda para liberar os textos no PDF.
        </p>
      )}
    </div>
  );
}
