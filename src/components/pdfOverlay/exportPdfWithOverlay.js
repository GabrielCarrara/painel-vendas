import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Converte % da página (origem no topo-esquerda, como CSS) → pontos PDF (origem canto inferior-esquerdo).
 */
export function pctToPdfPoint(xPct, yPct, pageWidth, pageHeight, fontSize = 11) {
  const x = (Number(xPct) / 100) * pageWidth;
  // yPct = topo do card no preview CSS; baseline ≈ topo + 0.72*fonte
  const top = (Number(yPct) / 100) * pageHeight;
  const y = pageHeight - top - fontSize * 0.72;
  return { x, y };
}

/** Remove caracteres fora de WinAnsi (Helvetica) para não quebrar o drawText. */
export function paraWinAnsi(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u00A0/g, ' ')
    // remove o que Helvetica/WinAnsi não cobre
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

/**
 * Carrega o PDF original e desenha os cards de texto.
 * cards: { text, page (1-based), xPct, yPct, fontSize }[]
 */
export async function exportPdfWithOverlay(pdfUrl, cards, downloadName) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error('Não foi possível carregar o PDF modelo.');
  const bytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const card of cards || []) {
    const text = paraWinAnsi(card.text).trim();
    if (!text) continue;
    const pageIndex = Math.max(0, (card.page || 1) - 1);
    const page = pages[pageIndex];
    if (!page) continue;
    const { width, height } = page.getSize();
    const fontSize = Number(card.fontSize) || 11;
    const { x, y } = pctToPdfPoint(card.xPct, card.yPct, width, height, fontSize);
    page.drawText(text, {
      x: Math.max(0, x),
      y: Math.max(0, y),
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      // Só quebra linha se o card pedir explicitamente (evita “MATO/GROSSO” e data bagunçada)
      ...(card.allowWrap && card.maxWidthPct
        ? {
            maxWidth: (Number(card.maxWidthPct) / 100) * width,
            lineHeight: fontSize * 1.15,
          }
        : {}),
    });
  }

  const out = await pdfDoc.save();
  const blob = new Blob([out], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = downloadName || 'documento.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
