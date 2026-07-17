import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

async function buscarPerfil(userId) {
  const { data, error } = await supabase
    .from('usuarios_custom')
    .select('id, cargo, ativo, id_filial')
    .or(`id.eq.${userId},auth_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [booting, setBooting] = useState(true);
  const [perfilReady, setPerfilReady] = useState(false);
  const userIdRef = useRef(null);
  const bootDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const carregarPerfil = async (userId, { blockUi } = { blockUi: false }) => {
      if (blockUi) setPerfilReady(false);
      const data = await buscarPerfil(userId);
      if (!mounted) return;
      setPerfil(data);
      setPerfilReady(true);
    };

    const finalizarBoot = () => {
      if (!bootDoneRef.current) {
        bootDoneRef.current = true;
        setBooting(false);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);

      if (!currentSession?.user) {
        userIdRef.current = null;
        setPerfil(null);
        setPerfilReady(true);
        finalizarBoot();
        return;
      }

      userIdRef.current = currentSession.user.id;
      await carregarPerfil(currentSession.user.id, { blockUi: true });
      if (!mounted) return;
      finalizarBoot();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;

      // Renovação de token ao focar a guia: só atualiza sessão, sem desmontar o painel.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession((prev) => {
          if (prev?.access_token === sess?.access_token) return prev;
          return sess;
        });
        return;
      }

      if (event === 'SIGNED_OUT' || !sess?.user) {
        userIdRef.current = null;
        setSession(null);
        setPerfil(null);
        setPerfilReady(true);
        finalizarBoot();
        return;
      }

      const sameUser = userIdRef.current === sess.user.id;
      userIdRef.current = sess.user.id;
      setSession(sess);

      // Mesmo usuário (ex.: INITIAL_SESSION / SIGNED_IN ao voltar): não bloquear a UI.
      if (sameUser) {
        finalizarBoot();
        return;
      }

      // Login de outro usuário / primeiro SIGNED_IN após logout.
      setTimeout(() => {
        carregarPerfil(sess.user.id, { blockUi: true }).then(() => {
          if (mounted) finalizarBoot();
        });
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Só mostra loading global no boot inicial ou quando troca de usuário de verdade.
  const authLoading = booting || (!!session && !perfilReady);

  return (
    <AuthContext.Provider value={{ session, perfil, loading: authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
