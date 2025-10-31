// supabase/functions/atualizar-usuario-admin/index.ts (CORREÇÃO FINAL)

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
    // 1. Autentica o Diretor
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    // 2. Confirma que é um Diretor
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

    // 3. Cria o cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Pega os dados da requisição
    const { userIdToUpdate, payload } = await req.json()
    if (!userIdToUpdate || !payload) {
      throw new Error('ID do usuário ou dados para atualização não fornecidos.')
    }
    
    console.log('Recebido payload para atualizar:', payload);
    
    // 5. Prepara os dados para o AUTH update
    const authData: { password?: string; email?: string; ban_duration?: string; } = {};
    
    if (payload.password) {
      authData.password = payload.password;
    }
    if (payload.email) {
      authData.email = payload.email;
    }
    
    // Lógica de Banimento
    if (payload.ativo !== undefined) {
      if (payload.ativo === true) {
        authData.ban_duration = 'none'; // Reativa
      } else { 
        // CORREÇÃO AQUI: Trocamos 'd' por 'h' (horas)
        authData.ban_duration = '876000h'; // Inativa (bane por 100 anos)
      }
    }

    // 6. Prepara os dados para o PROFILE update
    const profileData = { ...payload };
    delete profileData.password; 
    
    if (profileData.id_filial) {
      profileData.id_filial = parseInt(profileData.id_filial, 10) || null;
    }

    // 7. Executa o Auth Update
    if (Object.keys(authData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userIdToUpdate,
        authData
      );
      if (authError) {
        console.error('Erro no Auth Update:', authError.message);
        throw new Error('Erro ao atualizar autenticação: ' + authError.message);
      }
    }

    // 8. Executa o Profile Update
    if (Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('usuarios_custom')
        .update(profileData)
        .eq('id', userIdToUpdate);
        
      if (profileError) {
        console.error('Erro no Profile Update:', profileError.message);
        throw new Error('Erro ao atualizar perfil: ' + profileError.message);
      }
    }

    // 9. Retorna sucesso
    return new Response(JSON.stringify({ message: 'Usuário atualizado com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    // 10. Retorna o erro
    console.error('Erro fatal na função:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})