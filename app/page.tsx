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

interface Shot { 
  id: string; 
  title?: string; 
  image_url: string; 
  author?: string; 
  likes_count?: number; 
  views_count?: number; 
  user_id?: string; 
  username?: string; 
  uoc_id?: string; 
  uoc_username?: string; 
  category_id?: number | null; // 🔧 Acepta null de Supabase
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

  // 🆕 NUEVO: Estado del filtro de categoría
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // 🆕 NUEVO: Escuchar evento del Footer
  useEffect(() => {
    const handleCategoryFilter = (e: any) => {
      const newFilter = e.detail || "";
      setCategoryFilter(newFilter);
    };
    window.addEventListener('category-filter-changed', handleCategoryFilter);
    return () => window.removeEventListener('category-filter-changed', handleCategoryFilter);
  }, []);

  // 🆕 NUEVO: Cuando cambia el filtro, resetear y re-fetch
  useEffect(() => {
    setShots([]);
    setPage(0);
    setHasMore(true);
    fetchApprovedShots(0, categoryFilter);
  }, [categoryFilter]);

  const fetchApprovedShots = useCallback(async (pageNum: number, catFilter?: string) => {
    if (isFetchingRef.current) return; 
    isFetchingRef.current = true;
    setLoading(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    let query = supabase
      .from('shots')
      .select(`
        id, title, image_url, author, likes_count, views_count, user_id, uoc_id, uoc_username, 
        profiles!shots_user_id_fkey ( username )
      `)
      .eq('is_approved', true);

    // 🆕 NUEVO: Aplicar filtro de categoría si existe
    if (catFilter) {
      query = query.eq('category_id', parseInt(catFilter));
    }

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, error } = await query;

    if (!error && data) {
      const processed = data.map((s: any) => ({ ...s, id: String(s.id), username: s.profiles?.username || "Anónimo" }));
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
      const { error } = await supabase
        .from('shots')
        .update({ is_approved: false, disapproval_reason: reason })
        .eq('id', shotId);
      if (!error) {
        setShots(prev => prev.filter(s => s.id !== shotId));
      } else {
        alert("Error al desaprobar el shot.");
      }
    } catch (err) {
      console.error("Error desaprobando:", err);
    } finally {
      setDisapprovingId(null);
      setConfirmDisapproveId(null);
    }
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchApprovedShots(nextPage, categoryFilter);
    }
  }, [page, hasMore, fetchApprovedShots, categoryFilter]);
  
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  return (
    <section className="flex w-full">
      <div className="flex-1 p-2 overflow-y-auto">
        
        {/* 🆕 NUEVO: Indicador de filtro activo */}
        {categoryFilter && (
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-xs text-gray-400">Filtrando por:</span>
            <span className="px-3 py-1 bg-yellow-500 text-black rounded-full text-xs font-bold">
              {categoryFilter}
            </span>
            <button 
              onClick={() => {
                setCategoryFilter("");
                window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: "" }));
              }}
              className="text-xs text-gray-500 hover:text-white transition"
            >
              ✕ Quitar filtro
            </button>
          </div>
        )}
        
        {loading && shots.length === 0 && <p className="text-center py-8 text-gray-400 animate-pulse">Cargando Ateneo...</p>}

        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
          {shots.map(shot => (
            <ShotCard 
              key={shot.id} 
              shot={shot} 
              isSaved={savedShots.includes(String(shot.id))} 
              isSaving={savingId === shot.id} 
              onSave={() => handleSave(shot.id)}
              isLiked={likedShots.includes(String(shot.id))}
              likesCount={shot.likes_count || 0}
              isLiking={likingId === shot.id}
              onLike={() => handleLike(shot.id)}
              viewsCount={shot.views_count || 0}
              user={user}
              onClick={() => setSelectedShot(shot)}
              isAdmin={isAdmin}
              onDisapprove={handleDisapproveRequest}
              isDisapproving={disapprovingId === shot.id}
            />
          ))}
        </div>

        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500 animate-pulse">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin del muro.</div>}
        {!hasMore && !loading && shots.length === 0 && categoryFilter && <div className="text-center py-8 text-gray-600 text-sm">No hay shots en esta categoría.</div>}

        <div ref={sentinelRef} className="h-1 w-full"></div>
      </div>

            {/* MODAL DE DETALLE CON MODO CURADURÍA */}
      {selectedShot && ( 
        <ShotDetailModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          isSaved={savedShots.includes(selectedShot.id)} 
          isSaving={savingId === selectedShot.id} 
          onSave={() => handleSave(selectedShot.id)} 
          user={user} 
          isLiked={likedShots.includes(selectedShot.id)} 
          likesCount={selectedShot.likes_count || 0} 
          onLike={() => handleLike(selectedShot.id)} 
          viewsCount={selectedShot.views_count || 0} 
          onView={handleView}
          onOpenCollection={(uocId) => {
            setSelectedShot(null);
            setSelectedCollectionId(uocId);
          }}
          // 🆕 PROPS DE CURADURÍA (ADMIN)
          onShotUpdated={(updatedShot) => {
            setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
          }}
          onDisapprove={(shotId) => {
            handleDisapproveRequest(shotId);
            setSelectedShot(null);
          }}
        /> 
      )}

      {selectedProfileId && ( 
        <UserProfileOverlay 
          userId={selectedProfileId} 
          onClose={() => setSelectedProfileId(null)} 
        /> 
      )}

      {selectedCollectionId && ( 
        <PublicCollectionOverlay 
          userId={selectedCollectionId} 
          onClose={() => setSelectedCollectionId(null)} 
        /> 
      )}

      {confirmDisapproveId && (
        <DisapproveShotModal 
          shotId={confirmDisapproveId}
          shotTitle={shots.find(s => s.id === confirmDisapproveId)?.title}
          onConfirm={executeDisapprove}
          onClose={() => setConfirmDisapproveId(null)}
          loading={!!disapprovingId}
        />
      )}

    </section>
  );
}