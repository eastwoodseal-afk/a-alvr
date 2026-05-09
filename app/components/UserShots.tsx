"use client";
import React, { useEffect, useState, useCallback } from "react";
import MasonryGrid from "./MasonryGrid";
import MyShotDetailModal from "./MyShotDetailModal";
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
}

export default function UserShots({ userId }: { userId: string }) {
  const { user } = useAuth();
  
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);

  const fetchUserShots = useCallback(async (pageNum: number) => {
    if (!hasMore && pageNum > 0) return;
    setLoading(true);

    try {
        const start = pageNum * BATCH_SIZE;
        const end = start + BATCH_SIZE - 1;

        const { data, error } = await supabase.from("shots").select("id, image_url, title, description, user_id, author, likes_count").eq("user_id", userId).order("id", { ascending: false }).range(start, end);

        if (error) throw error;

        let username = "Yo";
        if (pageNum === 0 && userId) {
            const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
            if (profile?.username) username = profile.username;
        }

        const processedShots = (data || []).map(shot => ({
            ...shot,
            id: shot.id.toString(),
            username: username,
            author: shot.author || username
        }));

        if (pageNum === 0) setShots(processedShots);
        else setShots(prev => [...prev, ...processedShots]);

        if (!data || data.length < BATCH_SIZE) setHasMore(false);
    } catch (err) {
        console.error("Error cargando shots de usuario:", err);
        setHasMore(false);
    } finally {
        setLoading(false); 
        setInitialLoad(false);
    }
  }, [userId, hasMore]);

  useEffect(() => {
    if (userId) {
      setShots([]); setPage(0); setHasMore(true); setInitialLoad(true);
      fetchUserShots(0);
      
      supabase.from("likes").select("shot_id").eq("user_id", userId).then(({ data }) => {
        if (data) setLikedShots(data.map((l: any) => l.shot_id.toString()));
      });
    }
  }, [userId]);

  // LEY 1.2: Desacoplamiento de identidad. Solo reaccionamos si cambia el ID, no el objeto user completo.
  useEffect(() => {
    async function fetchSaved() {
      if (!user?.id) return; // Verificamos el ID de forma segura
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id);
      if (data) setSavedShots(data.map((row: any) => row.shot_id.toString()));
    }
    fetchSaved();
  }, [user?.id]); // 👈 CAMBIO CONSTITUCIONAL AQUÍ

  useEffect(() => {
    const handleUnsaveEvent = (e: CustomEvent) => {
      const unsavedId = e.detail;
      setSavedShots(prev => prev.filter(id => id !== unsavedId));
    };
    window.addEventListener('shot-unsaved', handleUnsaveEvent as EventListener);
    return () => window.removeEventListener('shot-unsaved', handleUnsaveEvent as EventListener);
  }, []);

  const handleSaveShot = async (shotId: string) => {
    if (!user) return;
    setSavingId(shotId);
    await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId });
    setSavedShots(prev => [...prev, shotId]);
    setSavingId(null);
  };

  const handleLike = async (shotId: string) => {
    if (!user) return;
    const alreadyLiked = likedShots.includes(shotId);
    setLikingId(shotId);

    setShots(prev => prev.map(s => {
      if(s.id === shotId) return { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) };
      return s;
    }));

    if (alreadyLiked) {
      setLikedShots(prev => prev.filter(id => id !== shotId));
      await supabase.from("likes").delete().match({ user_id: user.id, shot_id: shotId });
    } else {
      setLikedShots(prev => [...prev, shotId]);
      await supabase.from("likes").insert({ user_id: user.id, shot_id: shotId });
    }
    setLikingId(null);
  };

  const loadMore = useCallback(() => { 
    if (hasMore && !loading) { 
      const nextPage = page + 1; 
      setPage(nextPage); 
      fetchUserShots(nextPage); 
    } 
  }, [page, hasMore, loading, fetchUserShots]);

  // NUEVO: Recibimos la referencia del centinela
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  if (initialLoad) return <div className="text-center text-gray-500 py-8">Cargando tus shots...</div>;
  if (!shots.length && !initialLoad) return <div className="text-center text-gray-500 py-8">No tienes shots aún.</div>;

  return (
    <>
      <MasonryGrid shots={shots} setSelectedShot={setSelectedShot} savedShots={savedShots} savingId={savingId} onSaveShot={handleSaveShot} user={user} likedShots={likedShots} likingId={likingId} onLike={handleLike} hideViews={true}/>
      
      {loading && !initialLoad && ( <div className="text-center py-4 text-gray-500">Cargando más...</div> )}
      {!hasMore && !loading && shots.length > 0 && ( <div className="text-center py-4 text-gray-600 text-sm">Estos son todos tus shots.</div> )}
      
      {/* NUEVO: El centinela invisible para el Infinite Scroll */}
      <div ref={sentinelRef} className="h-1 w-full"></div>

      {selectedShot && ( <MyShotDetailModal shot={selectedShot} user={user} onClose={() => setSelectedShot(null)} setShots={setShots} shots={shots}/> )}
    </>
  );
}