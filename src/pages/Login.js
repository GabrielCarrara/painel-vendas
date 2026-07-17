import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/logo.png';
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import Footer from '../components/Footer';
import { limparFlagsLembreteRetorno } from '../utils/crmLembreteStorage';
import { useAuth } from '../contexts/AuthContext';

function destinoPorCargo(cargo) {
  switch (String(cargo || '').toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'diretor':
      return '/diretor';
    case 'gerente':
      return '/gerente';
    case 'vendedor':
      return '/vendedor';
    default:
      return null;
  }
}

const campoClass =
  'w-full pl-10 pr-3 py-2.5 rounded-lg bg-gray-950/70 text-sm text-white placeholder:text-gray-500 border border-white/10 focus:border-fenix-orange/60 focus:ring-2 focus:ring-fenix-orange/25 outline-none transition-all duration-200 disabled:opacity-60';

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [destinoPendente, setDestinoPendente] = useState(null);
  const navigate = useNavigate();
  const { session, perfil, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || destinoPendente) return;
    if (!session || !perfil?.cargo || perfil.ativo === false) return;
    const destino = destinoPorCargo(perfil.cargo);
    if (destino) navigate(destino, { replace: true });
  }, [authLoading, session, perfil, navigate, destinoPendente]);

  useEffect(() => {
    if (!destinoPendente) return;
    if (authLoading) return;

    if (session && perfil?.cargo && perfil.ativo !== false) {
      const destino = destinoPendente;
      setDestinoPendente(null);
      setLoading(false);
      navigate(destino, { replace: true });
      return;
    }

    if (!session) return;
    setDestinoPendente(null);
    setLoading(false);
    setErro('Não foi possível concluir o login. Tente novamente.');
  }, [destinoPendente, authLoading, session, perfil, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        setErro('E-mail ou senha incorretos. Verifique e tente novamente.');
        setLoading(false);
        return;
      }

      const user = signInData?.user;
      if (!user) {
        setErro('Não foi possível autenticar. Tente novamente.');
        setLoading(false);
        return;
      }

      limparFlagsLembreteRetorno();

      const { data: perfilData, error: perfilError } = await supabase
        .from('usuarios_custom')
        .select('cargo, ativo')
        .or(`id.eq.${user.id},auth_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle();

      if (perfilError || !perfilData?.cargo) {
        await supabase.auth.signOut();
        setErro('Esta conta não está autorizada. Solicite acesso ao administrador.');
        setLoading(false);
        return;
      }

      if (perfilData.ativo === false) {
        await supabase.auth.signOut();
        setErro('Sua conta está inativa. Fale com o administrador.');
        setLoading(false);
        return;
      }

      const destino = destinoPorCargo(perfilData.cargo);
      if (!destino) {
        setErro('Tipo de usuário não reconhecido.');
        setLoading(false);
        return;
      }

      setDestinoPendente(destino);
    } catch (error) {
      console.error('Erro no processo de login:', error.message);
      setErro('Ocorreu um erro inesperado. Tente novamente mais tarde.');
      setLoading(false);
    }
  };

  const ocupado = loading || !!destinoPendente;

  if (authLoading && !erro) {
    return (
      <div className="login-page relative flex min-h-[100dvh] min-h-screen items-center justify-center overflow-hidden bg-[#0b0d12] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(247,147,30,0.18),_transparent_55%)]" />
        <FaSpinner className="relative animate-spin text-fenix-orange" size={36} />
      </div>
    );
  }

  return (
    <div className="login-page relative flex h-[100dvh] h-screen w-full max-w-[100vw] overflow-hidden bg-[#0b0d12] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[22rem] w-[36rem] -translate-x-1/2 rounded-full bg-fenix-orange/20 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full bg-fenix-pink/15 blur-3xl" />
        <div className="absolute bottom-16 left-0 h-52 w-52 -translate-x-1/3 rounded-full bg-fenix-purple/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        <div className="relative shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
          <Link
            to="/aplicativos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-colors hover:border-fenix-orange/40 hover:bg-white/[0.07] hover:text-white"
          >
            <FaArrowLeft size={11} />
            Aplicativos
          </Link>
        </div>

        <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-2">
          <div className="w-full max-w-sm">
            <div className="flex justify-center mb-4 animate-fade-in-up">
              <img
                src={logo}
                alt="Fênix Consórcios"
                className="w-44 sm:w-52 drop-shadow-[0_10px_28px_rgba(247,147,30,0.22)]"
              />
            </div>

            <form
              onSubmit={handleLogin}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-fade-in-up"
              style={{ animationDelay: '80ms' }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fenix-orange/50 to-transparent" />

              <div className="mb-4 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Bem-vindo(a)
                </h1>
                <p className="mt-1 text-xs text-gray-400">
                  Acesse o painel com seu e-mail e senha.
                </p>
              </div>

              <label className="block mb-3">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  E-mail
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <FaEnvelope size={13} />
                  </span>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={campoClass}
                    required
                    disabled={ocupado}
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block mb-4">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-400">
                  Senha
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <FaLock size={13} />
                  </span>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={`${campoClass} pr-10`}
                    required
                    disabled={ocupado}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                  </button>
                </div>
              </label>

              {erro && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-center text-xs text-red-300"
                >
                  {erro}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-fenix-orange to-[#ff6b1a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(247,147,30,0.3)] transition-all duration-300 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={ocupado}
              >
                <span className="flex items-center justify-center gap-2">
                  {ocupado ? <FaSpinner className="animate-spin" /> : 'Entrar'}
                </span>
              </button>
            </form>
          </div>
        </main>

        <div className="relative shrink-0 border-t border-white/5">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Login;
