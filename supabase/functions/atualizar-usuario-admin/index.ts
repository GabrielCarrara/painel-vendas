// supabase/functions/atualizar-usuario-admin/index.ts (VERSÃO FINAL)
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')
    const { data: perfilDiretor } = await supabaseClient
      .from('usuarios_custom')
      .select('cargo')
      .eq('id', user.id)
      .single()
    if (perfilDiretor?.cargo?.toLowerCase() !== 'diretor') {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { userIdToUpdate, payload } = await req.json()
    if (!userIdToUpdate || !payload) {
      throw new Error('ID do usuário ou dados para atualização não fornecidos.')
    }

    const authData: { password?: string; email?: string; ban_duration?: string; } = {};
    if (payload.password) authData.password = payload.password;
    if (payload.email) authData.email = payload.email;
    if (payload.ativo !== undefined) {
      if (payload.ativo === true) authData.ban_duration = 'none';
      else authData.ban_duration = '876000h';
    }

    const profileData = { ...payload };
    delete profileData.password; 

    // ESTA É A CORREÇÃO DO LOG 'bigint'
    if (profileData.id_filial !== undefined) {
      profileData.id_filial = parseInt(profileData.id_filial, 10) || null;
    }
    // FIM DA CORREÇÃO

    if (Object.keys(authData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userIdToUpdate,
        authData
      );
      if (authError) {
        throw new Error('Erro ao atualizar autenticação: ' + authError.message);
      }
    }
    if (Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('usuarios_custom')
        .update(profileData)
        .eq('id', userIdToUpdate);
      if (profileError) {
        throw new Error('Erro ao atualizar perfil: ' + profileError.message);
      }
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