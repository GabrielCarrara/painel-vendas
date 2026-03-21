// supabase/functions/criar-usuario/index.ts (VERSÃO FINAL COM 'onConflict: email')
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')
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
    const body = await req.json()
    const emailRaw = body.email as string
    const password = body.password as string
    const nome = String(body.nome ?? '').trim()
    const cargo = body.cargo
    const id_filial = body.id_filial
    const telefone = body.telefone
    const email = String(emailRaw ?? '').trim().toLowerCase()
    if (!email || !password || !nome) {
      return new Response(JSON.stringify({ error: 'Nome, e-mail e senha são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Evita duplicata por diferença só de maiúsculas (ti@gmail.com vs TI@gmail.com)
    const emailIlike = email.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    const { data: jaExiste, error: dupErr } = await supabaseAdmin
      .from('usuarios_custom')
      .select('id')
      .ilike('email', emailIlike)
      .limit(1)
    if (dupErr) {
      throw new Error('Erro ao verificar e-mail: ' + dupErr.message)
    }
    if (jaExiste && jaExiste.length > 0) {
      return new Response(JSON.stringify({ error: 'E-mail já cadastrado.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { nome: nome }
    })
    if (authError) {
      throw new Error('Erro ao criar usuário na autenticação: ' + authError.message)
    }
    const newUserId = authData.user.id

    // O trigger do Supabase (que não podemos parar) cria a linha "fantasma" 
    // com o 'id' e 'email', mas o resto dos dados (nome, cargo) fica errado.
    
    // Nossa função agora vai tentar inserir (UPSERT).
    // Se o 'email' já existir (por causa do trigger), ele vai ATUALIZAR
    // a linha "fantasma" com os dados completos.

    const { error: profileError } = await supabaseAdmin
      .from('usuarios_custom')
      .upsert(
        {
          // Importante: Nós *ainda* passamos o 'id' correto
          id: newUserId, 
          nome: nome,
          email: email,
          cargo: cargo, 
          id_filial: parseInt(id_filial, 10) || null,
          telefone: telefone,
          ativo: true
        },
        {
          // ESTA É A CORREÇÃO: Força o upsert a usar a coluna 'email'
          // para detectar o conflito, em vez de usar a Primary Key.
          onConflict: 'email' 
        }
      )

    if (profileError) {
      // Se falhar (ex: email não é único), faz o rollback
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw new Error('Erro ao criar/atualizar perfil do usuário: ' + profileError.message)
    }
    return new Response(JSON.stringify({ message: 'Usuário criado com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})