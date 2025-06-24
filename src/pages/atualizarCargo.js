// src/pages/atualizarCargo.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fusiidqqsjruzibkjmwh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2lpZHFxc2pydXppYmtqbXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0OTE3OCwiZXhwIjoyMDY1MjI1MTc4fQ.9zAkr7Vid05QNaUQeHK6aqXwT4DbfJHO8Yz145YZG_w' // ⚠️ Substitua pela nova chave regenerada!
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
