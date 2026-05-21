"use client";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ShotCard from "../components/ShotCard";
import ShotDetailModal from "../components/ShotDetailModal";
import UserProfileOverlay from "../components/UserProfileOverlay";
import PublicCollectionOverlay from "../components/PublicCollectionOverlay";
import DisapproveShotModal from "../components/DisapproveShotModal";
import { Tag } from "../lib/tagUtils";


interface Shot { 
  id: string; 
  title?: string; 
  description?: string; 
  image_url: string; 
  author?: string; 
  likes_count?: number; 
  views_count?: number; 
  user_id?: string; 
  username?: string; 
  uoc_id?: string; 
  uoc_username?: string; 
  category_id?: number | null; 
  category_name?: string; 
  category_slug?: string; 
  source_url?: string;    
  tags?: Tag[]; 
}

const BATCH_SIZE = 20;

const shuffleArray = (array: Shot[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Home() {
  const { session, user } = useAuth(); 
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const isFetchingRef = useRef(false);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);
  
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [confirmDisapproveId, setConfirmDisapproveId] = useState<string | null>(null);
  const [disapprovingId, setDisapprovingId] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [isSingleColumn, setIsSingleColumn] = useState(false);

  useEffect(() => {
    const handleGridView = (e: any) => setIsSingleColumn(e.detail || false);
    window.addEventListener('grid-view-changed', handleGridView);
    return () => window.removeEventListener('grid-view-changed', handleGridView);
  }, []);

  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [tagFilterName, setTagFilterName] = useState<string>("");

  useEffect(() => {
    const handleCategoryFilter = (e: any) => setCategoryFilter(e.detail || "");
    window.addEventListener('category-filter-changed', handleCategoryFilter);
    return () => window.removeEventListener('category-filter-changed', handleCategoryFilter);
  }, []);

  useEffect(() => {
    const handleTagFilter = (e: any) => {
      setTagFilter(e.detail?.id || "");
      setTagFilterName(e.detail?.name || "");
    };
    window.addEventListener('tag-filter-changed', handleTagFilter);
    return () => window.removeEventListener('tag-filter-changed', handleTagFilter);
  }, []);

  useEffect(() => {
    setShots([]);
    setPage(0);
    setHasMore(true);
    fetchApprovedShots(0, categoryFilter, tagFilter);
  }, [categoryFilter, tagFilter]);

  const fetchApprovedShots = useCallback(async (pageNum: number, catFilter?: string, tagFilterId?: string) => {
    if (isFetchingRef.current) return; 
    isFetchingRef.current = true;
    setLoading(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    const selectQuery = tagFilterId 
      ? `id, title, description, image_url, author, likes_count, views_count, user_id, uoc_id, uoc_username, category_id, source_url, profiles!shots_user_id_fkey ( username ), categories ( name, slug ), shot_tags!inner ( tags ( id, name, slug, facet ) )`
      : `id, title, description, image_url, author, likes_count, views_count, user_id, uoc_id, uoc_username, category_id, source_url, profiles!shots_user_id_fkey ( username ), categories ( name, slug ), shot_tags ( tags ( id, name, slug, facet ) )`;

    let query = supabase
      .from('shots')
      .select(selectQuery)
      .eq('is_approved', true);

    if (catFilter) {
      query = query.eq('category_id', parseInt(catFilter));
    }

    if (tagFilterId) {
      query = query.eq('shot_tags.tag_id', parseInt(tagFilterId));
    }

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, error } = await query;

    if (!error && data) {
      const processed = data.map((s: any) => ({
        ...s,
        id: String(s.id),
        username: s.profiles?.username || "Anónimo",
        tags: s.shot_tags?.map((st: any) => st.tags).filter(Boolean) || [],
        category_name: s.categories?.name || null,
        category_slug: s.categories?.slug || null,
        source_url: s.source_url || null
      }));
      
      const shuffled = shuffleArray(processed);
      
      if (pageNum === 0) setShots(shuffled);
      else setShots(prev => [...prev, ...shuffled]);
      if (data.length < BATCH_SIZE) setHasMore(false);
    } else {
      setHasMore(false);
    }
    
    isFetchingRef.current = false;
    setLoading(false);
  }, []);

  useEffect(() => {
    async function fetchUserInteractions() {
      if (!user?.id) { setSavedShots([]); setLikedShots([]); return; }
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", user.id),
        supabase.from("likes").select("shot_id").eq("user_id", user.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => String(s.shot_id)));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => String(l.shot_id)));
    }
    fetchUserInteractions();
  }, [user?.id]);

  const handleSave = async (shotId: string) => {
    if (!user?.id) return;
    setSavingId(shotId);
    await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId });
    setSavedShots(prev => [...prev, shotId]);
    setSavingId(null);
  };

  const handleLike = async (shotId: string) => {
    if (!user?.id) return;
    const alreadyLiked = likedShots.includes(shotId);
    setLikingId(shotId);
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s));
    if (alreadyLiked) {
      setLikedShots(prev => prev.filter(id => id !== shotId));
      await supabase.from("likes").delete().match({ user_id: user.id, shot_id: shotId });
    } else {
      setLikedShots(prev => [...prev, shotId]);
      await supabase.from("likes").insert({ user_id: user.id, shot_id: shotId });
    }
    setLikingId(null);
  };

  const handleView = useCallback(async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s));
  }, []);

  const handleDisapproveRequest = (shotId: string) => { 
    if (!isAdmin) return; 
    setConfirmDisapproveId(shotId); 
  };

  const executeDisapprove = async (shotId: string, reason: string) => {
    setDisapprovingId(shotId);
    try {
      const { error } = await supabase.from('shots').update({ is_approved: false, disapproval_reason: reason }).eq('id', shotId);
      if (!error) {
        setShots(prev => prev.filter(s => s.id !== shotId));
      } else { alert("Error al desaprobar el shot."); }
    } catch (err) { console.error("Error desaprobando:", err); } 
    finally { setDisapprovingId(null); setConfirmDisapproveId(null); }
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchApprovedShots(nextPage, categoryFilter, tagFilter);
    }
  }, [page, hasMore, fetchApprovedShots, categoryFilter, tagFilter]);
  
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openShotId = params.get('open_shot');
    
    if (openShotId) {
      const existingShot = shots.find(s => s.id === openShotId);
      if (existingShot) {
        setSelectedShot(existingShot);
      } else {
        supabase.from('shots').select(`id, title, description, image_url, author, likes_count, views_count, user_id, uoc_id, uoc_username, category_id, source_url, profiles!shots_user_id_fkey ( username ), categories ( name, slug ), shot_tags ( tags ( id, name, slug, facet ) )`).eq('id', openShotId).single().then(({ data }) => {
          if (data) {
            const d = data as any;
            const processed = { ...d, id: String(d.id), username: d.profiles?.username || "Anónimo", tags: d.shot_tags?.map((st: any) => st.tags).filter(Boolean) || [], category_name: d.categories?.name || null, category_slug: d.categories?.slug || null, source_url: d.source_url || null };
            setSelectedShot(processed);
          }
        });
      }
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <section className="flex w-full">
      <div className="flex-1 p-2 overflow-y-auto">
        
        {(categoryFilter || tagFilter) && (
          <div className="mb-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Filtrando por:</span>
            
            {categoryFilter && (
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                Categoría
                <button onClick={() => { setCategoryFilter(""); window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: "" })); }} className="ml-1 hover:text-gray-200">✕</button>
              </span>
            )}

            {tagFilter && (
              <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                Tag: {tagFilterName}
                <button onClick={() => { setTagFilter(""); setTagFilterName(""); window.dispatchEvent(new CustomEvent('tag-filter-changed', { detail: { id: "", name: "" } })); }} className="ml-1 hover:text-gray-200">✕</button>
              </span>
            )}

            <button onClick={() => { 
              setCategoryFilter(""); setTagFilter(""); setTagFilterName("");
              window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: "" }));
              window.dispatchEvent(new CustomEvent('tag-filter-changed', { detail: { id: "", name: "" } }));
            }} className="text-xs text-gray-500 hover:text-white transition">Quitar todo</button>
          </div>
        )}
        
        {loading && shots.length === 0 && <p className="text-center py-8 text-gray-400 animate-pulse">Cargando Ateneo...</p>}

        <div className={`${isSingleColumn ? 'columns-1 max-w-xl mx-auto' : 'columns-2 md:columns-3 lg:columns-4 xl:columns-6'} gap-2 w-full`}>
          {shots.map(shot => (
            <ShotCard 
              key={shot.id} shot={shot} isSaved={savedShots.includes(String(shot.id))} isSaving={savingId === shot.id} onSave={() => handleSave(shot.id)}
              isLiked={likedShots.includes(String(shot.id))} likesCount={shot.likes_count || 0} isLiking={likingId === shot.id} onLike={() => handleLike(shot.id)}
              viewsCount={shot.views_count || 0} user={user} onClick={() => setSelectedShot(shot)}
              isAdmin={isAdmin} onDisapprove={handleDisapproveRequest} isDisapproving={disapprovingId === shot.id}
            />
          ))}
        </div>

        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500 animate-pulse">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin del muro.</div>}
        {!hasMore && !loading && shots.length === 0 && (categoryFilter || tagFilter) && <div className="text-center py-8 text-gray-600 text-sm">No hay shots para esta combinación de filtros.</div>}

        <div ref={sentinelRef} className="h-1 w-full"></div>
      </div>

     

{selectedShot && ( 
  <ShotDetailModal 
    shot={selectedShot} 
    onClose={() => setSelectedShot(null)} 
    user={user}
    onLikeChange={(newIsLiked, newCount) => {
      // Sincroniza el muro principal
      setLikedShots(prev => newIsLiked ? [...prev, selectedShot.id] : prev.filter(id => id !== selectedShot.id));
      setShots(prev => prev.map(s => s.id === selectedShot.id ? { ...s, likes_count: newCount } : s));
    }}
    onSaveChange={(newIsSaved) => {
      if(newIsSaved) setSavedShots(prev => [...prev, selectedShot.id]);
    }}
    onOpenCollection={(uocId) => { setSelectedShot(null); setSelectedCollectionId(uocId); }}
    onShotUpdated={(updatedShot) => setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s))}
    onDisapprove={(shotId) => { handleDisapproveRequest(shotId); setSelectedShot(null); }}
  /> 
)}

      {selectedProfileId && ( <UserProfileOverlay userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} /> )}
      {selectedCollectionId && ( <PublicCollectionOverlay userId={selectedCollectionId} onClose={() => setSelectedCollectionId(null)} /> )}
      {confirmDisapproveId && ( <DisapproveShotModal shotId={confirmDisapproveId} shotTitle={shots.find(s => s.id === confirmDisapproveId)?.title} onConfirm={executeDisapprove} onClose={() => setConfirmDisapproveId(null)} loading={!!disapprovingId} /> )}
    </section>
  );
}
