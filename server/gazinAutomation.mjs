/**
 * Automação Gazin: recebe lista de grupo/cota (mesma base do Excel 8 meses do painel),
 * abre N navegadores (padrão 4), cada um faz login + 2FA e consome uma fila compartilhada
 * localizando cada cota (sem fluxo de lance). Resposta JSON por cliente.
 *
 * .env: ESCRITORIO_{n}_MATRICULA, _SENHA, _2FA_SECRET, _NOME (opcional)
 * Opcional: GAZIN_AUTOMATION_PORT, GAZIN_AUTOMATION_API_TOKEN, GAZIN_NUM_WORKERS (default 4)
 * Rode: npm run server:gazin
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import { authenticator } from 'otplib';

const PORT = Number(process.env.GAZIN_AUTOMATION_PORT || 3847);
const NUM_WORKERS = Math.min(
  8,
  Math.max(1, parseInt(String(process.env.GAZIN_NUM_WORKERS || '4'), 10) || 4)
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getCredenciaisEscritorio(index) {
  const matricula = process.env[`ESCRITORIO_${index}_MATRICULA`];
  const senha = process.env[`ESCRITORIO_${index}_SENHA`];
  const secret2FA = process.env[`ESCRITORIO_${index}_2FA_SECRET`];
  const nome = process.env[`ESCRITORIO_${index}_NOME`] || `Escritório ${index}`;
  if (!matricula || !senha || !secret2FA) {
    throw new Error(
      `Defina ESCRITORIO_${index}_MATRICULA, ESCRITORIO_${index}_SENHA e ESCRITORIO_${index}_2FA_SECRET no .env`
    );
  }
  return { nome, matricula, senha, secret2FA: secret2FA };
}

async function tentarLoginComRetry(cred, browser, nomeInstancia) {
  const maxLoginRetries = 3;
  for (let attempt = 1; attempt <= maxLoginRetries; attempt++) {
    let context = null;
    let page = null;
    try {
      console.log(`\n[${nomeInstancia}] Login ${attempt}/${maxLoginRetries} — ${cred.nome}`);
      context = await browser.newContext({ ignoreHTTPSErrors: true });
      page = await context.newPage();

      await page.goto('https://intranet.consorciogazin.com.br/newconplus/index.asp', { timeout: 60000 });
      await page.locator('#j_username').fill(cred.matricula);
      await page.locator('#j_password').fill(cred.senha);
      await page.getByRole('button', { name: 'Enviar' }).click();

      const seletorCampo2FA = page.getByRole('textbox', { name: 'Digite o Código de 6 dígitos' });
      await seletorCampo2FA.waitFor({ timeout: 15000 });

      for (let i = 1; i <= 3; i++) {
        const token2FA = authenticator.generate(cred.secret2FA);
        await seletorCampo2FA.fill(token2FA);
        await page.getByRole('button', { name: 'Verificar Código' }).click();
        try {
          await page.waitForURL('**/newconplus/MasterFrameset.asp', { timeout: 8000 });
          console.log(`[${nomeInstancia}] Login concluído.`);
          await page.close();
          return context;
        } catch {
          console.log(`[${nomeInstancia}] 2FA inválido ou expirado; nova tentativa...`);
          await delay(2000);
        }
      }
      throw new Error('Falha no 2FA após 3 tentativas.');
    } catch (error) {
      console.error(`[${nomeInstancia}] Erro no login:`, error?.message || error);
      if (context) await context.close().catch(() => {});
      if (attempt === maxLoginRetries) throw error;
      await delay(3000);
    }
  }
  throw new Error('Falha total no login.');
}

async function processarAcessoCliente(context, cliente, nomeInstancia) {
  const page = await context.newPage();
  page.on('dialog', async (dialog) => {
    console.log(`[${nomeInstancia}] Diálogo: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    await page.goto(
      'https://intranet.consorciogazin.com.br/newconplus/Attendance/searchCota.asp?codigo_formulario_intranet=4&descricao_formulario_intranet=Consorciado',
      { timeout: 45000 }
    );
    // A intranet usa frames em alguns fluxos. Primeiro tentamos via frames (codegen),
    // mas fazemos fallback sem frames caso a página venha sem frames.
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});

    const frame = page.frameLocator('frame[name="mainFrame"]').frameLocator('frame[name="MainFrame"]');

    const usarFrames = (await frame.locator('#Grupo').count().catch(() => 0)) > 0;
    const scope = usarFrames ? frame : page;

    // Garante que os campos existem/estão visíveis
    await scope.locator('#Grupo').waitFor({ state: 'visible', timeout: 15000 });
    await scope.locator('#Cota').waitFor({ state: 'visible', timeout: 15000 });

    await scope.locator('#Grupo').fill(String(cliente.grupo));
    await scope.locator('#Cota').fill(String(cliente.cota));

    // Clica Localizar (em frames ou não)
    await scope.getByRole('button', { name: /localizar/i }).click({ timeout: 15000, force: true });

    const msgSemAcessoOuCadastro = scope.getByText(/Acesso negado a este|Consorciado não Cadastrado/i);
    try {
      await msgSemAcessoOuCadastro.waitFor({ state: 'visible', timeout: 2500 });
      const textoMsg = (await msgSemAcessoOuCadastro.first().innerText().catch(() => '')).trim();
      const isNaoCadastrado = /Consorciado não Cadastrado/i.test(textoMsg);
      return {
        status: 'SUCESSO',
        motivo: textoMsg || 'Sem acesso / consorciado não cadastrado.',
        parcelasPagas: 0,
        resultadoTipo: isNaoCadastrado ? 'NAO_CADASTRADO' : 'SEM_ACESSO',
      };
    } catch {
      // segue fluxo normal
    }

    // Normalmente abre os dados do consorciado (URL pode mudar dentro do frame).
    // Tentamos aguardar a navegação e então ler o valor de parcelas pagas (ex.: '001' => 1).
    try {
      await page.waitForURL('**/dataCota.asp**', { timeout: 20000 });
    } catch {
      // Se a URL não mudar no top, seguimos pela extração do valor no frame.
    }

    // IMPORTANTe: a página do cadastro pode conter outros números de 3 dígitos (ex.: o Grupo).
    // O campo "parcelas pagas" costuma ser 001, 002, 003... então filtramos por faixa plausível.
    const locParcelas3Digitos = scope.locator('text=/^\\d{3}$/');
    await locParcelas3Digitos.first().waitFor({ state: 'visible', timeout: 15000 });

    const texts = (await locParcelas3Digitos.allInnerTexts()).map((t) => String(t || '').trim());
    const nums = texts
      .map((t) => ({ t, n: Number.parseInt(t, 10) }))
      .filter((x) => Number.isFinite(x.n));

    const grupoN = Number.parseInt(String(cliente.grupo).trim(), 10);
    const cotaN = Number.parseInt(String(cliente.cota).trim(), 10);

    const candidatos = nums
      .map((x) => x.n)
      .filter((n) => n >= 0 && n <= 60) // faixa típica de parcelas pagas
      .filter((n) => (Number.isFinite(grupoN) ? n !== grupoN : true))
      .filter((n) => (Number.isFinite(cotaN) ? n !== cotaN : true));

    const parcelasPagas = candidatos.length > 0 ? candidatos[0] : NaN;
    if (!Number.isFinite(parcelasPagas)) {
      return {
        status: 'ERRO',
        motivo: `Não foi possível identificar parcelas pagas. Números encontrados: ${nums
          .map((x) => x.t)
          .slice(0, 20)
          .join(', ')}`,
      };
    }

    return { status: 'SUCESSO', motivo: 'Cota localizada na intranet.', parcelasPagas, resultadoTipo: 'OK' };
  } catch (error) {
    const msg = error?.message || 'Erro desconhecido';
    const url = (() => {
      try {
        return page.url();
      } catch {
        return '';
      }
    })();
    return { status: 'ERRO', motivo: url ? `${msg} (url: ${url})` : msg, resultadoTipo: 'ERRO' };
  } finally {
    await page.close().catch(() => {});
  }
}

async function iniciarWorker(id, cred, filaCompartilhada, resultados) {
  const nomeInstancia = `NAV-${id}`;
  let browser = null;
  let context = null;

  try {
    await delay((id - 1) * 2000);
    browser = await chromium.launch({
      headless: false,
      args: [`--window-position=${(id - 1) * 380},0`, '--window-size=1000,820'],
    });
    context = await tentarLoginComRetry(cred, browser, nomeInstancia);

    while (filaCompartilhada.length > 0) {
      const cliente = filaCompartilhada.shift();
      if (!cliente) break;
      console.log(`[${nomeInstancia}] Localizar G${cliente.grupo} C${cliente.cota} — ${cliente.cliente || ''}`);
      const { status, motivo, parcelasPagas, resultadoTipo } = await processarAcessoCliente(context, cliente, nomeInstancia);
      resultados.push({
        grupo: cliente.grupo,
        cota: cliente.cota,
        cliente: cliente.cliente ?? '',
        mesReferencia: cliente.mesReferencia ?? '',
        vendedor: cliente.vendedor ?? '',
        parcelasPagas: typeof parcelasPagas === 'number' ? parcelasPagas : null,
        resultadoTipo: resultadoTipo || null,
        status,
        motivo,
      });
    }
  } catch (e) {
    console.error(`[${nomeInstancia}] Worker encerrado com erro:`, e?.message || e);
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

function normalizarClientes(body) {
  const raw = Array.isArray(body?.clientes) ? body.clientes : [];
  const vistos = new Set();
  const out = [];
  for (const c of raw) {
    const grupo = String(c?.grupo ?? '').trim();
    const cota = String(c?.cota ?? '').trim();
    if (!grupo || !cota) continue;
    const k = `${grupo}|${cota}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({
      grupo,
      cota,
      cliente: String(c?.cliente ?? '').trim(),
      mesReferencia: String(c?.mesReferencia ?? '').trim(),
      vendedor: String(c?.vendedor ?? '').trim(),
    });
  }
  return out;
}

const app = express();
app.use(cors({ origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: '12mb' }));

let emExecucao = false;

app.post('/api/busca-gazin-quantidade', async (req, res) => {
  const expected = process.env.GAZIN_AUTOMATION_API_TOKEN;
  if (expected && req.headers['x-automation-token'] !== expected) {
    return res.status(401).json({ error: 'Token de automação inválido.' });
  }
  if (emExecucao) {
    return res.status(409).json({ error: 'Já existe uma automação em andamento.' });
  }

  const escritorioIndex = Math.max(1, parseInt(String(req.body?.escritorioIndex || '1'), 10) || 1);
  const clientes = normalizarClientes(req.body);

  if (clientes.length === 0) {
    return res.status(400).json({ error: 'Envie clientes[] com grupo e cota (lista do painel / Excel 8 meses).' });
  }

  emExecucao = true;
  try {
    const cred = getCredenciaisEscritorio(escritorioIndex);
    const fila = [...clientes];
    const resultados = [];
    const nWorkers = Math.min(NUM_WORKERS, Math.max(1, clientes.length));
    const workers = [];
    for (let i = 1; i <= nWorkers; i++) {
      workers.push(iniciarWorker(i, cred, fila, resultados));
    }
    await Promise.all(workers);

    const pendentes = fila.length;
    if (pendentes > 0) {
      for (const c of fila) {
        resultados.push({
          grupo: c.grupo,
          cota: c.cota,
          cliente: c.cliente,
          mesReferencia: c.mesReferencia,
          vendedor: c.vendedor,
          status: 'ERRO',
          motivo: 'Não processado (falha de login ou worker encerrado antes da fila).',
        });
      }
      fila.length = 0;
    }

    const sucesso = resultados.filter((r) => r.status === 'SUCESSO').length;
    const erro = resultados.filter((r) => r.status === 'ERRO').length;

    return res.json({
      ok: true,
      escritorioNome: cred.nome,
      workersUsados: nWorkers,
      workersMax: NUM_WORKERS,
      mesInicio: req.body?.mesInicio ?? null,
      mesFim: req.body?.mesFim ?? null,
      total: resultados.length,
      resumo: { SUCESSO: sucesso, ERRO: erro },
      resultados,
    });
  } catch (e) {
    console.error('[gazin]', e);
    const message = e?.message || 'Falha na automação.';
    return res.status(500).json({ error: message });
  } finally {
    emExecucao = false;
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gazin-automation' });
});

const server = app.listen(PORT, () => {
  console.log(`[gazin-automation] http://127.0.0.1:${PORT}`);
  console.log(`[gazin-automation] POST /api/busca-gazin-quantidade (workers=${NUM_WORKERS})`);
  if (process.env.GAZIN_AUTOMATION_API_TOKEN) {
    console.log('[gazin-automation] Proteção por token ativa (X-Automation-Token).');
  }
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[gazin-automation] Porta ${PORT} já está em uso (outro npm run server:gazin?). Encerre o processo ou use outra porta: GAZIN_AUTOMATION_PORT=3848`
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
