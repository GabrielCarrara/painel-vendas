// src/pages/public/ConsultorPage.js - VERSÃO FINAL CORRIGIDA

import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaWhatsapp, FaCar, FaArrowRight, FaPaperPlane, FaMobileAlt } from 'react-icons/fa';
import logo from '../../assets/logo.png';
import logoGazin from '../../assets/logo-gazin.png';
import logoHS from '../../assets/logo-hs.png';

const LoadingScreen = () => (
    <div className="bg-orange-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-fenix-orange"></div>
    </div>
);

const NotFoundScreen = () => ( <Navigate to="/" replace /> );

export default function ConsultorPage() {
    const { slug } = useParams();
    const [consultor, setConsultor] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [lead, setLead] = useState({
        interesse: 'AUTOMÓVEL',
        mensagem: ''
    });

    const urlsAcoes = consultor ? [
        `${supabase.storage.url}/object/public/acoes-vendedores/${consultor.slug}-1.jpg`,
        `${supabase.storage.url}/object/public/acoes-vendedores/${consultor.slug}-2.jpg`,
        `${supabase.storage.url}/object/public/acoes-vendedores/${consultor.slug}-3.jpg`,
    ] : [];

    useEffect(() => {
        if (!slug) { setLoading(false); return; }
        const buscarConsultor = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('usuarios_custom').select('*').eq('slug', slug).eq('ativo', true).single();
            if (data) {
                setConsultor(data);
            } else if (error && error.code !== 'PGRST116') {
                console.error("Erro ao buscar consultor:", error);
            }
            setLoading(false);
        };
        buscarConsultor();
    }, [slug]);

    const handleLeadChange = (e) => {
        const { name, value } = e.target;
        setLead(prev => ({ ...prev, [name]: value }));
    };

    const handleLeadSubmit = (e) => {
        e.preventDefault();
        const mensagem = `Olá, ${consultor.nome}! Gostaria de uma simulação.\n\n*Interesse:* ${lead.interesse}\n*Detalhes:* ${lead.mensagem}`;
        const urlWhatsApp = `https://wa.me/55${consultor.telefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(urlWhatsApp, '_blank');
    };

    if (loading) return <LoadingScreen />;
    if (!consultor) return <NotFoundScreen />;

    const whatsappLinkCartas = `https://wa.me/55${consultor.telefone}?text=${encodeURIComponent(`Olá, ${consultor.nome.split(' ')[0]}. Tenho interesse em ver as cartas contempladas.`)}`;

    return (
        <div className="bg-gradient-to-br from-orange-500 via-purple-600 to-purple-800 min-h-[100dvh] min-h-screen w-full max-w-[100vw] overflow-x-hidden font-sans">
            <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-4xl w-full">
                
                <header className="text-center mb-8">
                    <img src={logo} alt="Fênix Consórcios" className="h-24 mx-auto" />
                </header>

                <main className="bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                        <img 
                            src={consultor.foto_url || `https://ui-avatars.com/api/?name=${consultor.nome}&size=512&background=F7931E&color=fff`} 
                            alt={consultor.nome} 
                            className="w-full h-full object-cover min-h-[400px] lg:min-h-[600px]" 
                        />
                    </div>

                    <div className="lg:col-span-3 p-8 flex flex-col justify-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">{consultor.nome}</h1>
                        <p className="text-xl text-fenix-purple font-semibold mt-2">Especialista em Investimentos</p>
                        <p className="text-slate-600 mt-6 text-base leading-relaxed">
                            Com vasta experiência no mercado financeiro, sou especialista em ajudar você a encontrar o melhor caminho para suas conquistas. Seja para a compra do seu primeiro carro, a casa dos seus sonhos ou para alavancar seus investimentos, minha consultoria é focada em transparência e nos seus objetivos. Vamos juntos transformar seus planos em realidade!
                        </p>
                        <a href={`https://wa.me/55${consultor.telefone}`} target="_blank" rel="noopener noreferrer" className="w-full mt-8 inline-flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-lg transition-transform hover:scale-105">
                            <FaWhatsapp size={24} /> Fale Comigo no WhatsApp
                        </a>
                    </div>
                </main>

                <section className="mt-10">
<h2 className="text-2xl font-bold text-center mb-6 text-white">Representante Oficial</h2>                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                            <img src={logoGazin} alt="Gazin Consórcios" className="h-16 mb-3" />
                            <p className="text-slate-500 text-center">Tradição e solidez para você realizar.</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                            <img src={logoHS} alt="HS Consórcios" className="h-16 mb-3" />
                            <p className="text-slate-500 text-center">Flexibilidade e inovação para seus planos.</p>
                        </div>
                    </div>
                </section>

                <section className="mt-10 space-y-4">
                    <a href={whatsappLinkCartas} target="_blank" rel="noopener noreferrer" className="w-full bg-white p-4 rounded-lg shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <FaCar className="text-2xl text-fenix-purple" />
                            <span className="font-semibold text-lg text-slate-800">Consulte nossas cartas contempladas</span>
                        </div>
                        <FaArrowRight className="text-slate-400" />
                    </a>
                    <a href="#simulacao" className="w-full bg-white p-4 rounded-lg shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <FaPaperPlane className="text-2xl text-fenix-purple" />
                            <span className="font-semibold text-lg text-slate-800">Peça sua Simulação Direta</span>
                        </div>
                        <FaArrowRight className="text-slate-400" />
                    </a>
                    <a href="/aplicativos" target="_blank" rel="noopener noreferrer" className="w-full bg-white p-4 rounded-lg shadow-lg flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <FaMobileAlt className="text-2xl text-fenix-purple" />
                            <span className="font-semibold text-lg text-slate-800">Baixe os aplicativos das administradoras</span>
                        </div>
                        <FaArrowRight className="text-slate-400" />
                    </a>
                </section>
                
                <section id="acoes" className="bg-white rounded-2xl shadow-xl mt-10 p-8 md:p-10">
                    <h2 className="text-3xl font-bold text-center mb-8 text-fenix-purple">Minhas Ações em Destaque</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {urlsAcoes.map((url, index) => (
                            <div key={index} className="overflow-hidden rounded-lg shadow-md group">
                                <img src={url} alt={`Ação de Vendas ${index + 1}`} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110" />
                            </div>
                        ))}
                    </div>
                </section>

                <section id="simulacao" className="bg-white rounded-2xl shadow-xl mt-10 p-8 md:p-10">
                    <h2 className="text-3xl font-bold text-center mb-6 text-fenix-orange">Peça sua Simulação</h2>
                    <form onSubmit={handleLeadSubmit} className="max-w-xl mx-auto space-y-4">
                        <div>
                            <label className="block font-semibold mb-1">Qual segmento você deseja?*</label>
                            <select name="interesse" value={lead.interesse} onChange={handleLeadChange} className="w-full p-3 rounded-lg border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-fenix-orange">
                                <option value="AUTOMÓVEL">Automóvel (Carro, Moto, Náutico)</option>
                                <option value="IMÓVEL">Imóvel (Casa, Terreno, Construção)</option>
                                <option value="INVESTIMENTO">Investimento e Capital de Giro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Descreva o que você precisa (opcional)</label>
                            <textarea name="mensagem" value={lead.mensagem} onChange={handleLeadChange} rows="4" placeholder="Ex: Gostaria de um crédito de R$100.000 para comprar um terreno..." className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange"></textarea>
                        </div>
                        <button type="submit" className="w-full bg-fenix-orange hover:bg-fenix-purple text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                            <FaPaperPlane /> Enviar para o Consultor
                        </button>
                    </form>
                </section>

                <footer className="text-center text-white-500 text-sm mt-12">
                    <p>&copy; {new Date().getFullYear()} Fênix Consórcios e Investimentos LTDA.</p>
                </footer>
            </div>
        </div>
    );
}