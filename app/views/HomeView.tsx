"use client";
import React, { useEffect, useState, useCallback } from "react";
import MasonryGrid from "../components/MasonryGrid";
import ShotDetailModal from "../components/ShotDetailModal";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

const BATCH_SIZE = 20;

interface Shot {
  id: string; 
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
  likes_count?: number;
  views_count?: number;
}

export default function HomeView() {
  const { user, followingOnly } = useAuth(); // Obtenemos el estado del filtro
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);

  const fetchShots = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    // --- LÓGICA DE FETCH ROBUSTA ---
    
    // 1. Query base
    let query = supabase
      .from("shots")
      .select("id, image_url, title, description, user_id, author, likes_count, views_count")
      .eq("is_approved", true);

    // 2. Filtro "Mi Gente"
    if (followingOnly && user) {
        // Traer a quién sigo
        const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        
        // Si no sigo a nadie, muro vacío
        if (followingIds.length === 0) {
            setShots([]);
            setHasMore(false);
            setLoading(false);
            return;
        }
        
        // Aplicar filtro IN
        query = query.in('user_id', followingIds);
    }

    // 3. Ordenamiento (común para ambos modos)
    query = query.order('created_at', { ascending: false });

    // 4. Rango (Paginación)
    query = query.range(start, end);
    
    // 5. Ejecución
    const { data, error } = await query;

    if (error) { console.error("Error fetching:", error); setLoading(false); return; }

    if (data) {
      let newShots = data as any[];
      // Convertir ID a String (Regla de Oro)
      newShots = newShots.map(s => ({...s, id: s.id.toString()}));

      // Aleatorio SOLO para usuarios no logueados y sin filtro activo
      if (!user && !followingOnly && newShots.length > 0) {
         newShots = newShots.sort(() => Math.random() - 0.5);
      }

      // Mapeo de Usuarios
      const userIds = [...new Set(newShots.map((shot) => shot.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
        if (profiles) profilesMap = profiles.reduce((acc: { [key: string]: string }, profile: any) => { acc[profile.id] = profile.username || "sin Creador"; return acc; }, {});
      }

      const processedShots = newShots.map((shot) => ({ 
        ...shot, 
        views_count: shot.views_count || 0,
        username: profilesMap[shot.user_id] || "sin Creador" 
      }));

      if (isRefresh) setShots(processedShots);
      else setShots((prev) => [...prev, ...processedShots]);

      if (data.length < BATCH_SIZE) setHasMore(false);
    } else setHasMore(false);
    setLoading(false);
  }, [user, loading, followingOnly]); // Dependencias correctas

  // Efecto para recargar al cambiar usuario o filtro
  useEffect(() => {
    setShots([]); 
    setPage(0); 
    setHasMore(true);
    fetchShots(0, true);
    
    if (user) {
      supabase.from("likes").select("shot_id").eq("user_id", user.id).then(({ data }) => {
        if (data) setLikedShots(data.map((l: any) => l.shot_id.toString()));
      });
    }
  }, [user, followingOnly]); // Se activa cuando cambia user o followingOnly

  useEffect(() => {
    async function fetchSavedShots() {
      if (!user) return;
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id);
      if (data) setSavedShots(data.map((row: any) => row.shot_id.toString()));
    }
    fetchSavedShots();
  }, [user]);

  const handleSaveShot = async (shotId: string) => {
    if (!user) return;
    setSavingId(shotId);
    const { error } = await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId });
    if (!error) {
      setSavedShots(prev => [...prev, shotId]);
      const alreadyLiked = likedShots.includes(shotId);
      if (!alreadyLiked) {
        setLikedShots(prev => [...prev, shotId]);
        setShots(prev => prev.map(s => { if(s.id === shotId) return { ...s, likes_count: (s.likes_count || 0) + 1 }; return s; }));
        supabase.from("likes").insert({ user_id: user.id, shot_id: shotId }).then();
      }
    }
    setSavingId(null);
  };

  const handleLike = async (shotId: string) => {
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
  };

  const handleView = useCallback((shotId: string) => {
    setShots(prev => prev.map(s => { if(s.id === shotId) return { ...s, views_count: (s.views_count || 0) + 1 }; return s; }));
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) { const nextPage = page + 1; setPage(nextPage); fetchShots(nextPage); }
  }, [page, hasMore, loading, fetchShots]);
  useInfiniteScroll(loadMore, loading);

  useEffect(() => {
    const handleCloseModals = () => setSelectedShot(null);
    window.addEventListener('close-modals', handleCloseModals);
    return () => window.removeEventListener('close-modals', handleCloseModals);
  }, []);

  useEffect(() => {
    const handleUnsaveEvent = (e: CustomEvent) => {
      const unsavedId = e.detail;
      setSavedShots(prev => prev.filter(id => id !== unsavedId));
    };
    window.addEventListener('shot-unsaved', handleUnsaveEvent as EventListener);
    return () => window.removeEventListener('shot-unsaved', handleUnsaveEvent as EventListener);
  }, []);

  return (
    <section className="p-2">
      {/* Indicador Visual del Filtro */}
      {followingOnly && (
         <div className="text-center text-yellow-400 text-xs font-bold py-2 bg-gray-900/50 border-b border-yellow-500/30 mb-2">
            Mostrando shots de personas que sigues
         </div>
      )}

      {shots.length === 0 && loading && ( <div className="text-center text-gray-500 py-8">Cargando experiencia...</div> )}
      
      {!loading && shots.length === 0 && (
         <div className="text-center text-gray-500 py-8">
            {followingOnly ? "Aún no sigues a nadie o no tienen shots." : "No hay shots para mostrar."}
         </div>
      )}

      {shots.length > 0 && (
        <MasonryGrid 
          shots={shots} 
          setSelectedShot={setSelectedShot} 
          savedShots={savedShots}
          savingId={savingId}
          onSaveShot={handleSaveShot}
          user={user}
          likedShots={likedShots}
          likingId={likingId}
          onLike={handleLike}
        />
      )}
      
      {loading && shots.length > 0 && ( <div className="text-center py-4 text-gray-500">Descubriendo más shots...</div> )}
      {!hasMore && !loading && shots.length > 0 && ( <div className="text-center py-4 text-gray-600 text-sm">Has llegado al fondo.</div> )}

      {selectedShot && (
        <ShotDetailModal 
          shot={shots.find(s => s.id === selectedShot.id) || selectedShot}
          onClose={() => setSelectedShot(null)}
          isSaved={savedShots.includes(selectedShot.id)}
          isSaving={savingId === selectedShot.id}
          onSave={() => handleSaveShot(selectedShot.id)}
          user={user}
          isLiked={likedShots.includes(selectedShot.id)}
          likesCount={shots.find(s => s.id === selectedShot.id)?.likes_count || 0}
          onLike={() => handleLike(selectedShot.id)}
          viewsCount={shots.find(s => s.id === selectedShot.id)?.views_count || 0}
          onView={handleView}
        />
      )}
    </section>
  );
}