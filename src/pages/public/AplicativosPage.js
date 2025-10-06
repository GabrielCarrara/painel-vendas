// src/pages/public/AplicativosPage.js

import React from 'react';
import { FaApple, FaGooglePlay, FaGlobe, FaInfoCircle } from 'react-icons/fa';
import logoGazin from '../../assets/logo-gazin.png';
import logoHS from '../../assets/logo-hs.png';

const AdminCard = ({ logo, title, siteLink, iosLink, androidLink, instructions }) => (
    <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
        <div className="p-8 flex justify-center items-center bg-slate-100">
            <img src={logo} alt={`Logo ${title}`} className="max-h-24" />
        </div>
        <div className="p-8 flex flex-col flex-grow">
            <h3 className="text-3xl font-bold text-slate-900 text-center mb-6">{title}</h3>

            {/* Botões de Download */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <a href={siteLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors">
                    <FaGlobe /> Acessar Site
                </a>
                <a href={iosLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <FaApple /> Baixar (iOS)
                </a>
                <a href={androidLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <FaGooglePlay /> Baixar (Android)
                </a>
            </div>

            {/* Instruções */}
            <div className="flex-grow">
                <h4 className="font-bold text-lg mb-3 text-fenix-purple">Como Acessar pela Primeira Vez:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    {instructions.map((step, index) => (
                        <li key={index}>{step}</li>
                    ))}
                </ol>
            </div>
        </div>
    </div>
);

export default function AplicativosPage() {
    const instructionsHS = [
        "Acesse o site ou baixe o aplicativo.",
        "Informe seu grupo e cota (disponível no seu boleto ou com seu vendedor).",
        "Clique em 'esqueci minha senha' e preencha os campos solicitados.",
        "Um link para redefinir a senha será enviado para o seu e-mail.",
        "Volte ao site/app e faça o login com a nova senha.",
        "Caso não funcione, seu e-mail pode estar desatualizado. Fale com seu vendedor."
    ];

    const instructionsGazin = [
        "Baixe o aplicativo ou acesse o site.",
        "Ligue gratuitamente para a central: 0800 644 8282.",
        "Escolha a opção 1 para falar com um atendente.",
        "Informe que precisa da senha do aplicativo para acompanhar sua cota.",
        "Com a senha em mãos, acesse o site/app e faça o login.",
        "Seu grupo e cota estão no seu boleto ou podem ser solicitados ao seu vendedor."
    ];

    return (
        <div className="bg-slate-50">
            <section className="bg-white pt-16 pb-12 text-center border-b border-slate-200">
                <div className="container mx-auto px-6">
                    <h1 className="text-5xl font-extrabold mb-4 text-fenix-purple">Área do Cliente</h1>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                        Acesse o portal da sua administradora para acompanhar sua carta de crédito, emitir boletos, ofertar lances, ver média de lances e muito mais.
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <AdminCard 
                        logo={logoHS}
                        title="HS Consórcios"
                        siteLink="https://hsconsorcios.com.br/cliente/"
                        iosLink="https://apps.apple.com/br/app/hs-consorcios/id1567388780"
                        androidLink="https://play.google.com/store/apps/details?id=com.autoatendimento.hsconsorcios&pcampaignid=web_share"
                        instructions={instructionsHS}
                    />
                    <AdminCard 
                        logo={logoGazin}
                        title="Gazin Consórcios"
                        siteLink="https://consorciogazin.com.br/area-do-cliente"
                        iosLink="https://apps.apple.com/br/app/gazin-cons%C3%B3rcio/id674813846"
                        androidLink="https://play.google.com/store/apps/details?id=br.com.gazin.consorcio&pcampaignid=web_share"
                        instructions={instructionsGazin}
                    />
                </div>

                <div className="bg-blue-100 border-t-4 border-blue-500 text-blue-800 p-6 rounded-b-lg shadow-md flex items-start gap-4 mt-16 max-w-4xl mx-auto">
                    <FaInfoCircle className="text-3xl mt-1" />
                    <div>
                        <h4 className="font-bold">Não sabe qual é a sua administradora?</h4>
                        <p>Fique tranquilo! Entre em contato com o vendedor que te atendeu e ele te passará todas as informações necessárias para o seu acesso.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}