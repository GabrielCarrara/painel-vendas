export function apenasDigitos(s) {
  return String(s ?? '').replace(/\D/g, '');
}

/** Máscara de CPF para exibição/PDF. Aceita incompleto (progressivo). Estado do formulário: só dígitos. */
export function formatarCpf(digitos) {
  const d = apenasDigitos(digitos).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCep(digitos) {
  const d = apenasDigitos(digitos).slice(0, 8);
  if (d.length !== 8) return digitos || '';
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Máscara de CNPJ para exibição/PDF. Aceita incompleto (progressivo). Estado do formulário: só dígitos. */
export function formatarCnpj(digitos) {
  const d = apenasDigitos(digitos).slice(0, 14);
  if (d.length === 0) return '';
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CPF (≤11 dígitos) ou CNPJ (>11): máscara para PDF/prévia (progressiva se incompleto). */
export function formatarCpfOuCnpj(digitos) {
  const d = apenasDigitos(digitos);
  if (d.length <= 11) return formatarCpf(d);
  return formatarCnpj(d);
}

/** Número e dígito opcional: só número, ou "número-dígito" se dígito informado. */
export function formatarNumeroComDv(numero, digitoVerificador) {
  const n = apenasDigitos(numero);
  const dv = apenasDigitos(digitoVerificador);
  if (!n) return '';
  if (!dv) return n;
  return `${n}-${dv}`;
}
