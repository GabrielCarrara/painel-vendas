// src/components/PublicLayout.js - VERSÃO COM MENU MOBILE

import React, { useState } from 'react'; // Adicionado useState
import { Outlet, Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
// Adicionados ícones para o menu mobile
import { FaInstagram, FaFacebook, FaEllipsisV, FaTimes } from 'react-icons/fa';

const Navbar = () => {
    // Estado para controlar se o menu mobile está aberto ou fechado
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="bg-fenix-orange text-white shadow-lg sticky top-0 z-40">
            <nav className="container mx-auto px-6 py-2 flex justify-between items-center">
                <Link to="/">
                    <img src={logo} alt="Fênix Consórcios" className="h-20 transition-transform duration-300 hover:scale-105" />
                </Link>

                {/* Menu para Desktop (esconde em telas pequenas) */}
                <div className="hidden md:flex items-center space-x-8 text-lg font-medium">
                    <NavLink to="/" className={({ isActive }) => `relative group ${isActive ? "font-bold" : ""}`}>Home</NavLink>
                    <NavLink to="/sobre-nos" className={({ isActive }) => `relative group ${isActive ? "font-bold" : ""}`}>Sobre Nós</NavLink>
                    <NavLink to="/cartas" className={({ isActive }) => `relative group ${isActive ? "font-bold" : ""}`}>Cartas Contempladas</NavLink>
                    <NavLink to="/contato" className={({ isActive }) => `relative group ${isActive ? "font-bold" : ""}`}>Contato</NavLink>
                </div>
                
                <div className="hidden md:flex">
                    <Link to="/login" className="bg-white text-fenix-orange font-bold py-3 px-6 rounded-full text-base transition-all duration-300 transform hover:scale-105 hover:bg-slate-200">
                        Área Restrita
                    </Link>
                </div>

                {/* Botão do Menu Mobile (só aparece em telas pequenas) */}
                <div className="md:hidden">
                    <button onClick={() => setIsMenuOpen(true)} className="p-2">
                        <FaEllipsisV size={24} />
                    </button>
                </div>
            </nav>

            {/* Painel do Menu Mobile (abre e fecha) */}
            <div className={`fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-800">
                    <span className="text-xl font-bold text-fenix-orange">Navegação</span>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2">
                        <FaTimes size={28} />
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center h-full -mt-16 text-2xl space-y-8">
                    <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "text-fenix-orange font-bold" : ""}>Home</NavLink>
                    <NavLink to="/sobre-nos" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "text-fenix-orange font-bold" : ""}>Sobre Nós</NavLink>
                    <NavLink to="/cartas" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "text-fenix-orange font-bold" : ""}>Cartas Contempladas</NavLink>
                    <NavLink to="/contato" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => isActive ? "text-fenix-orange font-bold" : ""}>Contato</NavLink>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="mt-8 border-2 border-fenix-orange text-fenix-orange font-semibold py-3 px-8 rounded-full">
                        Área Restrita
                    </Link>
                </div>
            </div>
        </header>
    );
};


// --- COMPONENTE DE RODAPÉ ATUALIZADO ---
const Footer = () => (
    <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-6 pt-16 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Coluna 1: Logo e Slogan */}
                <div className="col-span-1">
                    <img src={logo} alt="Fênix Consórcios" className="h-16 mb-4" />
                    <p className="text-gray-400 text-sm">Planejando o seu futuro, realizando os seus sonhos.</p>
                </div>

                {/* Coluna 2: Unidades */}
                <div>
                    <h4 className="font-bold text-lg mb-4 text-fenix-orange">Nossas Unidades</h4>
                    <div className="text-sm text-gray-300 space-y-4">
                        <div>
                            <p className="font-semibold">Pontes e Lacerda - MT</p>
                            <p className="text-gray-400">Rua Antônio Bento Neto, 887, Centro</p>
                        </div>
                        <div>
                            <p className="font-semibold">Mirassol D'Oeste - MT</p>
                            <p className="text-gray-400">Avenida Amadeu Téles, 1716, Viz da Brilhus</p>
                        </div>
                    </div>
                </div>

                {/* Coluna 3: Contato (ATUALIZADA) */}
                <div>
                    <h4 className="font-bold text-lg mb-4 text-fenix-orange">Contato</h4>
                    <div className="text-sm text-gray-300 space-y-4">
                        <div>
                            <p className="font-semibold">Pontes e Lacerda</p>
                            <p className="text-gray-400">(65) 9 8127-8212</p>
                            <a href="mailto:fenixconsorciospl@hotmail.com" className="text-gray-400 hover:text-fenix-pink transition-colors break-all">
                                fenixconsorciospl@hotmail.com
                            </a>
                        </div>
                        <div>
                            <p className="font-semibold">Mirassol D'Oeste</p>
                            <p className="text-gray-400">(65) 9 9809-2182</p>
                            <a href="mailto:fenixconsorciosmirassol@hotmail.com" className="text-gray-400 hover:text-fenix-pink transition-colors break-all">
                                fenixconsorciosmirassol@hotmail.com
                            </a>
                        </div>
                    </div>
                </div>

                {/* Coluna 4: Redes Sociais */}
                <div>
                    <h4 className="font-bold text-lg mb-4 text-fenix-orange">Siga-nos</h4>
                    <div className="flex items-center space-x-4">
                        <a href="https://www.instagram.com/fenix.consorciospl/" title="Instagram Pontes e Lacerda" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fenix-pink transition-colors">
                            <FaInstagram size={28} />
                        </a>
                        <a href="https://www.instagram.com/fenix.consorciosmirassol/" title="Instagram Mirassol D'Oeste" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fenix-pink transition-colors">
                            <FaInstagram size={28} />
                        </a>
                        <a href="https://www.facebook.com/fenixconsorciospl/" title="Facebook" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fenix-pink transition-colors">
                            <FaFacebook size={28} />
                        </a>
                    </div>
                </div>
            </div>
            
            {/* Linha de Copyright */}
            <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Fênix Consórcios e Investimentos LTDA. Todos os direitos reservados.</p>
            </div>
        </div>
    </footer>
);

export default function PublicLayout() {
    return (
        <div className="bg-slate-100 min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}