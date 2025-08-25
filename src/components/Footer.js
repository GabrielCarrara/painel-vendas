// src/components/Footer.js

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    // Adicionei um fundo escuro para o texto branco ter contraste
    <footer className="bg-gray-900 text-center py-5 mt-8">
      <p className="text-base font-light tracking-wide text-white">
        &copy; {currentYear} Fenix Consórcio e Investimentos LTDA
      </p>
      <p className="text-sm text-gray-400 mt-1">
        CNPJ: 29.721.177/0001-69
      </p>
    </footer>
  );
}