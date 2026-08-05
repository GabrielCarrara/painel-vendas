/** Helpers: PDF pts → % (origem CSS no topo). A4 ~ 595.5 × 842.25 */
export function pdfXYToPct(x, y, pageW = 595.5, pageH = 842.25) {
  return {
    xPct: Number(((x / pageW) * 100).toFixed(2)),
    yPct: Number((((pageH - y) / pageH) * 100).toFixed(2)),
  };
}

const A4 = { w: 595.5, h: 842.25 };

function pos(x, y, fontSize = 10, maxWidthPct, page = 1) {
  const { xPct, yPct } = pdfXYToPct(x, y, A4.w, A4.h);
  // Topo do card um pouco acima da baseline do PDF para o texto assentar na linha
  const topAdjust = (fontSize / A4.h) * 100 * 0.85;
  return {
    page,
    xPct,
    yPct: Number((yPct - topAdjust).toFixed(2)),
    fontSize,
    ...(maxWidthPct ? { maxWidthPct } : {}),
  };
}

export const PDF_TEMPLATE_BASE = `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/arquivos/templates`;

/** Posições calibradas a partir do texto dos PDFs oficiais (pdf.js). */
export const POSICOES_DECLARACAO_RESIDENCIA = {
  nome: pos(70, 690, 10),
  grupo: pos(148, 667, 10),
  cota: pos(278, 667, 10),
  cpf: pos(90, 645, 10),
  nacionalidade: pos(365, 645, 10),
  estadoCivil: pos(118, 622, 9),
  logradouro: pos(44, 600, 9),
  numero: pos(312, 600, 10),
  complemento: pos(455, 600, 9),
  bairro: pos(88, 577, 10),
  cep: pos(335, 577, 10),
  cidade: pos(88, 555, 10),
  uf: pos(348, 555, 9),
  // Linha: [cidade], [dia] DE [mês] DE [ano].
  dataCidade: pos(44, 401, 9),
  dataDia: pos(215, 401, 9),
  dataMes: pos(285, 401, 9),
  dataAno: pos(445, 401, 9),
};

export const POSICOES_TERMO_MULTA = {
  nome: pos(72, 719, 10, 70),
  rg: pos(200, 697, 10, 24),
  orgao: pos(468, 697, 10, 12),
  cpf: pos(92, 674, 10, 28),
  logradouro: pos(62, 652, 10, 70),
  cidade: pos(88, 629, 10, 38),
  cep: pos(370, 629, 10, 18),
  uf: pos(68, 607, 10, 6),
  veiculo: pos(95, 539, 10, 70),
  renavam: pos(105, 517, 10, 40),
  chassi: pos(90, 494, 10, 50),
  placa: pos(85, 472, 10, 20),
  // Linha: [cidade], [dia] DE [mês] DE [ano].
  dataCidade: pos(44, 252, 9),
  dataDia: pos(215, 252, 9),
  dataMes: pos(285, 252, 9),
  dataAno: pos(445, 252, 9),
  assNome: pos(105, 145, 10, 50),
  assCpf: pos(95, 124, 10, 35),
};

export const POSICOES_CANCELAMENTO_TRANSFERENCIA = {
  consNome: pos(40, 683, 10, 75),
  grupo: pos(125, 660, 10, 14),
  cota: pos(265, 660, 10, 14),
  consCpf: pos(65, 638, 10, 28),
  consRg: pos(430, 638, 10, 20),
  consOrgao: pos(115, 615, 10, 14),
  consLogradouro: pos(295, 615, 10, 40),
  consNum: pos(40, 593, 10, 7),
  consCompl: pos(175, 593, 10, 12),
  consBairro: pos(310, 593, 10, 12),
  consCidade: pos(445, 593, 10, 18),
  cessNome: pos(250, 503, 10, 45),
  cessCpf: pos(65, 480, 10, 28),
  cessRg: pos(430, 480, 10, 20),
  cessOrgao: pos(115, 458, 10, 14),
  cessLogradouro: pos(295, 458, 10, 40),
  cessNum: pos(40, 435, 10, 7),
  cessBairro: pos(135, 435, 10, 12),
  cessCidade: pos(265, 435, 10, 18),
  assConsNome: pos(110, 286, 10, 45),
  assConsCpf: pos(55, 260, 10, 35),
  assCessNome: pos(120, 158, 10, 45),
  assCessCpf: pos(55, 132, 10, 35),
};

export const POSICOES_UNIAO_ESTAVEL = {
  nome: pos(90, 681, 10, 48),
  estadoCivil: pos(50, 660, 10, 28),
  rg: pos(420, 660, 10, 22),
  ssp: pos(85, 640, 9, 8),
  cpf: pos(280, 640, 10, 28),
  localData: pos(130, 429, 10, 50),
  declNome: pos(50, 302, 10, 45),
  declCpf: pos(85, 275, 10, 35),
  t1Nome: pos(95, 142, 9, 28),
  t1Rg: pos(85, 121, 9, 28),
  t1Cpf: pos(90, 100, 9, 28),
  t2Nome: pos(345, 142, 9, 28),
  t2Rg: pos(335, 121, 9, 28),
  t2Cpf: pos(340, 100, 9, 28),
};
