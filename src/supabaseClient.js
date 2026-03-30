import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Erro explícito em dev para evitar app “meio funcionando”
  // (em produção isso pode virar um blank screen, então preferimos falhar cedo).
  throw new Error('Supabase não configurado: defina REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
