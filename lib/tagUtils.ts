import { supabase } from "./supabaseClient";
import { FACET_SLUGS } from "./facetConstants"; // 🆕 IMPORT DE CONSTANTES

export interface Tag {
  id?: number;
  name: string;
  slug: string;
  facet: string;
}

const generateSlug = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const getOrCreateTag = async (tag: Tag): Promise<number | null> => {
  const { data: existing } = await supabase.from('tags').select('id').eq('slug', tag.slug).maybeSingle();
  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from('tags')
    .insert({ name: tag.name, slug: tag.slug, facet: tag.facet })
    .select('id')
    .maybeSingle();
  
  if (error) {
    console.warn("⚠️ Fallback: Re-buscando tag tras error:", error.message || error);
    const { data: retryExisting } = await supabase.from('tags').select('id').eq('slug', tag.slug).maybeSingle();
    return retryExisting?.id || null;
  }
  
  return inserted?.id || null;
};

export const saveShotTags = async (shotId: string, tags: Tag[]) => {
  if (!tags || tags.length === 0) return;
  const tagIds: number[] = [];
  for (const t of tags) {
    const id = await getOrCreateTag(t);
    if (id) tagIds.push(id);
  }
  if (tagIds.length === 0) return;
  await supabase.from('shot_tags').delete().eq('shot_id', shotId);
  const links = tagIds.map(tag_id => ({ shot_id: parseInt(shotId), tag_id }));
  const { error: linkError } = await supabase.from('shot_tags').insert(links);
  if (linkError) console.error("Error vinculando tags al shot", linkError);
};

export const autoTagAuthor = async (authorName: string, shotId: string) => {
  if (!authorName || !authorName.trim()) return;
  const slug = generateSlug(authorName);
  if (slug.length < 2) return;
  const { data: isBlacklisted } = await supabase.from('blacklisted_tags').select('slug').eq('slug', slug).maybeSingle();
  if (isBlacklisted) return;
  
  // 🛠️ CAMBIO: Usando constante segura FACET_SLUGS.AUTHOR
  const tagId = await getOrCreateTag({ name: authorName.trim(), slug, facet: FACET_SLUGS.AUTHOR });
  if (!tagId) return;
  const { error: linkError } = await supabase.from('shot_tags').insert({ shot_id: parseInt(shotId), tag_id: tagId });
  if (linkError && linkError.code !== '23505') console.error("Error vinculando autor:", linkError);
};

export const autoTagBoard = async (boardName: string) => {
  if (!boardName || !boardName.trim()) return;
  const slug = generateSlug(boardName);
  if (slug.length < 2) return;
  const { data: isBlacklisted } = await supabase.from('blacklisted_tags').select('slug').eq('slug', slug).maybeSingle();
  if (isBlacklisted) return;
  
  // 🛠️ CAMBIO: Usando constante segura FACET_SLUGS.COLLECTION
  await getOrCreateTag({ name: boardName.trim(), slug, facet: FACET_SLUGS.COLLECTION });
};

// 🆕 VINCULACIÓN MASIVA A OBRA
export const batchLinkObra = async (shotIds: string[], obraName: string) => {
  if (!obraName.trim() || shotIds.length === 0) return false;
  
  const slug = generateSlug(obraName);
  const { data: isBlacklisted } = await supabase.from('blacklisted_tags').select('slug').eq('slug', slug).maybeSingle();
  if (isBlacklisted) return false;

  // 🛠️ CAMBIO: Usando constante segura FACET_SLUGS.OBRA
  const tagId = await getOrCreateTag({ name: obraName.trim(), slug, facet: FACET_SLUGS.OBRA });
  if (!tagId) return false;

  const inserts = shotIds.map(shot_id => ({ shot_id: parseInt(shot_id), tag_id: tagId }));
  const { error } = await supabase.from('shot_tags').insert(inserts);
  
  if (error && error.code !== '23505') { // Ignorar duplicados
    console.error("Error vinculando obra:", error);
    return false;
  }
  return true;
};
// ... (imports y otras funciones arriba)

// 🆕 AUTO-TAG PARA OBRA
export const autoTagObra = async (workName: string, shotId: string) => {
  if (!workName || !workName.trim()) return;
  const slug = generateSlug(workName);
  if (slug.length < 2) return;
  
  const { data: isBlacklisted } = await supabase.from('blacklisted_tags').select('slug').eq('slug', slug).maybeSingle();
  if (isBlacklisted) return;
  
  // Usamos FACET_SLUGS.OBRA para asegurar la conexión correcta
  const tagId = await getOrCreateTag({ name: workName.trim(), slug, facet: FACET_SLUGS.OBRA });
  if (!tagId) return;
  
  const { error: linkError } = await supabase.from('shot_tags').insert({ shot_id: parseInt(shotId), tag_id: tagId });
  if (linkError && linkError.code !== '23505') console.error("Error vinculando obra:", linkError);
};