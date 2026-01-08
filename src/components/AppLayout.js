// src/components/AppLayout.js
import React from 'react';
import LembreteAcaoDiaria from './LembreteAcaoDiaria';

export default function AppLayout({ usuario, children }) {
  return (
    <>
      <LembreteAcaoDiaria usuario={usuario} />
      {children}
    </>
  );
}

// Envolver seu app principal com:
<AppLayout usuario={perfilUsuario}>
  {/* Seu conteúdo */}
</AppLayout>