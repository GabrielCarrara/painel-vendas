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
                .single();

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
        <div className="bg-slate-100 min-h-screen py-8 md:py-12">
            <div className="container mx-auto p-4 max-w-5xl">
                
                {/* Cabeçalho com a logo da Fênix - Solução para a logo transparente */}
                <header className="text-center mb-8">
                    <div className="inline-block p-4 bg-white rounded-full shadow-md">
                        <img src={logo} alt="Fênix Consórcios" className="h-20" />
                    </div>
                </header>

                <main className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        {/* Coluna da Foto */}
                        <div className="md:col-span-1">
                            <img 
                                src={consultor.foto_url || `https://ui-avatars.com/api/?name=${consultor.nome}&size=512&background=F7931E&color=fff`} 
                                alt={consultor.nome} 
                                className="w-full h-full object-cover min-h-[300px]" 
                            />
                        </div>

                        {/* Coluna de Informações */}
                        <div className="md:col-span-2 p-8 md:p-10 flex flex-col">
                            <h1 className="text-4xl font-bold text-slate-900">{consultor.nome}</h1>
                            <p className="text-xl text-fenix-orange font-semibold mt-1">Especialista em Investimentos</p>

                            {/* Texto "Sobre Mim" */}
                            <p className="text-slate-600 mt-6 text-base leading-relaxed flex-grow">
                                Com vasta experiência no mercado financeiro, sou especialista em ajudar você a encontrar o melhor caminho para suas conquistas. Seja para a compra do seu primeiro carro, a casa dos seus sonhos ou para alavancar seus investimentos, minha consultoria é focada em transparência e nos seus objetivos. Vamos juntos transformar seus planos em realidade!
                            </p>

                            {/* Contatos */}
                            <div className="mt-8">
                                <a href={`https://wa.me/55${consultor.telefone}`} target="_blank" rel="noopener noreferrer" className="w-full mb-4 inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-lg transition-transform hover:scale-105">
                                    <FaWhatsapp size={24} /> Fale Comigo no WhatsApp
                                </a>
                                <div className="flex justify-center items-center gap-6 mt-4">
                                    {consultor.instagram_user && (
                                        <a href={`https://instagram.com/${consultor.instagram_user}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-fenix-pink transition-colors">
                                            <FaInstagram size={28} />
                                        </a>
                                    )}
                                    {consultor.email && (
                                        <a href={`mailto:${consultor.email}`} className="text-gray-500 hover:text-fenix-pink transition-colors">
                                            <FaEnvelope size={28} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="text-center text-gray-500 text-sm mt-8">
                    <p>&copy; {new Date().getFullYear()} Fênix Consórcios e Investimentos LTDA.</p>
                </footer>
            </div>
        </div>
    );
}