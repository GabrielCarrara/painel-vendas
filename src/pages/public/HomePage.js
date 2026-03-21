import React, { useState, useEffect, useRef } from 'react';
import { FaWhatsapp, FaUsers, FaCheckCircle, FaLightbulb, FaCar, FaHome, FaChartLine, FaArrowRight, FaMapMarkerAlt } from 'react-icons/fa';
import logoGazin from '../../assets/logo-gazin.png';
import logoHS from '../../assets/logo-hs.png';
import minhaImagem from '../../assets/minhaImagem.png';

const backgroundImageUrl = minhaImagem;

export default function HomePage() {
    const [contatoAberto, setContatoAberto] = useState(false);
    const secaoContatoRef = useRef(null);
    const [leadData, setLeadData] = useState({
        nome: '',
        telefone: '',
        email: '',
        interesse: 'AUTOMÓVEL',
        mensagem: ''
    });

    useEffect(() => {
        if (contatoAberto) {
            secaoContatoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [contatoAberto]);

    const handleLeadChange = (e) => {
        const { name, value } = e.target;
        setLeadData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLeadSubmit = (e) => {
        e.preventDefault();
        const numeroCentral = '5565981278212';
        let mensagem = `Olá, Fênix Consórcios! Tenho interesse em uma simulação.\n\n*Nome:* ${leadData.nome}\n*Telefone:* ${leadData.telefone}\n`;
        if (leadData.email) mensagem += `*E-mail:* ${leadData.email}\n`;
        mensagem += `*Interesse:* ${leadData.interesse}\n`;
        if (leadData.mensagem) mensagem += `*Mensagem:* ${leadData.mensagem}\n`;
        const urlWhatsApp = `https://wa.me/${numeroCentral}?text=${encodeURIComponent(mensagem)}`;
        window.open(urlWhatsApp, '_blank');
    };

    return (
        
            <div className="text-slate-800 w-full max-w-[100vw] overflow-x-hidden">
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
                        <button onClick={() => setContatoAberto(prev => !prev)} className="bg-fenix-orange hover:brightness-110 active:brightness-95 font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-xl">
                            Fale Conosco!
                        </button>
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO DO GERADOR DE LEADS (SUBSTITUI A ANTIGA SEÇÃO DE CONTATO) --- */}
            <div ref={secaoContatoRef}>
                {contatoAberto && (
                    <section className="bg-slate-200 py-20 animate-fade-in">
                        <div className="container mx-auto px-6 text-center">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-fenix-orange">Simulação Rápida</h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                                Preencha os campos abaixo e envie para nosso WhatsApp. Um de nossos especialistas entrará em contato em breve!
                            </p>
                            <form onSubmit={handleLeadSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg text-left space-y-4">
                                <div>
                                    <label className="block font-semibold mb-1">Nome Completo*</label>
                                    <input type="text" name="nome" value={leadData.nome} onChange={handleLeadChange} required className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange"/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold mb-1">Telefone (WhatsApp)*</label>
                                        <input type="tel" name="telefone" value={leadData.telefone} onChange={handleLeadChange} required className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange"/>
                                    </div>
                                    <div>
                                        <label className="block font-semibold mb-1">E-mail</label>
                                        <input type="email" name="email" value={leadData.email} onChange={handleLeadChange} className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Tenho interesse em:</label>
                                    <select name="interesse" value={leadData.interesse} onChange={handleLeadChange} className="w-full p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-fenix-orange">
                                        <option>AUTOMÓVEL</option>
                                        <option>IMÓVEL</option>
                                        <option>ELETRO</option>
                                        <option>INVESTIMENTO</option>
                                        <option>OUTRO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Mensagem (opcional)</label>
                                    <textarea name="mensagem" value={leadData.mensagem} onChange={handleLeadChange} rows="4" className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-fenix-orange"></textarea>
                                </div>
                                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                                    <FaWhatsapp size={24} /> Enviar via WhatsApp
                                </button>
                            </form>
                        </div>
                    </section>
                )}
            </div>

            {/* --- SEÇÃO "REPRESENTAMOS" --- */}
            <section className="bg-slate-100 py-20">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-fenix-orange">Representamos com Orgulho</h2>
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
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-fenix-orange">Nossa Unidade</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
                            Venha tomar um café conosco. Estamos de portas abertas para ajudar você a planejar seu futuro.
                        </p>
                    </div>
                    <div className="max-w-3xl mx-auto">
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-fenix-orange" /> Pontes e Lacerda
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
                                    title="Mapa Pontes e Lacerda"
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