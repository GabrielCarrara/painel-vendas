// supabase/functions/criar-usuario/index.ts (VERSÃO CORRIGIDA)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define os cabeçalhos de CORS (a permissão)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. Responde à requisição de pré-verificação (OPTIONS) IMEDIATAMENTE
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Se não for OPTIONS, continua com a lógica de criar o usuário
  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado.')
    }

    const { data: perfilDiretor, error: perfilError } = await supabaseClient
      .from('usuarios_custom')
      .select('cargo')
      .eq('id', user.id)
      .single()

    if (perfilError || perfilDiretor?.cargo?.toLowerCase() !== 'diretor') {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const { email, password, nome, cargo, id_filial, telefone } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, 
    })

    if (authError) {
      throw new Error('Erro ao criar usuário na autenticação: ' + authError.message)
    }

    const newUserId = authData.user.id

    const { error: profileError } = await supabaseAdmin
      .from('usuarios_custom')
      .update({
        nome: nome,
        email: email,
        cargo: cargo, 
        id_filial: parseInt(id_filial, 10) || null,
        telefone: telefone,
        ativo: true
      })
      .eq('id', newUserId)

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw new Error('Erro ao criar perfil do usuário: ' + profileError.message)
    }

    // 3. Retorna sucesso (COM OS CABEÇALHOS CORS)
    return new Response(JSON.stringify({ message: 'Usuário criado com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    // 4. Retorna erro (COM OS CABEÇALHOS CORS)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})