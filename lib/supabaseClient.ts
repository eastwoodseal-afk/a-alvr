import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// LEY 3.3: Timeout Global. Si una petición a Supabase se queda colgada 
// (por inactividad o red muerta), la cancelamos a los 15 segundos.
// Esto evita el "Cargando..." eterno en toda la app.
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit | undefined) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 15000)
    )
  ]) as Promise<Response>;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout as any // Inyectamos nuestro fetch con freno
  }
});