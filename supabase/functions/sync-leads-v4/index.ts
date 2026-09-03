import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://www.fenixgestora.com.br',
  'https://fenixgestora.com.br',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

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
  if (/contato|observacao|anuncio|campanha|atendimento comercial/.test(h)) return null
  if (h === 'data') return 'data_lead'
  if (h === 'nome' || h === 'nome completo') return 'nome'
  if (h === 'e mail' || h === 'email') return 'email'
  if (h === 'telefone') return 'telefone'
  if (h === 'faixa etaria') return 'faixa_etaria'
  if (/ja fez consorcio/.test(h)) return 'ja_fez_consorcio'
  if (/procurando emprestimo/.test(h)) return 'procurando_emprestimo'
  if (/renda familiar/.test(h)) return 'renda_familiar'
  if (h === 'conjunto') return 'conjunto'
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

function rowKey(mapped: Record<string, string>) {
  const parts = [
    digits(mapped.telefone || ''),
    String(mapped.email || '').trim().toLowerCase(),
    String(mapped.data_lead || '').trim(),
    stripAccents(String(mapped.nome || '')).toLowerCase().trim(),
  ]
  return parts.join('|')
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

    const body = await req.json().catch(() => ({}))
    const incomingUrl = typeof body?.spreadsheet_url === 'string' ? body.spreadsheet_url.trim() : ''

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (incomingUrl) {
      const { error: cfgErr } = await admin
        .from('leads_v4_config')
        .update({ spreadsheet_url: incomingUrl, updated_at: new Date().toISOString(), last_sync_error: null })
        .eq('id', 1)
      if (cfgErr) throw new Error(cfgErr.message)
    }

    const { data: config, error: readCfgErr } = await admin
      .from('leads_v4_config')
      .select('spreadsheet_url')
      .eq('id', 1)
      .single()
    if (readCfgErr) throw new Error(readCfgErr.message)

    const sheetUrl = String(config?.spreadsheet_url || '').trim()
    if (!sheetUrl) {
      throw new Error('Cole o link da planilha do Google Sheets e sincronize.')
    }

    const csvText = await fetchSheetCsv(sheetUrl)

    const rows = parseCsv(csvText)
    const headers = rows[0] || []
    const dataRows = rows.slice(1)

    if (!headers.length) {
      throw new Error('A planilha veio vazia.')
    }
    const fieldIndex: Record<string, number> = {}
    headers.forEach((h, i) => {
      const field = classifyHeader(h)
      if (field && fieldIndex[field] === undefined) fieldIndex[field] = i
    })

    if (fieldIndex.nome === undefined) {
      throw new Error('Não encontrei a coluna de nome na planilha.')
    }

    const { data: existing, error: existingErr } = await admin.from('leads_v4_company').select('id, sheet_row_key')
    if (existingErr) throw new Error(existingErr.message)
    const known = new Map(
      (existing || []).map((r: { id: string; sheet_row_key: string }) => [r.sheet_row_key, r.id])
    )

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
      const key = rowKey(mapped)
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
        nome: mapped.nome,
        telefone: mapped.telefone || null,
        email: mapped.email || null,
        data_lead: parseSheetDate(mapped.data_lead) || new Date().toISOString(),
        faixa_etaria: mapped.faixa_etaria || null,
        ja_fez_consorcio: mapped.ja_fez_consorcio || null,
        procurando_emprestimo: mapped.procurando_emprestimo || null,
        renda_familiar: mapped.renda_familiar || null,
        conjunto: conjunto.conjunto,
        conjunto_tipo: conjunto.conjunto_tipo,
        status: 'NOVO',
        raw_payload: mapped,
      })
    }

    let inserted = 0
    const chunkSize = 200
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      const { error: insErr } = await admin.from('leads_v4_company').insert(chunk)
      if (insErr) throw new Error(insErr.message)
      inserted += chunk.length
    }

    for (const item of toOrder) {
      const { error: updErr } = await admin
        .from('leads_v4_company')
        .update({ sheet_row_index: item.sheet_row_index })
        .eq('id', item.id)
      if (updErr) throw new Error(updErr.message)
    }

    const toDelete = (existing || []).filter(
      (r: { sheet_row_key: string }) => !sheetKeys.has(r.sheet_row_key)
    )
    let deleted = 0
    for (let i = 0; i < toDelete.length; i += chunkSize) {
      const ids = toDelete.slice(i, i + chunkSize).map((r: { id: string }) => r.id)
      const { error: delErr } = await admin.from('leads_v4_company').delete().in('id', ids)
      if (delErr) throw new Error(delErr.message)
      deleted += ids.length
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

    return new Response(JSON.stringify({ inserted, skipped, deleted, total: dataRows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
