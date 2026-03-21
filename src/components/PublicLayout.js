// src/components/PublicLayout.js - VERSÃO COM MENU MOBILE

import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
// Adicionados ícones para o menu mobile
import { FaFacebook, FaInstagram, FaWhatsapp, FaEllipsisV, FaTimes } from 'react-icons/fa';

const WHATSAPP_FENIX_NUMERO = '5565981278212';
const WHATSAPP_FENIX_TEXTO = encodeURIComponent(
  'Olá! Vim pelo site da Fênix Consórcios e gostaria de mais informações.'
);
const WHATSAPP_FENIX_URL = `https://wa.me/${WHATSAPP_FENIX_NUMERO}?text=${WHATSAPP_FENIX_TEXTO}`;

const Navbar = () => {
    // Estado para controlar se o menu mobile está aberto ou fechado
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!isMenuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isMenuOpen]);

    return (
        <header className="sticky top-0 z-40 shadow-lg">
            <div className="bg-[#121212] text-white">
                <nav
                    className="container mx-auto px-4 sm:px-6 pb-2 flex justify-between items-center gap-2"
                    style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
                >
                    <Link to="/" className="shrink-0 min-w-0 pt-0.5">
                        <img
                            src={logo}
                            alt="Fênix Consórcios"
                            className="h-14 sm:h-16 md:h-20 w-auto max-h-[4.5rem] md:max-h-none transition-transform duration-300 hover:scale-105"
                        />
                    </Link>

                    {/* Menu para Desktop (esconde em telas pequenas) */}
                    <div className="hidden md:flex items-center space-x-8 text-lg font-medium text-gray-200">
                        <NavLink to="/" className={({ isActive }) => `relative group hover:text-fenix-orange transition-colors ${isActive ? "font-bold text-fenix-orange" : ""}`}>Home</NavLink>
                        <NavLink to="/sobre-nos" className={({ isActive }) => `relative group hover:text-fenix-orange transition-colors ${isActive ? "font-bold text-fenix-orange" : ""}`}>Sobre Nós</NavLink>
                        <NavLink to="/cartas" className={({ isActive }) => `relative group hover:text-fenix-orange transition-colors ${isActive ? "font-bold text-fenix-orange" : ""}`}>Cartas Contempladas</NavLink>
                        <NavLink to="/contato" className={({ isActive }) => `relative group hover:text-fenix-orange transition-colors ${isActive ? "font-bold text-fenix-orange" : ""}`}>Contato</NavLink>
                        <NavLink to="/aplicativos" className={({ isActive }) => `relative group hover:text-fenix-orange transition-colors ${isActive ? "font-bold text-fenix-orange" : ""}`}>Aplicativos<span className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-fenix-orange transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span></NavLink>
                    </div>

                    <div className="hidden md:flex">
                        <Link to="/login" className="bg-fenix-orange text-white font-bold py-3 px-6 rounded-full text-base transition-all duration-300 transform hover:scale-105 hover:brightness-110">
                            Área Restrita
                        </Link>
                    </div>

                    {/* Botão do Menu Mobile — safe area direita para não colidir com bateria/rede (PWA iOS) */}
                    <div
                        className="md:hidden shrink-0"
                        style={{ paddingRight: 'max(0.25rem, env(safe-area-inset-right, 0px))' }}
                    >
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(true)}
                            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-fenix-orange active:bg-white/10 rounded-lg transition-colors"
                            aria-label="Abrir menu"
                        >
                            <FaEllipsisV size={22} />
                        </button>
                    </div>
                </nav>
            </div>
            {/* Faixa fina laranja entre o menu e o conteúdo */}
            <div className="h-px w-full bg-fenix-orange shrink-0" aria-hidden />

            {/* Painel do Menu Mobile: safe area topo/lateral + links sempre legíveis (text-white) */}
            <div
                className={`fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
                    isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                }}
            >
                <div
                    className="flex shrink-0 justify-between items-center gap-3 px-4 sm:px-6 pb-4 border-b border-gray-800"
                    style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
                >
                    <span className="text-xl font-bold text-fenix-orange">Navegação</span>
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:text-fenix-orange rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Fechar menu"
                    >
                        <FaTimes size={26} />
                    </button>
                </div>
                <div
                    className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 py-8 text-xl sm:text-2xl overflow-y-auto overscroll-contain"
                    style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
                >
                    <NavLink
                        to="/"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                            `font-medium transition-colors ${isActive ? 'text-fenix-orange font-bold' : 'text-white hover:text-fenix-orange'}`
                        }
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/sobre-nos"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                            `font-medium transition-colors ${isActive ? 'text-fenix-orange font-bold' : 'text-white hover:text-fenix-orange'}`
                        }
                    >
                        Sobre Nós
                    </NavLink>
                    <NavLink
                        to="/cartas"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                            `font-medium transition-colors ${isActive ? 'text-fenix-orange font-bold' : 'text-white hover:text-fenix-orange'}`
                        }
                    >
                        Cartas Contempladas
                    </NavLink>
                    <NavLink
                        to="/contato"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                            `font-medium transition-colors ${isActive ? 'text-fenix-orange font-bold' : 'text-white hover:text-fenix-orange'}`
                        }
                    >
                        Contato
                    </NavLink>
                    <NavLink
                        to="/aplicativos"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                            `font-medium transition-colors ${isActive ? 'text-fenix-orange font-bold' : 'text-white hover:text-fenix-orange'}`
                        }
                    >
                        Aplicativos
                    </NavLink>
                    <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="mt-4 border-2 border-fenix-orange text-fenix-orange font-semibold py-3 px-8 rounded-full hover:bg-fenix-orange/10 transition-colors"
                    >
                        Área Restrita
                    </Link>
                </div>
            </div>
        </header>
    );
};


// --- COMPONENTE DE RODAPÉ ATUALIZADO ---
const Footer = () => (
    <footer className="bg-[#121212] text-white" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
        <div className="container mx-auto px-6 pt-16 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Coluna 1: Logo e Slogan */}
                <div className="col-span-1">
                    <img src={logo} alt="Fênix Consórcios" className="h-16 mb-4" />
                    <p className="text-gray-400 text-sm">Planejando o seu futuro, realizando os seus sonhos.</p>
                </div>

                {/* Coluna 2: Unidade */}
                <div>
                    <h4 className="font-bold text-lg mb-4 text-fenix-orange">Nossa Unidade</h4>
                    <div className="text-sm text-gray-300 space-y-4">
                        <div>
                            <p className="font-semibold">Pontes e Lacerda - MT</p>
                            <p className="text-gray-400">Rua Antônio Bento Neto, 887, Centro</p>
                        </div>
                    </div>
                </div>

                {/* Coluna 3: Contato */}
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
                    </div>
                </div>

                {/* Coluna 4: Redes sociais + WhatsApp */}
                <div>
                    <h4 className="font-bold text-lg mb-4 text-fenix-orange">Siga-nos</h4>
                    <div className="flex items-center flex-wrap gap-4">
                        <a
                            href="https://www.instagram.com/fenix.consorciospl/"
                            title="Instagram Fênix — Pontes e Lacerda"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-fenix-pink transition-colors"
                        >
                            <FaInstagram size={28} />
                        </a>
                        <a href="https://www.facebook.com/fenixconsorciospl/" title="Facebook" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fenix-pink transition-colors">
                            <FaFacebook size={28} />
                        </a>
                    </div>
                    <p className="text-sm text-gray-400 mt-5 mb-3 leading-snug">
                        Prefere falar agora? Clique abaixo e envie sua mensagem pelo WhatsApp (abre no app ou no WhatsApp Web).
                    </p>
                    <a
                        href={WHATSAPP_FENIX_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-5 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                    >
                        <FaWhatsapp size={22} />
                        Chamar no WhatsApp
                    </a>
                </div>
            </div>
            
            {/* Linha de Copyright */}
            <div className="mt-12 pt-8 border-t border-gray-800/80 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Fênix Consórcios e Investimentos LTDA. Todos os direitos reservados.</p>
            </div>
        </div>
    </footer>
);

export default function PublicLayout() {
    return (
        <div className="bg-slate-100 min-h-[100dvh] min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}