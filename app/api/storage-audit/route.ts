export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const GHOST_USER_ID = '9e717b49-395c-48d2-add9-7a60ab9c7baf';

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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    // 2. OBTENER TODOS LOS SHOTS
   const { data: shots, error: dbError } = await supabaseAdmin
      .from('shots')
      .select('id, user_id, image_url, is_rejected, is_approved, title, author, created_at, likes_count, views_count, profiles!shots_user_id_fkey(username), saved_shots(user_id)')
    if (dbError) throw dbError;

    const dbUserIdFilename = new Map<string, any>();
    
    const formatShot = (s: any) => ({
      id: s.id,
      image_url: s.image_url,
      title: s.title,
      author: s.author,
      username: s.profiles?.username || "Borrado",
      created_at: s.created_at,
      likes_count: s.likes_count || 0,
      views_count: s.views_count || 0,
      saved_count: s.saved_shots?.length || 0,
      is_rejected: s.is_rejected,
      is_approved: s.is_approved
    });

    shots?.forEach(s => {
      try {
        const url = new URL(s.image_url);
        const pathParts = url.pathname.split('/');
        const userId = pathParts[6];
        const filename = pathParts[7];
        if (userId && filename) {
          dbUserIdFilename.set(`${userId}/${filename}`, formatShot(s));
        }
      } catch (e) {}
    });

    // 3. ESCANEAR BUCKET
    const { data: rootItems } = await supabaseAdmin.storage.from('shots').list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    
    const orphans: any[] = [];
    const bucketPaths = new Set<string>();
    let totalBucketFiles = 0;

    if (rootItems) {
      for (const item of rootItems) {
        const { data: files } = await supabaseAdmin.storage.from('shots').list(item.name, { limit: 1000 });
        if (files && files.length > 0) {
          for (const file of files) {
            if (!file.metadata) continue;
            totalBucketFiles++;
            const filePath = `${item.name}/${file.name}`;
            bucketPaths.add(filePath);
            if (!dbUserIdFilename.has(filePath)) {
              orphans.push({ path: filePath, url: supabaseAdmin.storage.from('shots').getPublicUrl(filePath).data.publicUrl, size: file.metadata?.size });
            }
          }
        }
      }
    }

    // 4. SOLO RECHAZADOS
    const rejectedShots = shots?.filter(s => s.is_rejected === true).map(formatShot) || [];

    // 5. GHOST SHOTS (Sin archivo físico)
    const ghostShots = shots?.filter(s => {
      try {
        const url = new URL(s.image_url);
        const pathParts = url.pathname.split('/');
        const userId = pathParts[6];
        const filename = pathParts[7];
        if (userId && filename) return !bucketPaths.has(`${userId}/${filename}`);
      } catch {}
      return false;
    }).map(formatShot) || [];

    // 6. ABANDONADOS (Ghost + Rechazado + No Aprobado)
    const abandonedShots = shots?.filter(s => 
      (s.user_id === GHOST_USER_ID || !s.user_id) && s.is_approved === false && s.is_rejected === true
    ).map(formatShot) || [];

    // 7. GHOST PENDIENTES (Ghost + No Aprobado + No Rechazado = El Limbo)
    const ghostPending = shots?.filter(s => 
      (s.user_id === GHOST_USER_ID || !s.user_id) && s.is_approved === false && s.is_rejected !== true
    ).map(formatShot) || [];

    // 8. URLS EXTERNAS (Fósiles)
    const supabaseDomain = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'supabase.co';
    const externalUrls = shots?.filter(s => {
      try {
        const url = new URL(s.image_url);
        return !url.hostname.includes(supabaseDomain);
      } catch {
        return true; 
      }
    }).map(formatShot) || [];

    // 🆕 9. TODOS LOS SHOTS DEL FANTASMA (Para cotejo)
    const allGhostShots = shots?.filter(s => s.user_id === GHOST_USER_ID).map(formatShot) || [];

    return NextResponse.json({ 
      orphans, 
      rejectedShots,
      ghostShots,
      abandonedShots,
      ghostPending,
      externalUrls,
      allGhostShots,
      totalBucketFiles
    });

  } catch (err: any) {
    console.error("💥 Error en storage-audit:", err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// DELETE (Sin cambios)
export async function DELETE(req: NextRequest) {
  try {
    const { accessToken, path, shotId } = await req.json();
    if (!accessToken || (!path && !shotId)) return NextResponse.json({ error: 'Faltan datos (path o shotId)' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    if (path) {
      const { error: deleteError } = await supabaseAdmin.storage.from('shots').remove([path]);
      if (deleteError) throw deleteError;
    }

    if (shotId) {
      const numericId = parseInt(shotId);
      if (isNaN(numericId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
      
      const { data: shotData } = await supabaseAdmin.from('shots').select('image_url').eq('id', numericId).single();
      if (shotData?.image_url) {
        try {
          const url = new URL(shotData.image_url);
          const pathParts = url.pathname.split('/');
          const storagePath = pathParts.slice(pathParts.indexOf('shots') + 1).join('/');
          if (storagePath) await supabaseAdmin.storage.from('shots').remove([storagePath]);
        } catch (e) { console.warn("No se pudo borrar el archivo físico del shot eliminado."); }
      }

      const { error: dbError } = await supabaseAdmin.from('shots').delete().eq('id', numericId);
      if (dbError) throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al borrar' }, { status: 500 });
  }
}

// PATCH: ADOPTAR SHOT (Sin cambios)
export async function PATCH(req: NextRequest) {
  try {
    const { accessToken, shotId } = await req.json();
    if (!accessToken || !shotId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const { error: updateError } = await supabaseAdmin
      .from('shots')
      .update({ user_id: user.id })
      .eq('id', shotId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("💥 Error adoptando shot:", err);
    return NextResponse.json({ error: err.message || 'Error al adoptar' }, { status: 500 });
  }
}