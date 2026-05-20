import { supabase } from "./supabaseClient";

export interface Tag {
  id?: number;
  name: string;
  slug: string;
  facet: string;
}

export const saveShotTags = async (shotId: string, tags: Tag[]) => {
  if (!tags || tags.length === 0) return;

  // 1. UPSERT: Asegurar que todos los tags existan en la tabla "tags" y obtener sus IDs
  // Si es un tag libre nuevo, lo crea. Si ya existe (por el slug), solo obtiene el ID.
  const { data: upsertedTags, error: upsertError } = await supabase
    .from('tags')
    .upsert(tags.map(t => ({ name: t.name, slug: t.slug, facet: t.facet })), { onConflict: 'slug', ignoreDuplicates: false })
    .select('id');

  if (upsertError || !upsertedTags) {
    console.error("Error guardando tags", upsertError);
    return;
  }

  // 2. LIMPIEZA: Borrar los vínculos anteriores para este shot (evita duplicados si editamos)
  await supabase.from('shot_tags').delete().eq('shot_id', shotId);

  // 3. VÍNCULO: Conectar los IDs de los tags con el ID del shot
  const links = upsertedTags.map(t => ({ shot_id: parseInt(shotId), tag_id: t.id }));
  const { error: linkError } = await supabase.from('shot_tags').insert(links);
  
  if (linkError) console.error("Error vinculando tags al shot", linkError);
};