// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowed }) {
  const { session, perfil, loading } = useAuth();

  if (loading) return null; // ou um spinner

  if (!session) return <Navigate to="/login" replace />;

  if (allowed.includes(perfil?.tipo)) return <Outlet />;

  // logado mas não autorizado
  return <Navigate to="/login" replace />;
}
