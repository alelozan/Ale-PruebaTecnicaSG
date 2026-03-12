import { createClient } from '@supabase/supabase-js'

// Obtenemos las variables de entorno configuradas en el archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verificación básica para asegurar que las variables están cargadas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Faltan las variables de entorno de Supabase. Revisa tu archivo .env")
}

// Creamos e exportamos el cliente único de Supabase para toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)