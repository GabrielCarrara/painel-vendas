// src/pages/atualizarCargo.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  // Este script NÃO deve rodar no frontend. Use apenas localmente/Node com env vars.
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function atualizarCargo() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '76fd2bda-201e-4491-95f4-27db598b2504', // ID do usuário
    {
      user_metadata: { cargo: 'gerente' } // Valor a ser salvo
    }
  )

  if (error) {
    console.error('❌ Erro ao atualizar cargo:', error.message)
  } else {
    console.log('✅ Cargo atualizado com sucesso:', data)
  }
}

atualizarCargo()
