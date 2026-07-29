import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  clearAnalyticsCookies,
  getCookieConsent,
  loadGoogleTagManager,
  setCookieConsent,
} from "../utils/cookieConsent";

export default function CookieConsentBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (consent === "accepted") {
      loadGoogleTagManager();
      return;
    }
    if (consent === "rejected") return;
    setVisivel(true);
  }, []);

  const aceitar = () => {
    setCookieConsent("accepted");
    loadGoogleTagManager();
    setVisivel(false);
  };

  const recusar = () => {
    setCookieConsent("rejected");
    clearAnalyticsCookies();
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[200] p-3 sm:p-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      role="dialog"
      aria-labelledby="cookie-consent-titulo"
      aria-describedby="cookie-consent-texto"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-700 bg-gray-900 text-white shadow-2xl p-4 sm:p-5">
        <h2 id="cookie-consent-titulo" className="text-sm font-bold text-fenix-orange mb-1.5">
          Cookies e privacidade
        </h2>
        <p id="cookie-consent-texto" className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-3">
          Usamos cookies de análise (Google Analytics) para melhorar o site. Você pode aceitar ou
          recusar. Sem aceite, não carregamos ferramentas de medição.{" "}
          <Link to="/privacidade" className="text-fenix-orange underline hover:brightness-110">
            Política de privacidade
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={recusar}
            className="px-3 py-2 rounded-md text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={aceitar}
            className="px-3 py-2 rounded-md text-xs font-semibold bg-fenix-orange hover:brightness-110 text-black"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
