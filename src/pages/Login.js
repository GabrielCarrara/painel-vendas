// src/components/Login.js (Versão com layout corrigido e robusto)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png'; // Garanta que o caminho para sua logo esteja correto
import { FaEnvelope, FaLock, FaSpinner } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro('E-mail ou senha incorretos. Verifique e tente novamente.');
        return;
      }
      
      let { data: perfil } = await supabase
        .from('usuarios_custom')
        .select('tipo')
        .eq('id', user.id)
        .single();

      if (!perfil) {
        const { error: insertError } = await supabase
          .from('usuarios_custom')
          .insert({
            id: user.id,
            auth_id: user.id,
            nome: user.email.split('@')[0],
            email: user.email,
            tipo: 'vendedor',
            ativo: true,
          });

        if (insertError) {
          throw insertError;
        }
        perfil = { tipo: 'vendedor' };
      }
      
      switch (perfil.tipo) {
        case 'admin':
          navigate('/admin');
          break;
        case 'gerente':
          navigate('/gerente');
          break;
        case 'vendedor':
          navigate('/vendedor');
          break;
        default:
          setErro('Tipo de usuário não reconhecido.');
      }
    } catch (error) {
      console.error("Erro no processo de login:", error.message);
      setErro('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900/50 text-white overflow-hidden">
      
      {/* Container principal que cresce para ocupar o espaço */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-sm">
          
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo da Empresa" className="w-56 md:w-64" />
          </div>

          {/* Card do formulário */}
          <form 
            onSubmit={handleLogin} 
            className="bg-gray-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50"
          >
            <h2 className="text-3xl font-bold mb-6 text-center text-white">Bem-vindo(a)</h2>

            {/* Campo de Email com Ícone */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FaEnvelope />
              </span>
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-700/50 text-white border border-transparent focus:border-indigo-500 focus:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                required
                disabled={loading}
              />
            </div>
            
            {/* Campo de Senha com Ícone */}
            <div className="relative mb-6">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FaLock />
              </span>
              <input
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-700/50 text-white border border-transparent focus:border-indigo-500 focus:bg-gray-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                required
                disabled={loading}
              />
            </div>

            {erro && <p className="text-red-400 bg-red-900/50 border border-red-700 text-sm text-center p-2 rounded-lg mb-4">{erro}</p>}
            
            {/* Botão com Feedback de Carregamento */}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Rodapé que fica fixo na parte inferior */}
      <footer className="w-full text-center p-4 text-gray-500 text-sm">
        © {new Date().getFullYear()} Seu Sistema. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Login;