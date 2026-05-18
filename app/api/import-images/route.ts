export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ESCUDO DEFENSIVO: Mismo patrón que delete-account y relinquish-shot
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan las variables de entorno de Supabase Admin (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY). Configúralas en .env.local");
  }
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { urls, userId } = await req.json();
    if (!urls || !userId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const results = [];

    for (const url of urls) {
      try {
        // Escudo de tiempo: 8 segundos máximo por imagen
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        
        const blob = await response.blob();

        // Rechazar imágenes mayores a 5MB
        if (blob.size > 5 * 1024 * 1024) {
          throw new Error("Imagen excede 5MB");
        }

        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('shots')
          .upload(filename, blob, { contentType: blob.type });
          
        if (uploadError) throw uploadError;

        const { data: publicData } = supabaseAdmin.storage.from('shots').getPublicUrl(filename);
        
        results.push({
          originalUrl: url,
          publicUrl: publicData.publicUrl
        });

      } catch (err: any) {
        console.error(`⏳ Timeout o fallo al importar ${url}:`, err?.message || err);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}