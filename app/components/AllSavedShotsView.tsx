"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import MasonryGrid from "./MasonryGrid";
import ShotDetailModal from "./ShotDetailModal";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useAuth } from "../../lib/AuthContext";

const BATCH_SIZE = 20;

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
  board_name?: string;
  board_id?: string;
  views_count?: number;
}

// --- FIX: Permitir null y undefined ---
interface Props {
  userId: string | null | undefined;
}

export default function AllSavedShotsView({ userId }: Props) {
  const { user } = useAuth();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchShots = useCallback(async (pageNum: number) => {
    // Si no hay userId, no hacemos nada
    if (!userId || loading) return; 
    
    setLoading(true);
    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from("saved_shots")
      .select(`
        shot_id,
        created_at,
        shots (
          id, 
          image_url, 
          title, 
          description, 
          author, 
          user_id,
          views_count,
          board_shots (
            board_id,
            boards ( name )
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
        console.error("Error detallado:", error);
        setLoading(false);
        return;
    }

    const processedShots = (data || []).map((item: any) => {
        const bs = item.shots?.board_shots && item.shots.board_shots.length > 0 
          ? item.shots.board_shots[0] 
          : null;

        return {
            id: item.shots?.id,
            image_url: item.shots?.image_url,
            title: item.shots?.title,
            description: item.shots?.description,
            author: item.shots?.author,
            user_id: item.shots?.user_id,
            username: "Usuario", 
            board_name: bs?.boards?.name,
            board_id: bs?.board_id,
            views_count: item.shots?.views_count || 0
        };
    }).filter(s => s.id); 

    if (pageNum === 0) setShots(processedShots);
    else setShots(prev => [...prev, ...processedShots]);

    if (!data || data.length < BATCH_SIZE) setHasMore(false);
    setLoading(false);

  }, [userId, loading]);

  useEffect(() => { 
    setShots([]); 
    setPage(0); 
    setHasMore(true); 
    if (userId) fetchShots(0); 
  }, [userId]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) { const nextPage = page + 1; setPage(nextPage); fetchShots(nextPage); }
  }, [page, hasMore, loading, fetchShots]);
  
  useInfiniteScroll(loadMore, loading);

  useEffect(() => {
    async function fetchSaved() {
      if (!user) return;
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id);
      if (data) setSavedShots(data.map((r: any) => r.shot_id));
    }
    fetchSaved();
  }, [user]);

  const handleSave = async (id: string) => {
      if(!user) return;
      setSavingId(id);
      await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: id });
      setSavedShots(p => [...p, id]);
      setSavingId(null);
  };

  // Guardia extra si no hay userId
  if (!userId) return <div className="text-center py-8 text-gray-400">No hay usuario logueado.</div>;

  return (
    <>
        {loading && shots.length === 0 && <div className="text-center py-8 text-gray-400">Cargando tu tesoro...</div>}
        
        {shots.length > 0 && (
            <MasonryGrid 
                shots={shots} 
                setSelectedShot={setSelectedShot}
                savedShots={savedShots}
                savingId={savingId}
                onSaveShot={handleSave}
                user={user}
                hideLikes={true}
            />
        )}

        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin de tu colección.</div>}

        {selectedShot && (
            <ShotDetailModal 
                shot={selectedShot}
                onClose={() => setSelectedShot(null)}
                isSaved={savedShots.includes(selectedShot.id)}
                isSaving={savingId === selectedShot.id}
                onSave={() => handleSave(selectedShot.id)}
                user={user}
                isLiked={false} 
                likesCount={0}
                onLike={() => {}}
                viewsCount={selectedShot.views_count || 0}
                onView={() => {}} // Aquí podrías pasar una función si quieres actualizar conteo
            />
        )}
    </>
  );
}