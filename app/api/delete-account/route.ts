export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto'; // Nativo de Node.js para el Hash

const GHOST_USER_ID = '9e717b49-395c-48d2-add9-7a60ab9c7baf'; // El Acervo

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta Service Role Key.");
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) return NextResponse.json({ error: 'Falta token' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // 1. VERIFICAR IDENTIDAD
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const userId = user.id;
    const userEmail = user.email;

    // 2. OBTENER USERNAME ACTUAL (Para el UOC)
    const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', userId).single();
    const currentUsername = profile?.username || "Anónimo";

    // 3. CALCULAR HASH SHA-256 (La Huella Fantasma)
    const emailHash = crypto.createHash('sha256').update(userEmail || '').digest('hex');

    // 4. MEGA-RENUNCIA: Transferir TODOS los shots al Fantasma
    const { error: shotsError } = await supabaseAdmin
      .from('shots')
      .update({ 
        user_id: GHOST_USER_ID, 
        uoc_id: userId, 
        uoc_username: currentUsername 
      })
      .eq('user_id', userId);
      
    if (shotsError) console.error("Error transferiendo shots:", shotsError);

    // 5. ANONIMIZAR PERFIL + GUARDAR HUELLA
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        active: false,
        email_hash: emailHash,
        username: "Usuario_Inactivo",
        avatar_url: null,
        followers_count: 0,
        following_count: 0
      })
      .eq('id', userId);

    if (profileError) console.error("Error anonimizando perfil:", profileError);

    // 6. BORRAR USUARIO DE AUTH (Libera el email)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("💥 Error crítico en delete-account:", err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}