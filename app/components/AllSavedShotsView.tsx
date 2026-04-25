"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import MasonryGrid from "./MasonryGrid";
import ShotDetailModal from "./ShotDetailModal";
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
  board_name?: string;
  board_id?: string;
}

interface Props {
  userId: string;
}

export default function AllSavedShotsView({ userId }: Props) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchShots = useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    // Consulta: Trae shots guardados con su info de tablero
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

    // Procesar datos
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
            board_id: bs?.board_id
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
    fetchShots(0);
  }, [userId]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchShots(nextPage);
    }
  }, [page, hasMore, loading, fetchShots]);
  
  useInfiniteScroll(loadMore, loading);

  // Lógica de guardado (necesaria aunque el botón esté oculto, por consistencia)
  useEffect(() => {
    async function fetchSaved() {
      if (!userId) return;
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", userId);
      if (data) setSavedShots(data.map((r: any) => r.shot_id));
    }
    fetchSaved();
  }, [userId]);

  const handleSave = async (id: string) => {
      if(!userId) return;
      setSavingId(id);
      await supabase.from("saved_shots").insert({ user_id: userId, shot_id: id });
      setSavedShots(p => [...p, id]);
      setSavingId(null);
  };

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
                // --- CLAVE: Pasamos null para ocultar el botón de guardar ---
                user={null} 
                // Pasamos el nombre del tablero (visual)
                boardName={shots.find(s => s.board_name)?.board_name} // Nota: Esto lo pasa el grid internamente por shot
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
                user={{ id: userId }}
            />
        )}
    </>
  );
}