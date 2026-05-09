"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import MasonryGrid from "../components/MasonryGrid";
import ShotDetailModal from "../components/ShotDetailModal";
import UserProfileOverlay from "../components/UserProfileOverlay";
import ConfirmModal from "../components/ConfirmModal";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

const BATCH_SIZE = 20;

interface Shot {
  id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number;
}

export default function HomeView() {
  const { user } = useAuth(); 
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [confirmDisapproveId, setConfirmDisapproveId] = useState<string | null>(null);
  const [disapprovingId, setDisapprovingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const gridColumnsClass = "columns-2 md:columns-3 lg:columns-4 xl:columns-6";

  // NUEVO: Candado de seguridad y Freno de Emergencia
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchShots = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isFetchingRef.current) return; 
    
    isFetchingRef.current = true;
    setLoading(true);

    // NUEVO: Creamos un nuevo freno para esta petición
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
        const start = pageNum * BATCH_SIZE; 
        const end = start + BATCH_SIZE - 1;
        
        let query = supabase.from("shots").select("id, image_url, title, description, user_id, author, likes_count, views_count").eq("is_approved", true);
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, end);
        
        // NUEVO: Le pasamos el freno a Supabase. Si se acciona, la petición se cancela.
        query = query.abortSignal(signal);
        
        const { data, error } = await query;
        
        // Si fue cancelada a propósito, salimos sin hacer nada
        if (error && error.name === 'AbortError') {
          return;
        }

        if (error) throw error;
        if (data) {
          let newShots = data.map(s => ({...s, id: s.id.toString()}));
          if (!user && newShots.length > 0) newShots.sort(() => Math.random() - 0.5);
          
          const userIds = [...new Set(newShots.map((shot) => shot.user_id).filter(Boolean))];
          let profilesMap: Record<string, string> = {};
          if (userIds.length) {
            const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
            if (profiles) profilesMap = profiles.reduce((acc: Record<string, string>, p) => { acc[p.id] = p.username || "sin Creador"; return acc; }, {} as Record<string, string>);
          }
          const processedShots = newShots.map((s) => ({ ...s, views_count: s.views_count || 0, username: profilesMap[s.user_id] || "sin Creador" }));
          
          if (isRefresh || pageNum === 0) setShots(processedShots);
          else setShots((prev) => [...prev, ...processedShots]);
          if (data.length < BATCH_SIZE) setHasMore(false);
        } else setHasMore(false);
    } catch (err: any) { 
      if (err.name === 'AbortError') return; // Cancelada, no hay problema
      console.error(err); 
      setHasMore(false); 
    } finally { 
      isFetchingRef.current = false; // Liberamos el candado
      setLoading(false); // LIBERAMOS LA UI (Esto evita el "Cargando..." eterno)
    }
  }, [user?.id]);

  useEffect(() => { 
    fetchShots(0, true); 
    async function fetchUserInteractions() {
      if (!user?.id) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", user.id),
        supabase.from("likes").select("shot_id").eq("user_id", user.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
    }
    fetchUserInteractions();
  }, [user?.id]);

  // LEY 3.3: FRENO DE EMERGENCIA. Si el usuario se va a otra pestaña 
  // y hay una petición en curso, la cancelamos para que la UI no se quede trabada.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort(); // ¡PISAR EL FRENO!
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleSave = useCallback(async (shotId: string) => { 
    if (!user) return; 
    setSavingId(shotId); 
    await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId }); 
    setSavedShots(prev => [...prev, shotId]); 
    setSavingId(null); 
  }, [user?.id]);

  const handleLike = useCallback(async (shotId: string) => { 
    if (!user) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikingId(shotId); 
    setShots(prev => prev.map(s => { if(s.id === shotId) return { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) }; return s; })); 
    if (alreadyLiked) { 
      setLikedShots(prev => prev.filter(id => id !== shotId)); 
      await supabase.from("likes").delete().match({ user_id: user.id, shot_id: shotId }); 
    } else { 
      setLikedShots(prev => [...prev, shotId]); 
      await supabase.from("likes").insert({ user_id: user.id, shot_id: shotId }); 
    } 
    setLikingId(null); 
  }, [user?.id, likedShots]);
  
  const handleView = useCallback(async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    setShots(prev => prev.map(s => { if(s.id === shotId) return { ...s, views_count: (s.views_count || 0) + 1 }; return s; }));
  }, []);

  const handleDisapproveRequest = (shotId: string) => { if (!isAdmin) return; setConfirmDisapproveId(shotId); };
  const executeDisapprove = async () => { if (!confirmDisapproveId) return; setDisapprovingId(confirmDisapproveId); try { const { error } = await supabase.from('shots').update({ is_approved: false }).eq('id', confirmDisapproveId); if (!error) setShots(prev => prev.filter(s => s.id !== confirmDisapproveId)); } catch (err) {} finally { setDisapprovingId(null); setConfirmDisapproveId(null); } };
  
  const loadMore = useCallback(() => { 
    if (hasMore && !loading) { 
      const nextPage = page + 1; 
      setPage(nextPage); 
      fetchShots(nextPage); 
    } 
  }, [page, hasMore, loading, fetchShots]);
  
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  return (
    <section className="flex w-full">
      <div className="flex-1 p-2 overflow-y-auto">
        {loading && shots.length === 0 && <div className="text-center py-8 text-gray-400">Cargando Ateneo...</div>}
        {shots.length > 0 && ( <MasonryGrid shots={shots} setSelectedShot={setSelectedShot} savedShots={savedShots} savingId={savingId} onSaveShot={handleSave} user={user} likedShots={likedShots} likingId={likingId} onLike={handleLike} columnsClass={gridColumnsClass} isAdmin={isAdmin} onDisapprove={handleDisapproveRequest} disapprovingId={disapprovingId}/> )}
        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin del Ateneo.</div>}

        <div ref={sentinelRef} className="h-1 w-full"></div>
      </div>

      {selectedShot && ( <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={savedShots.includes(selectedShot.id)} isSaving={savingId === selectedShot.id} onSave={() => handleSave(selectedShot.id)} user={user} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={handleView}/> )}
      {selectedProfileId && ( <UserProfileOverlay userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} /> )}
      <ConfirmModal open={!!confirmDisapproveId} onClose={() => setConfirmDisapproveId(null)} onConfirm={executeDisapprove} title="Desaprobar" message="¿Ocultar este shot?" confirmText="Sí" variant="danger"/>
    </section>
  );
}