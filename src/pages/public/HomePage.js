

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { FaWhatsapp, FaUsers, FaBuilding, FaCheckCircle, FaLightbulb, FaCar, FaHome, FaChartLine, FaArrowRight, FaMapMarkerAlt } from 'react-icons/fa';
import ListaVendedores from './ListaVendedores';
import logoGazin from '../../assets/logo-gazin.png';
import logoHS from '../../assets/logo-hs.png';
import minhaImagem from '../../assets/minhaImagem.png';

const backgroundImageUrl = minhaImagem;

export default function HomePage() {
    const [contatoAberto, setContatoAberto] = useState(false);
    const [filialSelecionada, setFilialSelecionada] = useState('');
    const [adminFilialSelecionada, setAdminFilialSelecionada] = useState('');
    const [contatosAdmin, setContatosAdmin] = useState([]);
    const secaoContatoRef = useRef(null);

    useEffect(() => {
        if (contatoAberto) {
            secaoContatoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [contatoAberto]);

    useEffect(() => {
        const buscarContatosAdmin = async () => {
            const { data } = await supabase.from('usuarios_custom').select('nome, cargo, telefone, foto_url, id_filial').in('cargo', ['diretor', 'gerente']).eq('ativo', true);
            if (data) setContatosAdmin(data);
        };
        buscarContatosAdmin();
    }, []);

    const adminParaExibir = useMemo(() => {
        if (!adminFilialSelecionada) return [];
        if (adminFilialSelecionada === '1') return contatosAdmin.filter(admin => admin.nome.toUpperCase() === 'GABRIEL COSTA CARRARA');
        if (adminFilialSelecionada === '2') return contatosAdmin.filter(admin => admin.nome.toUpperCase() === 'LUCAS DOS SANTOS RIBEIRO');
        return [];
    }, [contatosAdmin, adminFilialSelecionada]);
    
    return (
        <div className="text-slate-800">
           {/* --- HERO SECTION --- */}
           <section 
                className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImageUrl})` }}
            >
                <div className="absolute inset-0 bg-black/60"></div>
                <div className="relative z-10 container mx-auto px-6 text-white animate-fade-in">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight drop-shadow-lg">
                            Planeje seu futuro com a <span className="text-fenix-orange">Fênix Consórcios</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-200 mb-8 font-light">
                            A maneira mais inteligente de conquistar seu carro, casa ou de investir no seu crescimento com segurança e flexibilidade.
                        </p>
                        <div className="flex items-center justify-center space-x-6 mb-8">
                            <div className="flex items-center gap-2"><FaCar className="text-fenix-orange"/> <span>Seu Carro Novo</span></div>
                            <div className="flex items-center gap-2"><FaHome className="text-fenix-orange"/> <span>Sua Casa Própria</span></div>
                            <div className="flex items-center gap-2"><FaChartLine className="text-fenix-orange"/> <span>Seu Investimento</span></div>
                        </div>
                        <button onClick={() => setContatoAberto(prev => !prev)} className="bg-fenix-orange hover:bg-fenix-purple font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-xl">
                            Fale Conosco!
                        </button>
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO DE CONTATO (AGORA REDESENHADA) --- */}
            <div ref={secaoContatoRef}>
                {contatoAberto && (
                    <section className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-20 animate-fade-in">
                        <div className="container mx-auto px-6 text-center">
                            <h2 className="text-4xl font-bold mb-4 text-fenix-purple">Como podemos ajudar?</h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                                Seja para uma parceria, um novo plano de consórcio ou para falar com nossa equipe, escolha uma das opções abaixo.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
                                
                                {/* Card Administrativo */}
                                <div className="bg-white p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                                    <div className="inline-block bg-purple-100 text-fenix-purple rounded-full p-4 mb-4">
                                        <FaBuilding size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4 text-slate-900">Setor Administrativo</h3>
                                    <div className="mb-4">
                                        <label className="block mb-2 text-slate-600">Para qual filial é o seu contato?</label>
                                        <select onChange={(e) => setAdminFilialSelecionada(e.target.value)} className="w-full bg-slate-100 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange">
                                            <option value="">-- Escolha uma filial --</option>
                                            <option value="1">Pontes e Lacerda</option>
                                            <option value="2">Mirassol D'Oeste</option>
                                        </select>
                                    </div>
                                    {adminParaExibir.map(admin => (
                                        <div key={admin.nome} className="bg-slate-50 p-4 rounded-lg text-center mt-4 animate-fade-in">
                                            <img src={admin.foto_url || `https://ui-avatars.com/api/?name=${admin.nome}&background=6A1B9A&color=fff`} alt={admin.nome} className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-fenix-orange" />
                                            <h4 className="font-bold text-slate-900">{admin.nome}</h4>
                                            <p className="text-sm text-fenix-purple capitalize">{admin.cargo.toLowerCase()}</p>
                                            <a href={`https://wa.me/55${admin.telefone}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                                                <FaWhatsapp /> Falar com o Administrativo
                                            </a>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Card Vendedor */}
                                <div className="bg-white p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                                    <div className="inline-block bg-pink-100 text-fenix-pink rounded-full p-4 mb-4">
                                        <FaUsers size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4 text-slate-900">Falar com um Vendedor</h3>
                                    <div className="mb-4">
                                        <label className="block mb-2 text-slate-600">Selecione sua cidade:</label>
                                        <select onChange={(e) => setFilialSelecionada(e.target.value)} className="w-full bg-slate-100 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange">
                                            <option value="">-- Escolha uma filial --</option>
                                            <option value="1">Pontes e Lacerda</option>
                                            <option value="2">Mirassol D'Oeste</option>
                                        </select>
                                    </div>
                                    {filialSelecionada && <ListaVendedores filialId={filialSelecionada} />}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* --- SEÇÃO "REPRESENTAMOS" --- */}
            <section className="bg-slate-100 py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-4 text-fenix-purple">Representamos com Orgulho</h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                        Trabalhamos com as administradoras mais sólidas e confiáveis do mercado para garantir a sua segurança e satisfação.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch max-w-4xl mx-auto">
                        
                        {/* Card Gazin */}
                        <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                            <div className="h-32 flex items-center justify-center w-full">
                                <img src={logoGazin} alt="Gazin Consórcios" className="h-20" />
                            </div>
                            <h3 className="text-2xl font-semibold text-slate-900 mt-4 mb-3">Gazin Consórcios</h3>
                            <p className="text-slate-500 mb-6 flex-grow">Tradição e solidez para você realizar.</p>
                            {/* LINK CORRIGIDO PARA ABRIR EM NOVA ABA */}
                            <a href="https://consorciogazin.com.br/sobre-o-consorcio-gazin" target="_blank" rel="noopener noreferrer" className="mt-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                                Saiba Mais <FaArrowRight />
                            </a>
                        </div>

                        {/* Card HS */}
                        <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                            <div className="h-32 flex items-center justify-center w-full p-4">
                                <img src={logoHS} alt="HS Consórcios" className="h-24" />
                            </div>
                            <h3 className="text-2xl font-semibold text-slate-900 mt-4 mb-3">HS Consórcios</h3>
                            <p className="text-slate-500 mb-6 flex-grow">Flexibilidade e inovação para seus planos.</p>
                            {/* LINK CORRIGIDO PARA ABRIR EM NOVA ABA */}
                            <a href="https://hsconsorcios.com.br/sobre-nos/" target="_blank" rel="noopener noreferrer" className="mt-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2">
                                Saiba Mais <FaArrowRight />
                            </a>
                        </div>
                    </div>
                </div>
            </section>
            {/* --- NOVA SEÇÃO DE LOCALIZAÇÃO --- */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center">
                        <h2 className="text-4xl font-bold mb-4 text-fenix-purple">Nossas Unidades</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                            Venha tomar um café conosco. Estamos sempre de portas abertas para ajudar você a planejar seu futuro.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Coluna Pontes e Lacerda */}
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-fenix-orange" /> Filial Pontes e Lacerda
                            </h3>
                            <div className="bg-slate-50 p-6 rounded-lg text-slate-600 mb-4">
                                <p><strong>Endereço:</strong> Rua Antônio Bento Neto, 887, Centro</p>
                                <p><strong>Cidade:</strong> Pontes e Lacerda - MT</p>
                                <p><strong>CEP:</strong> 78250-000</p>
                                <p><strong>Contato:</strong> 65 9 8127-8212</p>

                            </div>
                            <div className="flex-grow rounded-lg overflow-hidden shadow-lg">
                                <iframe
                                    src="https://maps.google.com/maps?q=-15.230259,-59.336189&hl=pt-BR&z=16&output=embed"
                                    width="100%"
                                    height="350"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>

                        {/* Coluna Mirassol D'Oeste */}
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-fenix-orange" /> Filial Mirassol D'Oeste
                            </h3>
                            <div className="bg-slate-50 p-6 rounded-lg text-slate-600 mb-4">
                                <p><strong>Endereço:</strong> Avenida Amadeu Téles, 1716, Viz da Brilhus</p>
                                <p><strong>Cidade:</strong> Mirassol D'Oeste - MT</p>
                                <p><strong>CEP:</strong> 78280-000</p>
                                <p><strong>Contato:</strong> 65 9 9809-2182</p>

                            </div>
                            <div className="flex-grow rounded-lg overflow-hidden shadow-lg">
                                <iframe
                                    src="https://maps.google.com/maps?q=-15.675527,-58.089950&hl=pt-BR&z=16&output=embed"
                                    width="100%"
                                    height="350"
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
             <section className="py-20 text-center bg-slate-100">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-bold mb-12 text-fenix-orange">Por que escolher a Fênix?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Card 1 */}
                        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-transparent transition-all duration-300 hover:shadow-2xl hover:border-fenix-pink hover:-translate-y-2">
                            <div className="inline-block bg-pink-100 text-fenix-pink rounded-full p-4 mb-4">
                                <FaCheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3 text-slate-900">Segurança e Confiança</h3>
                            <p className="text-slate-600">Parceria com as 2 maiores administradoras do Brasil.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-transparent transition-all duration-300 hover:shadow-2xl hover:border-fenix-pink hover:-translate-y-2">
                            <div className="inline-block bg-pink-100 text-fenix-pink rounded-full p-4 mb-4">
                                <FaUsers size={32} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3 text-slate-900">Atendimento Personalizado</h3>
                            <p className="text-slate-600">Consultores dedicados a entender suas necessidades.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-transparent transition-all duration-300 hover:shadow-2xl hover:border-fenix-pink hover:-translate-y-2">
                            <div className="inline-block bg-pink-100 text-fenix-pink rounded-full p-4 mb-4">
                                <FaLightbulb size={32} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-3 text-slate-900">Soluções Completas</h3>
                            <p className="text-slate-600">Crédito para veículos, imóveis, serviços e muito mais.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}