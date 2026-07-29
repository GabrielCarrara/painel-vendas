import React from "react";
import { Link } from "react-router-dom";

export default function PrivacidadePage() {
  return (
    <div className="bg-slate-50 text-slate-800 min-h-[70vh]">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-fenix-purple mb-4">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 mb-8">Última atualização: 29 de julho de 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-slate-700">
          <p>
            A Fênix Consórcios (“nós”) opera o site <strong>fenixgestora.com.br</strong>. Esta
            página explica quais dados tratamos e como você controla cookies de análise.
          </p>

          <h2 className="text-lg font-semibold text-fenix-purple pt-2">1. Dados que coletamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dados que você envia em formulários (nome, telefone, e-mail, mensagem).</li>
            <li>
              Dados de navegação via Google Analytics/Tag Manager, somente se você{" "}
              <strong>aceitar</strong> cookies no banner.
            </li>
            <li>Dados de conta no painel interno (login), protegidos por autenticação.</li>
          </ul>

          <h2 className="text-lg font-semibold text-fenix-purple pt-2">2. Cookies</h2>
          <p>
            Cookies essenciais do site (sessão/login) são necessários ao funcionamento do painel.
            Cookies de marketing/análise (<code>_ga</code>, <code>_gcl_au</code> etc.) só são
            ativados após o seu consentimento. Você pode recusar no banner; nesse caso, não
            carregamos o Google Tag Manager.
          </p>

          <h2 className="text-lg font-semibold text-fenix-purple pt-2">3. Finalidade</h2>
          <p>
            Atendimento comercial, operação do painel de vendas/CRM e, com consentimento, métricas
            de uso do site institucional.
          </p>

          <h2 className="text-lg font-semibold text-fenix-purple pt-2">4. Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão de dados pessoais pelo canal de
            contato do site. Contas internas do painel são geridas pela administração da empresa.
          </p>

          <h2 className="text-lg font-semibold text-fenix-purple pt-2">5. Contato</h2>
          <p>
            Dúvidas: use a página{" "}
            <Link to="/contato" className="text-fenix-orange underline">
              Contato
            </Link>{" "}
            ou o WhatsApp disponível no site.
          </p>
        </section>

        <p className="mt-10">
          <Link to="/" className="text-fenix-orange font-semibold hover:underline">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
