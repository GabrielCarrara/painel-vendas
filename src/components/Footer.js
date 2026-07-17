// src/components/Footer.js

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-center py-2.5 px-4">
      <p className="text-xs font-light tracking-wide text-gray-400">
        &copy; {currentYear} Fenix Consórcio e Investimentos LTDA
      </p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        CNPJ: 29.721.177/0001-69
      </p>
    </footer>
  );
}