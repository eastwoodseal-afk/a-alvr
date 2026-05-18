import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// El ADN del Fantasma
const GHOST_USER_ID = '9e717b49-395c-48d2-add9-7a60ab9c7baf';

// ESCUDO DEFENSIVO
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Falta la Service Role Key en el .env.local del Laboratorio.");
  }
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { shotId, accessToken } = await req.json();
    if (!shotId || !accessToken) {
      return NextResponse.json({ error: 'Faltan datos (shotId o accessToken)' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verificar identidad real
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: `Auth error: ${authError?.message || 'Sin usuario'}` }, { status: 401 });
    }

    // 2. FORZAR CONVERSIÓN A NÚMERO (La cura para el BigInt)
    const numericShotId = Number(shotId);
    if (isNaN(numericShotId)) {
      return NextResponse.json({ error: 'El ID del shot no es un número válido' }, { status: 400 });
    }

        // 3. Obtener el shot usando el NÚMERO y FORZANDO la relación del dueño actual
    const { data: shot, error: shotError } = await supabaseAdmin
      .from('shots')
      .select('user_id, profiles!shots_user_id_fkey(username)') // <-- AQUÍ ESTÁ LA CLAVE
      .eq('id', numericShotId) 
      .single();

    // Si Supabase tira un error real, lo mostramos
    if (shotError) {
      console.error("💥 Error DB buscando shot:", shotError);
      return NextResponse.json({ error: `Error de Base de Datos: ${shotError.message}` }, { status: 500 });
    }
    
    // Si no encontró el shot
    if (!shot) {
      return NextResponse.json({ error: `Shot ID ${numericShotId} no encontrado` }, { status: 404 });
    }

    // Verificar dueño
    if (shot.user_id !== user.id) {
      return NextResponse.json({ error: 'No eres el dueño de este shot' }, { status: 403 });
    }

        const uocUsername = (shot.profiles as any)?.username || null;

    // 4. La Transferencia
    const { error: updateError } = await supabaseAdmin
      .from('shots')
      .update({
        user_id: GHOST_USER_ID,
        uoc_id: shot.user_id,
        uoc_username: uocUsername
      })
      .eq('id', numericShotId); // ¡Aquí también!

    if (updateError) {
      console.error("💥 Error en transferencia:", updateError);
      return NextResponse.json({ error: `Error al transferir: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    if (err.message.includes('Service Role Key')) {
        return NextResponse.json({ error: 'Error de configuración: Falta Service Role Key.' }, { status: 500 });
    }
    return NextResponse.json({ error: `Error interno: ${err.message}` }, { status: 500 });
  }
}