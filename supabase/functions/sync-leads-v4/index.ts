import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://www.fenixgestora.com.br',
  'https://fenixgestora.com.br',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

/** Fontes oficiais — sync processa todas em uma chamada. */
const DEFAULT_SOURCES = [
  {
    id: 'v4_company',
    label: 'V4 Company',
    url: 'https://docs.google.com/spreadsheets/d/1mU29T-Du8DCl2d71nkqy-5x_z1rbZ7SqQd0TwAtxmI4/edit?usp=sharing',
    /** Sem prefixo: mantém sheet_row_key dos leads já existentes. */
    keyPrefix: '',
  },
  {
    id: 'lp',
    label: 'Leads LP',
    url: 'https://docs.google.com/spreadsheets/d/1cUOIIzOx4blIdheqwp4KM9WCzR5gHWrbF5eK8bzm7gg/edit?gid=0#gid=0',
    keyPrefix: 'lp|',
  },
] as const

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (origin.startsWith('https://') && origin.endsWith('.vercel.app'))
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeHeader(value: string) {
  return stripAccents(String(value || ''))
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    const next = src[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(cell)
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell)
      if (row.some((c) => String(c).trim() !== '')) rows.push(row)
      row = []
      cell = ''
      continue
    }
    if (ch === '\r') continue
    cell += ch
  }
  row.push(cell)
  if (row.some((c) => String(c).trim() !== '')) rows.push(row)
  return rows
}

function classifyHeader(header: string): string | null {
  const h = normalizeHeader(header)
  if (!h) return null
  if (/^(contato|observacao|anuncio|campanha|campaign|source|medium|content|term|gclid|fbclid)$/.test(h)) {
    return null
  }
  if (/atendimento comercial/.test(h)) return null
  if (h === 'data' || h === 'data de entrada') return 'data_lead'
  if (h === 'nome' || h === 'nome completo') return 'nome'
  if (h === 'e mail' || h === 'email') return 'email'
  if (h === 'telefone') return 'telefone'
  if (h === 'cidade') return 'cidade'
  if (h === 'faixa etaria') return 'faixa_etaria'
  if (/ja fez consorcio/.test(h)) return 'ja_fez_consorcio'
  if (/procurando emprestimo/.test(h)) return 'procurando_emprestimo'
  if (/renda familiar/.test(h) || /media de investimento/.test(h)) return 'renda_familiar'
  if (h === 'conjunto' || h === 'objetivo') return 'conjunto'
  return null
}

function parseSheetDate(value: string): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const isoTry = Date.parse(raw)
  if (!Number.isNaN(isoTry)) return new Date(isoTry).toISOString()
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  const dt = new Date(
    year,
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4] || 0),
    Number(m[5] || 0),
    Number(m[6] || 0)
  )
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function digits(value: string) {
  return String(value || '').replace(/\D/g, '')
}

function classifyConjunto(value: string): { conjunto: string | null; conjunto_tipo: string | null } {
  const raw = String(value || '').trim()
  if (!raw) return { conjunto: null, conjunto_tipo: null }
  const n = stripAccents(raw).toLowerCase()
  if (/imov|casa|apartamento|terreno|lote/.test(n)) {
    return { conjunto: raw, conjunto_tipo: 'IMOVEL' }
  }
  if (/auto|carro|moto|veiculo|caminhao/.test(n)) {
    return { conjunto: raw, conjunto_tipo: 'AUTOMOVEL' }
  }
  return { conjunto: raw, conjunto_tipo: 'OUTRO' }
}

function sheetIds(input: string) {
  const url = String(input || '').trim()
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/)
  return {
    id: idMatch?.[1] || null,
    gid: gidMatch?.[1] || '0',
  }
}

function csvCandidateUrls(input: string): string[] {
  const url = String(input || '').trim()
  if (!url) throw new Error('Informe o link da planilha do Google Sheets.')
  if (/output=csv|format=csv|tqx=out:csv/i.test(url)) return [url]
  const { id, gid } = sheetIds(url)
  if (!id) {
    if (url.startsWith('http')) return [url]
    throw new Error('URL da planilha inválida.')
  }
  return [
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`,
  ]
}

async function fetchSheetCsv(sheetUrl: string) {
  let lastHint = ''
  for (const csvUrl of csvCandidateUrls(sheetUrl)) {
    const sheetRes = await fetch(csvUrl, { redirect: 'follow' })
    const csvText = await sheetRes.text()
    if (sheetRes.ok && !/<html/i.test(csvText.slice(0, 280)) && !/accounts\.google\.com/i.test(csvText.slice(0, 280))) {
      return csvText
    }
    lastHint = `${sheetRes.status}`
  }
  throw new Error(
    `A planilha ainda está privada (HTTP ${lastHint}). Em Compartilhar, deixe “qualquer pessoa com o link” como leitor.`
  )
}

function jwtRole(authHeader: string | null) {
  if (!authHeader) return ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''))
    return String(payload?.role || '')
  } catch {
    return ''
  }
}

function rowKey(mapped: Record<string, string>, keyPrefix: string) {
  const parts = [
    digits(mapped.telefone || ''),
    String(mapped.email || '').trim().toLowerCase(),
    String(mapped.data_lead || '').trim(),
    stripAccents(String(mapped.nome || '')).toLowerCase().trim(),
  ]
  return `${keyPrefix}${parts.join('|')}`
}

type ExistingRow = { id: string; sheet_row_key: string; fonte: string | null }

async function syncOneSource(
  admin: ReturnType<typeof createClient>,
  source: { id: string; label: string; url: string; keyPrefix: string },
  existing: ExistingRow[]
) {
  const csvText = await fetchSheetCsv(source.url)
  const rows = parseCsv(csvText)
  const headers = rows[0] || []
  const dataRows = rows.slice(1)

  if (!headers.length) {
    throw new Error(`A planilha ${source.label} veio vazia.`)
  }

  const fieldIndex: Record<string, number> = {}
  headers.forEach((h, i) => {
    const field = classifyHeader(h)
    if (field && fieldIndex[field] === undefined) fieldIndex[field] = i
  })

  if (fieldIndex.nome === undefined) {
    throw new Error(`Não encontrei a coluna de nome na planilha ${source.label}.`)
  }

  const ofFonte = existing.filter((r) => {
    const f = r.fonte || 'v4_company'
    return f === source.id
  })
  const known = new Map(ofFonte.map((r) => [r.sheet_row_key, r.id]))

  const toInsert: Record<string, unknown>[] = []
  const toOrder: { id: string; sheet_row_index: number }[] = []
  const sheetKeys = new Set<string>()
  let skipped = 0

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i]
    const sheetRowIndex = i + 1
    const mapped: Record<string, string> = {}
    for (const [field, idx] of Object.entries(fieldIndex)) {
      mapped[field] = String(row[idx] ?? '').trim()
    }
    if (!mapped.nome) {
      skipped += 1
      continue
    }
    const key = rowKey(mapped, source.keyPrefix)
    if (!key.replace(/\|/g, '') || sheetKeys.has(key)) {
      skipped += 1
      continue
    }
    sheetKeys.add(key)
    const conjunto = classifyConjunto(mapped.conjunto || '')
    const existingId = known.get(key)
    if (existingId) {
      toOrder.push({ id: existingId, sheet_row_index: sheetRowIndex })
      skipped += 1
      continue
    }
    toInsert.push({
      sheet_row_key: key,
      sheet_row_index: sheetRowIndex,
      fonte: source.id,
      nome: mapped.nome,
      telefone: mapped.telefone || null,
      email: mapped.email || null,
      cidade: mapped.cidade || null,
      data_lead: parseSheetDate(mapped.data_lead) || new Date().toISOString(),
      faixa_etaria: mapped.faixa_etaria || null,
      ja_fez_consorcio: mapped.ja_fez_consorcio || null,
      procurando_emprestimo: mapped.procurando_emprestimo || null,
      renda_familiar: mapped.renda_familiar || null,
      conjunto: conjunto.conjunto,
      conjunto_tipo: conjunto.conjunto_tipo,
      status: 'NOVO',
      raw_payload: { ...mapped, _fonte: source.id, _fonte_label: source.label },
    })
  }

  let inserted = 0
  const chunkSize = 200
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize)
    const { error: insErr } = await admin.from('leads_v4_company').insert(chunk)
    if (insErr) throw new Error(`${source.label}: ${insErr.message}`)
    inserted += chunk.length
  }

  for (const item of toOrder) {
    const { error: updErr } = await admin
      .from('leads_v4_company')
      .update({ sheet_row_index: item.sheet_row_index, fonte: source.id })
      .eq('id', item.id)
    if (updErr) throw new Error(`${source.label}: ${updErr.message}`)
  }

  const toDelete = ofFonte.filter((r) => !sheetKeys.has(r.sheet_row_key))
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const ids = toDelete.slice(i, i + chunkSize).map((r) => r.id)
    const { error: delErr } = await admin.from('leads_v4_company').delete().in('id', ids)
    if (delErr) throw new Error(`${source.label}: ${delErr.message}`)
    deleted += ids.length
  }

  return {
    fonte: source.id,
    label: source.label,
    inserted,
    skipped,
    deleted,
    total: dataRows.length,
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Usuário não autenticado.')

    const cronOk = jwtRole(authHeader) === 'service_role'
    if (!cronOk) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const {
        data: { user },
      } = await supabaseUser.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      const { data: perfil, error: perfilError } = await supabaseUser
        .from('usuarios_custom')
        .select('cargo')
        .or(`id.eq.${user.id},auth_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle()

      const cargo = String(perfil?.cargo || '').toLowerCase()
      const autorizado = ['diretor', 'sócio-diretor', 'socio-diretor', 'admin'].includes(cargo)
      if (perfilError || !autorizado) {
        return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sources = DEFAULT_SOURCES.map((s) => ({ ...s }))

    await admin
      .from('leads_v4_config')
      .update({
        spreadsheet_url: sources.map((s) => s.url).join('\n'),
        updated_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq('id', 1)

    const { data: existing, error: existingErr } = await admin
      .from('leads_v4_company')
      .select('id, sheet_row_key, fonte')
    if (existingErr) throw new Error(existingErr.message)

    const perSource = []
    let inserted = 0
    let skipped = 0
    let deleted = 0
    let total = 0

    // Lista mutável: após cada fonte, incluir inserts para a próxima não precisar
    let workingExisting: ExistingRow[] = (existing || []).map((r: ExistingRow) => ({
      id: r.id,
      sheet_row_key: r.sheet_row_key,
      fonte: r.fonte || 'v4_company',
    }))

    for (const source of sources) {
      const result = await syncOneSource(admin, source, workingExisting)
      perSource.push(result)
      inserted += result.inserted
      skipped += result.skipped
      deleted += result.deleted
      total += result.total

      // Recarrega ids desta fonte após inserts
      const { data: refreshed, error: refErr } = await admin
        .from('leads_v4_company')
        .select('id, sheet_row_key, fonte')
      if (refErr) throw new Error(refErr.message)
      workingExisting = (refreshed || []).map((r: ExistingRow) => ({
        id: r.id,
        sheet_row_key: r.sheet_row_key,
        fonte: r.fonte || 'v4_company',
      }))
    }

    await admin
      .from('leads_v4_config')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_count: inserted,
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ inserted, skipped, deleted, total, sources: perSource }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar leads.'
    try {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await admin
        .from('leads_v4_config')
        .update({ last_sync_error: message, updated_at: new Date().toISOString() })
        .eq('id', 1)
    } catch (_) {
      /* ignore */
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
