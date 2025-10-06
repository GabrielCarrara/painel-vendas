// src/pages/public/ConsultorPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaWhatsapp, FaEnvelope, FaCar, FaHome, FaChartLine } from 'react-icons/fa';
import logo from '../../assets/logo.png'; // Logo da Fênix

const LoadingScreen = () => (
    <div className="bg-slate-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-fenix-orange"></div>
    </div>
);

const NotFoundScreen = () => (
    // Se o consultor não for encontrado, redireciona para a Home
    <Navigate to="/" replace />
);

export default function ConsultorPage() {
    const { slug } = useParams();
    const [consultor, setConsultor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            return;
        }

        const buscarConsultor = async () => {
            const { data, error } = await supabase
                .from('usuarios_custom')
                .select('*')
                .eq('slug', slug)
                .eq('ativo', true)
                .single(); // Busca apenas um resultado

            if (data) {
                setConsultor(data);
            } else {
                console.error("Consultor não encontrado:", error);
            }
            setLoading(false);
        };

        buscarConsultor();
    }, [slug]);

    if (loading) {
        return <LoadingScreen />;
    }

    if (!consultor) {
        return <NotFoundScreen />;
    }

    return (
        <div className="bg-slate-100 min-h-screen">
            <div className="container mx-auto p-4 md:p-8 max-w-4xl">
                {/* Cabeçalho com a logo da Fênix */}
                <header className="text-center mb-8">
                    <img src={logo} alt="Fênix Consórcios" className="h-24 mx-auto" />
                </header>

                <main className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    {/* Seção do Perfil */}
                    <section className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-200 pb-8">
                        <img 
                            src={consultor.foto_url || `https://ui-avatars.com/api/?name=${consultor.nome}&size=256&background=F7931E&color=fff`} 
                            alt={consultor.nome} 
                            className="w-48 h-48 rounded-full object-cover shadow-lg border-4 border-fenix-orange" 
                        />
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl font-bold text-slate-900">{consultor.nome}</h1>
                            <p className="text-xl text-fenix-purple font-semibold mt-1">Especialista em Investimentos</p>
                            <div className="flex justify-center md:justify-start items-center gap-6 mt-4">
                                <a href={`https://wa.me/55${consultor.telefone}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-transform hover:scale-110">
                                    <FaWhatsapp size={32} />
                                </a>
                                {consultor.email && (
                                    <a href={`mailto:${consultor.email}`} className="text-blue-500 hover:text-blue-600 transition-transform hover:scale-110">
                                        <FaEnvelope size={32} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Seção de Serviços */}
                    <section className="pt-8">
                        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Soluções que oferecemos</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                            <div className="bg-slate-50 p-6 rounded-lg">
                                <FaCar className="text-3xl text-fenix-orange mx-auto mb-3" />
                                <h3 className="font-semibold text-lg">Consórcio de Veículos</h3>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-lg">
                                <FaHome className="text-3xl text-fenix-orange mx-auto mb-3" />
                                <h3 className="font-semibold text-lg">Consórcio de Imóveis</h3>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-lg">
                                <FaChartLine className="text-3xl text-fenix-orange mx-auto mb-3" />
                                <h3 className="font-semibold text-lg">Investimentos</h3>
                            </div>
                        </div>
                    </section>
                </main>

                 {/* Rodapé Simples */}
                <footer className="text-center text-gray-500 text-sm mt-8">
                    <p>&copy; {new Date().getFullYear()} Fênix Consórcios e Investimentos LTDA.</p>
                </footer>
            </div>
        </div>
    );
}