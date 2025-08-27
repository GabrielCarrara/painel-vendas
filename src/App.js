import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PainelGerente from './pages/PainelGerente';
import PainelVendedor from './pages/PainelVendedor';
import ProtectedRoute from './routes/ProtectedRoute';
import EditarVenda from './pages/EditarVenda';
import PainelDiretor from './pages/PainelDiretor';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* rotas de admin */}
          <Route element={<ProtectedRoute allowed={['admin']} />}>
          </Route>

          {/* rotas de diretor */}
          <Route element={<ProtectedRoute allowed={['diretor']} />}>
            <Route path="/diretor/*" element={<PainelDiretor />} />
          </Route>

          {/* rotas de gerente */}
          <Route element={<ProtectedRoute allowed={['gerente']} />}>
            <Route path="/gerente/*" element={<PainelGerente />} />
          </Route>

          {/* rotas de vendedor */}
          <Route element={<ProtectedRoute allowed={['vendedor']} />}>
            <Route path="/vendedor/*" element={<PainelVendedor />} />
          </Route>

          {/* fallback */}
          <Route path="/editar-venda/:id" element={<EditarVenda />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
