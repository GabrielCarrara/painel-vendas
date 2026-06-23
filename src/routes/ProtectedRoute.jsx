import { Navigate, Outlet } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowed }) {
  const { session, perfil, loading } = useAuth();

  if (loading) {
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

  return <Navigate to="/login" replace />;
}
