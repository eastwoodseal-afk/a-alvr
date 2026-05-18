"use client";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ShotCard from "./ShotCard";
import MyShotDetailModal from "./MyShotDetailModal";
import ShareStudioModal from "./ShareStudioModal";

interface Shot { 
  id: string; title?: string; image_url: string; author?: string; likes_count?: number; views_count?: number; user_id?: string; username?: string; is_approved?: boolean; description?: string;
}

const BATCH_SIZE = 20;

interface Props {
  userId: string;
  onClose: () => void;
}

export default function MyShotsOverlay({ userId, onClose }: Props) {
  const { user } = useAuth();
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
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchMyShots = useCallback(async (pageNum: number) => {
    if (isFetchingRef.current || !userId) return;
    isFetchingRef.current = true;
    setLoading(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from('shots')
        .select(`id, title, description, image_url, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey ( username )`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (!error && data) {
        const processed = data.map((s: any) => ({ ...s, id: s.id.toString(), username: s.profiles?.username || "Anónimo" }));
        if (pageNum === 0) setShots(processed);
        else setShots(prev => [...prev, ...processed]);
        if (data.length < BATCH_SIZE) setHasMore(false);
      } else { setHasMore(false); }
    } catch (err) { console.error("Error:", err); setHasMore(false); } 
    finally { isFetchingRef.current = false; setLoading(false); }
  }, [userId]);

  useEffect(() => { if (userId) fetchMyShots(0); }, [userId]);

  useEffect(() => {
    async function fetchUserInteractions() {
      if (!userId) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", userId),
        supabase.from("likes").select("shot_id").eq("user_id", userId)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => String(s.shot_id)));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => String(l.shot_id)));
    }
    fetchUserInteractions();
  }, [userId]);

  const handleSave = async (shotId: string) => { if (!user?.id) return; setSavingId(shotId); await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId }); setSavedShots(prev => [...prev, shotId]); setSavingId(null); };
  const handleLike = async (shotId: string) => { if (!user?.id) return; const alreadyLiked = likedShots.includes(shotId); setLikingId(shotId); setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s)); if (alreadyLiked) { setLikedShots(prev => prev.filter(id => id !== shotId)); await supabase.from("likes").delete().match({ user_id: user.id, shot_id: shotId }); } else { setLikedShots(prev => [...prev, shotId]); await supabase.from("likes").insert({ user_id: user.id, shot_id: shotId }); } setLikingId(null); };

  const loadMore = useCallback(() => { if (hasMore && !isFetchingRef.current) { const nextPage = page + 1; setPage(nextPage); fetchMyShots(nextPage); } }, [page, hasMore, fetchMyShots]);
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  const handleUpdateShot = (updatedShot: Shot) => {
    setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
  };

  // NUEVA LÓGICA: Renuncia del Shot (Eliminación visual instantánea)
  const handleRelinquishShot = (shotId: string) => {
    setShots(prev => prev.filter(s => s.id !== shotId));
  };

  return (
    <div className="fixed top-14 right-0 bottom-0 left-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* HEADER INTERNO ACTUALIZADO */}
      <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-yellow-500 bg-[#0a1833]">
        
        {/* Botón Regresar Gris/Flecha Amarilla */}
        <button 
          className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition mr-2" 
          onClick={onClose} 
          aria-label="Regresar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <h2 className="text-base font-semibold text-gray-200">
          Mis Shots <span className="text-gray-500 mx-1">|</span> Mi Estudio
        </h2>
        
        {/* Botón Compartir Estudio */}
        <button 
          onClick={() => setShowShareModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow transition ml-2"
          title="Compartir mi Estudio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
          </svg>
        </button>
      </div>

      {/* CONTENIDO GRID */}
      <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar p-2">
        {shots.length === 0 && loading && <div className="text-center py-8 text-gray-400 text-xs animate-pulse">Cargando tu estudio...</div>}
        {shots.length === 0 && !loading && <div className="text-center py-8 text-gray-600 text-xs">Tu estudio está vacío.</div>}
        
        {shots.length > 0 && (
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
                viewsCount={0} 
                user={user}
                onClick={() => setSelectedShot(shot)}
                hideViews={true} 
              />
            ))}
          </div>
        )}

        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500 text-xs animate-pulse">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Estos son todos tus shots.</div>}
        <div ref={sentinelRef} className="h-1 w-full"></div>
      </div>

      {/* MODALES */}
      {selectedShot && ( 
        <MyShotDetailModal 
          shot={selectedShot} 
          user={user}
          onClose={() => setSelectedShot(null)} 
          onUpdate={handleUpdateShot}
          onRelinquish={handleRelinquishShot} // NUEVO: Conexión de la renuncia
        /> 
      )}

      <ShareStudioModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}