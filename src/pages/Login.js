import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro('Email ou senha incorretos.');
      return;
    }

    console.log('Usuário logado:', user);

    // Buscar o tipo de usuário na tabela 'usuarios_custom'
    let { data: perfil, error: perfilErro } = await supabase
      .from('usuarios_custom')
      .select('tipo')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (perfilErro) {
      console.log('Erro ao buscar perfil:', perfilErro.message);
      setErro('Erro ao buscar o tipo de usuário.');
      return;
    }

    if (!perfil) {
      // Se não existe perfil, cria automaticamente como vendedor
      const { error: insertErro } = await supabase
        .from('usuarios_custom')
        .insert({
          id: user.id,
          nome: user.email.split('@')[0],
          email: user.email,
          tipo: 'vendedor',
          ativo: true,
        });

      if (insertErro) {
        console.log('Erro ao criar perfil:', insertErro.message);
        setErro('Não foi possível criar o perfil do usuário.');
        return;
      }

      perfil = { tipo: 'vendedor' };
    }

    console.log('Perfil encontrado:', perfil);

    if (perfil.tipo === 'admin') {
      navigate('/admin');
    } else if (perfil.tipo === 'gerente') {
      navigate('/gerente');
    } else if (perfil.tipo === 'vendedor') {
      navigate('/vendedor');
    } else {
      setErro('Tipo de usuário não reconhecido.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        <label className="block mb-2">Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 mb-4 rounded bg-gray-700 text-white"
          required
        />

        <label className="block mb-2">Senha:</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full px-4 py-2 mb-6 rounded bg-gray-700 text-white"
          required
        />

        {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
        >
          Entrar
        </button>
      </form>
    </div>
  );
};

export default Login;
