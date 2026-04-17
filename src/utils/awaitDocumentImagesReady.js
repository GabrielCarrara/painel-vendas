/**
 * Aguarda o carregamento das <img> dentro do container.
 * Evita rasterização vazia no html2canvas quando o PDF é gerado logo após abrir a tela.
 */
export function awaitDocumentImagesReady(container) {
  if (!container) return Promise.resolve();
  const imgs = [...container.querySelectorAll('img')];
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        if (typeof img.decode === 'function') {
          img.decode().then(done).catch(done);
        }
      });
    })
  );
}
