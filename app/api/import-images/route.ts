export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ESCUDO DEFENSIVO: Solo creamos el cliente admin si las llaves existen. 
// Así no rompe el build en Vercel si falta la Service Role Key.
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan las variables de entorno de Supabase Admin (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY). Configúralas en Vercel.");
  }
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { urls, userId } = await req.json();
    if (!urls || !userId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const results = [];

    for (const url of urls) {
      try {
        // NUEVO: Escudo de tiempo. Si tarda más de 8 segundos, abortamos.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId); // Limpiamos el timer si descargó rápido

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        
        const blob = await response.blob();

        // NUEVO: Rechazar imágenes que pesen más de 5MB (protección extra)
        if (blob.size > 5 * 1024 * 1024) {
          throw new Error("Imagen excede 5MB");
        }

        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

        const { error: uploadError } = await getSupabaseAdmin().storage
          .from('shots')
          .upload(filename, blob, { contentType: blob.type });
          
        if (uploadError) throw uploadError;

        const { data: publicData } = getSupabaseAdmin().storage.from('shots').getPublicUrl(filename);
        
        results.push({
          originalUrl: url,
          publicUrl: publicData.publicUrl
        });

      } catch (err: any) {
        console.error(`⏳ Timeout o fallo al importar ${url}:`, err?.message || err);
        // Si una falla o se pasma, la saltamos y seguimos con la siguiente
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}