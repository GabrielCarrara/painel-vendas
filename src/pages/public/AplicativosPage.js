// src/pages/public/AplicativosPage.js

import React from 'react';
import { FaApple, FaGooglePlay, FaGlobe, FaInfoCircle, FaMobileAlt } from 'react-icons/fa';
import logoGazin from '../../assets/logo-gazin.png';

/** Logo HS com fundo tratado — arquivo em /public/logohs.png (PNG com transparência ou arte adequada). */
const logoHSUrl = `${process.env.PUBLIC_URL}/logohs.png`;

const AdminCard = ({ logo, title, siteLink, iosLink, androidLink, instructions, logoStripClass = 'bg-white', logoImgClass = '' }) => (
  <div className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 w-full max-w-full">
    <div className={`p-6 sm:p-8 flex justify-center items-center border-b border-slate-100 min-h-[6.5rem] sm:min-h-[7.5rem] ${logoStripClass}`}>
      <img
        src={logo}
        alt={`Logo ${title}`}
        className={`max-h-16 sm:max-h-24 w-auto max-w-full object-contain ${logoImgClass}`}
      />
    </div>
    <div className="p-6 sm:p-8 flex flex-col flex-grow">
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-6">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <a
          href={siteLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base text-center"
        >
          <FaGlobe /> Acessar Site
        </a>
        <a
          href={iosLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base text-center"
        >
          <FaApple /> Baixar (iOS)
        </a>
        <a
          href={androidLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base text-center"
        >
          <FaGooglePlay /> Baixar (Android)
        </a>
      </div>

      <div className="flex-grow">
        <h4 className="font-bold text-lg mb-3 text-fenix-purple">Como Acessar pela Primeira Vez:</h4>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 text-sm sm:text-base">
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
    'Acesse o site ou baixe o aplicativo.',
    'Informe seu grupo e cota (disponível no seu boleto ou com seu vendedor).',
    "Clique em 'esqueci minha senha' e preencha os campos solicitados.",
    'Um link para redefinir a senha será enviado para o seu e-mail.',
    'Volte ao site/app e faça o login com a nova senha.',
    'Caso não funcione, seu e-mail pode estar desatualizado. Fale com seu vendedor.',
  ];

  const instructionsGazin = [
    'Baixe o aplicativo ou acesse o site.',
    'Ligue gratuitamente para a central: 0800 644 8282.',
    'Escolha a opção 1 para falar com um atendente.',
    'Informe que precisa da senha do aplicativo para acompanhar sua cota.',
    'Com a senha em mãos, acesse o site/app e faça o login.',
    'Seu grupo e cota estão no seu boleto ou podem ser solicitados ao seu vendedor.',
  ];

  return (
    <div className="bg-slate-50 w-full max-w-[100vw] overflow-x-hidden min-h-[100dvh] min-h-screen">
      <section className="bg-white pt-12 sm:pt-16 pb-10 sm:pb-12 text-center border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 text-fenix-purple px-2">
            Área do Cliente
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto px-2">
            Acesse o portal da sua administradora para acompanhar sua carta de crédito, emitir boletos, ofertar lances, ver média de lances e muito mais.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <AdminCard
            logo={logoHSUrl}
            logoStripClass="bg-slate-100"
            logoImgClass="mix-blend-multiply"
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
            iosLink="https://apps.apple.com/br/app/gazin-cons%C3%B3rcio/id6748138462"
            androidLink="https://play.google.com/store/apps/details?id=br.com.gazin.consorcio&pcampaignid=web_share"
            instructions={instructionsGazin}
          />
        </div>

        <section
          className="mt-12 sm:mt-16 max-w-3xl mx-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-8 shadow-md"
          aria-labelledby="titulo-pwa"
        >
          <div className="flex justify-center mb-3 text-fenix-orange">
            <FaMobileAlt className="text-3xl sm:text-4xl" aria-hidden />
          </div>
          <h2 id="titulo-pwa" className="text-xl sm:text-2xl font-bold text-fenix-purple mb-3 text-center">
            Instalar o site no celular (PWA)
          </h2>
          <p className="text-slate-600 text-center mb-6 text-sm sm:text-base leading-relaxed px-1">
            Vendedores e clientes podem fixar a <strong>Fênix Consórcios</strong> na tela inicial. O ícone é o mesmo do atalho do site (favicon / ícone do app).
          </p>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 text-sm text-slate-600">
            <div>
              <h3 className="font-bold text-slate-800 mb-2 text-base">Android (Chrome)</h3>
              <ol className="list-decimal list-outside ml-5 space-y-1.5">
                <li>Abra o site pelo Chrome.</li>
                <li>
                  Menu <span className="whitespace-nowrap">(⋮)</span> → <strong>Instalar app</strong> ou{' '}
                  <strong>Adicionar à tela inicial</strong>.
                </li>
                <li>
                  Confirme — aparecerá o atalho <strong>Fênix Consórcios</strong>.
                </li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-2 text-base">iPhone / iPad (Safari)</h3>
              <ol className="list-decimal list-outside ml-5 space-y-1.5">
                <li>Abra o site pelo Safari.</li>
                <li>
                  Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>Confirme o nome e salve.</li>
              </ol>
            </div>
          </div>
        </section>

        <div className="bg-blue-100 border-t-4 border-blue-500 text-blue-800 p-5 sm:p-6 rounded-b-lg shadow-md flex items-start gap-4 mt-10 sm:mt-12 max-w-4xl mx-auto">
          <FaInfoCircle className="text-2xl sm:text-3xl mt-0.5 shrink-0" />
          <div className="text-sm sm:text-base min-w-0">
            <h4 className="font-bold">Não sabe qual é a sua administradora?</h4>
            <p>
              Fique tranquilo! Entre em contato com o vendedor que te atendeu e ele te passará todas as informações necessárias para o seu acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
