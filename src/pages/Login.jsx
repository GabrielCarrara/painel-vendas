import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    const tipo = prompt("Digite 'admin' ou 'vendedor':");

    if (tipo === 'admin') {
      navigate('/admin');
    } else if (tipo === 'vendedor') {
      navigate('/vendedor');
    } else {
      alert('Tipo inválido');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-80">
        <h1 className="text-2xl font-semibold mb-4">Tela de Login</h1>
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
