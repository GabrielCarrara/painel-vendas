// src/components/Header.js
import React from 'react';
import logo from '../assets/logo.png'; // certifique-se que o nome esteja correto

export default function Header() {
  return (
    <div className="flex justify-center mb-4">
      <img src={logo} alt="Logo" className="h-24 md:h-32 object-contain" />
    </div>
  );
}
