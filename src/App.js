// Substitua o conteúdo do seu src/App.js por este:

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout'; // Importa o novo layout


// Importe as páginas PÚBLICAS que vamos criar
import HomePage from './pages/public/HomePage';
import ContatoPage from './pages/public/ContatoPage';
import CartasPage from './pages/public/CartasPage';
import SobreNosPage from './pages/public/SobreNosPage'; // <-- ADICIONE ESTA LINHA
import AplicativosPage from './pages/public/AplicativosPage'; // <-- IMPORT ADICIONADO
// Importe as páginas de LOGIN e PAINÉIS que já existem
import Login from './pages/Login';
import PainelGerente from './pages/PainelGerente';
import PainelDiretor from './pages/PainelDiretor';
import PainelVendedor from './pages/PainelVendedor'; // <-- ADICIONE ESTA LINHA
import ConsultorPage from './pages/public/ConsultorPage'; // <-- IMPORTA A NOVA PÁGINA

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/sobre-nos" element={<SobreNosPage />} /> {/* <-- ADICIONE ESTA LINHA */}
          <Route path="/contato" element={<ContatoPage />} />
                    <Route path="/aplicativos" element={<AplicativosPage />} /> {/* <-- ROTA ADICIONADA */}
          <Route path="/cartas" element={<CartasPage />} />
        </Route>
        
        {/* Rotas de Login e Painéis (sem o layout público) */}
        <Route path="/login" element={<Login />} />
        <Route path="/vendedor" element={<PainelVendedor />} />
        <Route path="/gerente" element={<PainelGerente />} />
        <Route path="/diretor" element={<PainelDiretor />} />
        
        {/* Redirecionamento para a página inicial caso a rota não exista */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;