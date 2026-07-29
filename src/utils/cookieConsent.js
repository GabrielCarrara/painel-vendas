const CONSENT_KEY = "fenix_cookie_consent";

export function getCookieConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setCookieConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
}

export function clearAnalyticsCookies() {
  const names = document.cookie.split(";").map((c) => c.split("=")[0].trim());
  const targets = names.filter(
    (n) => n.startsWith("_ga") || n.startsWith("_gid") || n.startsWith("_gcl") || n === "_gat"
  );
  const domains = ["", window.location.hostname, `.${window.location.hostname.replace(/^www\./, "")}`];
  for (const name of targets) {
    for (const domain of domains) {
      const domainPart = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
    }
  }
}

/** Carrega o GTM só após consentimento (evita cookies de analytics sem aceite). */
export function loadGoogleTagManager(containerId = "GTM-N3S6S55") {
  if (typeof window === "undefined") return;
  if (window.__fenixGtmLoaded) return;
  window.__fenixGtmLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(script);
}
