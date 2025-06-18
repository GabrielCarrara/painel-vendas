import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fusiidqqsjruzibkjmwh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2lpZHFxc2pydXppYmtqbXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDkxNzgsImV4cCI6MjA2NTIyNTE3OH0.e7szu6n1Nx1nNo6JT5tMv7JHT2nMk4Cj8DXT1yB-Nfc'

export const supabase = createClient(supabaseUrl, supabaseKey)
