export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta Service Role Key.");
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { code, accessToken } = await req.json();
    if (!code || !accessToken) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // 1. VERIFICAR IDENTIDAD DEL USUARIO QUE ACEPTA
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 2. BUSCAR LA INVITACIÓN
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('studio_invites')
      .select('owner_id, used')
      .eq('code', code)
      .single();

    if (inviteError || !invite) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    if (invite.used) return NextResponse.json({ error: 'Invitación ya utilizada' }, { status: 400 });
    if (invite.owner_id === user.id) return NextResponse.json({ error: 'No puedes usar tu propia invitación' }, { status: 400 });

    // 3. OTORGAR ACCESO (Usando Admin para saltar RLS)
    const { error: shareError } = await supabaseAdmin.from('studio_shares').insert({
      owner_id: invite.owner_id,
      viewer_id: user.id
    });

    if (shareError) {
      // 23505 = Ya tenía acceso (no es un error real)
      if (shareError.code !== '23505') {
        throw shareError;
      }
    }

    // 4. MARCAR INVITACIÓN COMO USADA
    const { error: updateError } = await supabaseAdmin
      .from('studio_invites')
      .update({ used: true })
      .eq('code', code);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("💥 Error en accept-invite:", err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}