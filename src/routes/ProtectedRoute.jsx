import { Navigate, Outlet } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowed }) {
  const { session, perfil, loading } = useAuth();

  // Se já temos perfil, nunca desmontar o painel (evita “recarregar” ao focar a guia).
  if (loading && !perfil) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <FaSpinner className="animate-spin text-indigo-400" size={40} />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!perfil?.cargo || perfil.ativo === false) {
    return <Navigate to="/login" replace />;
  }

  const cargo = perfil.cargo.toLowerCase();
  if (allowed.includes(cargo)) return <Outlet />;

  if (cargo === 'diretor' || cargo === 'admin') return <Navigate to="/diretor" replace />;
  if (cargo === 'gerente') return <Navigate to="/gerente" replace />;
  if (cargo === 'vendedor') return <Navigate to="/vendedor" replace />;

  return <Navigate to="/login" replace />;
}
