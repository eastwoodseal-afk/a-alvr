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
}

export default function UserShots({ userId }: { userId: string }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false); // Empezamos en FALSE para evitar el bloqueo inicial
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const { user } = useAuth();

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Estado para saber si es la primera carga (para mostrar el loader principal)
  const [initialLoad, setInitialLoad] = useState(true);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Función de Fetch limpia
  const fetchUserShots = useCallback(async (pageNum: number) => {
    // Si ya no hay más, no cargues
    if (!hasMore && pageNum > 0) return;

    setLoading(true); // Ahora sí activamos el loader

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from("shots")
      .select("id, image_url, title, description, user_id, author")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error:", error);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    // Lógica de Username
    let username = "Yo";
    if (pageNum === 0 && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      if (profile?.username) username = profile.username;
    }

    const processedShots = (data || []).map(shot => ({
      ...shot,
      username: username,
      author: shot.author || username
    }));

    // Actualizar lista
    if (pageNum === 0) {
      setShots(processedShots);
    } else {
      setShots(prev => [...prev, ...processedShots]);
    }

    // Verificar fin de lista
    if (!data || data.length < BATCH_SIZE) {
      setHasMore(false);
    }

    setLoading(false);
    setInitialLoad(false);
  }, [userId, hasMore]); // Dependencias correctas

  // Efecto inicial
  useEffect(() => {
    if (userId) {
      setShots([]);
      setPage(0);
      setHasMore(true);
      setInitialLoad(true);
      fetchUserShots(0);
    }
  }, [userId]); // Solo se dispara si cambia el userId

  // Cargar guardados
  useEffect(() => {
    async function fetchSaved() {
      if (!user) return;
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id);
      if (data) setSavedShots(data.map((row: { shot_id: string }) => row.shot_id));
    }
    fetchSaved();
  }, [user]);

  const handleSaveShot = async (shotId: string) => {
    if (!user) return;
    setSavingId(shotId);
    await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId });
    setSavedShots(prev => [...prev, shotId]);
    setSavingId(null);
  };

  // Infinite Scroll
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserShots(nextPage);
    }
  }, [page, hasMore, loading, fetchUserShots]);

  useInfiniteScroll(loadMore, loading);

  // Renderizado
  if (initialLoad) return <div className="text-center text-gray-500 py-8">Cargando tus shots...</div>;
  if (!shots.length && !initialLoad) return <div className="text-center text-gray-500 py-8">No tienes shots aún.</div>;

  return (
    <>
      <MasonryGrid 
        shots={shots} 
        setSelectedShot={setSelectedShot} 
        savedShots={savedShots}
        savingId={savingId}
        onSaveShot={handleSaveShot}
        user={user}
      />
      
      {loading && !initialLoad && (
        <div className="text-center py-4 text-gray-500">Cargando más...</div>
      )}
      
      {!hasMore && !loading && shots.length > 0 && (
        <div className="text-center py-4 text-gray-600 text-sm">Estos son todos tus shots.</div>
      )}

      {selectedShot && (
        <MyShotDetailModal
          shot={selectedShot}
          user={user}
          onClose={() => setSelectedShot(null)}
          setShots={setShots}
          shots={shots}
        />
      )}
    </>
  );
}