import React from 'react';
import logoGazin from '../assets/logo-gazin.png';

const imgStyleBase = {
  maxWidth: '52mm',
  width: '100%',
  height: 'auto',
  display: 'inline-block',
  verticalAlign: 'middle',
};

const sansStack = 'Arial, Helvetica Neue, Helvetica, sans-serif';

/**
 * Cabeçalho com logo Gazin para pré-visualização e PDF (html2canvas).
 * @param {'centered' | 'autorizacao_banda' | 'prestamista_letterhead'} [variant] — `autorizacao_banda`: logo à esquerda + tagline + título AUTORIZAÇÃO centralizado (modelo termo sinistro). `prestamista_letterhead`: timbrado cancelamento prestamista.
 */
export default function GazinDocHeaderLogo({ variant = 'centered' }) {
  if (variant === 'prestamista_letterhead') {
    return (
      <div style={{ marginBottom: '10mm', fontFamily: sansStack }}>
        <div style={{ display: 'flex', gap: '5mm', alignItems: 'flex-start' }}>
          <img src={logoGazin} alt="Consórcio Gazin" style={{ ...imgStyleBase, maxWidth: '36mm', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: '8.5pt', lineHeight: 1.35, color: '#111' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>ADM. CONSORCIO NACIONAL GAZIN LTDA</div>
            <div style={{ marginBottom: '2px' }}>RUA PEDRELINA DE MACEDO E SILVA, CENTRO, DOURADINA - PR</div>
            <div>
              Cep: 87485-000 &nbsp;&nbsp;&nbsp; Fone/Fax: 0800 664 8282 &nbsp;&nbsp;&nbsp; e-mail: consorciogazin@gazin.com.br
            </div>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid #222', marginTop: '4mm' }} />
      </div>
    );
  }

  if (variant === 'autorizacao_banda') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '46mm 1fr 46mm',
          alignItems: 'start',
          marginBottom: '7mm',
          columnGap: '2mm',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <img src={logoGazin} alt="Gazin Consórcios" style={{ ...imgStyleBase, maxWidth: '42mm' }} />
          <div style={{ color: '#15803d', fontSize: '8pt', fontWeight: 700, marginTop: '1mm', letterSpacing: '0.02em' }}>
            Confiança é tudo.
          </div>
        </div>
        <p style={{ margin: '4mm 0 0', textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', lineHeight: 1.2 }}>
          AUTORIZAÇÃO
        </p>
        <div aria-hidden="true" />
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
      <img src={logoGazin} alt="Gazin Consórcios" style={imgStyleBase} />
    </div>
  );
}
