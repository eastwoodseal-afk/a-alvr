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
}

export default function HomeView() {
  const { user } = useAuth();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  // --- ESTADOS PARA GUARDAR ---
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Función de Fetch (Igual que antes, optimizada)
  const fetchShots = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading) return;
    setLoading(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    let query = supabase
      .from("shots")
      .select("id, image_url, title, description, user_id, author")
      .eq("is_approved", true);

    if (user) {
      // Logueado: Por fecha
      query = query.order('created_at', { ascending: false });
    } else {
      // No logueado: Random (simulado en cliente para no usar RPC)
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(start, end);

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching:", error);
        setLoading(false);
        return;
    }

    if (data) {
      let newShots = data as Shot[];
      if (!user && newShots.length > 0) {
        newShots = newShots.sort(() => Math.random() - 0.5);
      }

      // Mapeo de perfiles
      const userIds = [...new Set(newShots.map((shot) => shot.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc: { [key: string]: string }, profile: any) => {
            acc[profile.id] = profile.username || "sin Creador";
            return acc;
          }, {});
        }
      }

      const processedShots = newShots.map((shot) => ({
        ...shot,
        username: profilesMap[shot.user_id] || "sin Creador",
      }));

      if (isRefresh) setShots(processedShots);
      else setShots((prev) => [...prev, ...processedShots]);

      if (data.length < BATCH_SIZE) setHasMore(false);
    } else setHasMore(false);
    
    setLoading(false);
  }, [user, loading]);

  // Carga inicial
  useEffect(() => {
    setShots([]);
    setPage(0);
    setHasMore(true);
    fetchShots(0, true);
  }, [user]);

  // --- LÓGICA DE GUARDADO CENTRALIZADA ---
  
  // Cargar lista de guardados
  useEffect(() => {
    async function fetchSavedShots() {
      if (!user) return;
      const { data } = await supabase
        .from("saved_shots")
        .select("shot_id")
        .eq("user_id", user.id);
      if (data) {
        setSavedShots(data.map((row: { shot_id: string }) => row.shot_id));
      }
    }
    fetchSavedShots();
  }, [user]);

  // Función para Guardar
  const handleSaveShot = async (shotId: string) => {
    if (!user) return;
    setSavingId(shotId);
    const { error } = await supabase
      .from("saved_shots")
      .insert({ user_id: user.id, shot_id: shotId });
    
    if (!error) {
      setSavedShots(prev => [...prev, shotId]);
    }
    setSavingId(null);
  };

  // Infinite Scroll
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchShots(nextPage);
    }
  }, [page, hasMore, loading, fetchShots]);
  useInfiniteScroll(loadMore, loading);

  // Cierre de modal global
  useEffect(() => {
    const handleCloseModals = () => setSelectedShot(null);
    window.addEventListener('close-modals', handleCloseModals);
    return () => window.removeEventListener('close-modals', handleCloseModals);
  }, []);

  return (
    <section className="p-2">
      {shots.length === 0 && loading && (
        <div className="text-center text-gray-500 py-8">Cargando experiencia...</div>
      )}

      {shots.length > 0 && (
        <MasonryGrid 
          shots={shots} 
          setSelectedShot={setSelectedShot} 
          savedShots={savedShots}
          savingId={savingId}
          onSaveShot={handleSaveShot}
          user={user}
        />
      )}

      {loading && shots.length > 0 && (
        <div className="text-center py-4 text-gray-500">Descubriendo más shots...</div>
      )}

      {!hasMore && !loading && shots.length > 0 && (
        <div className="text-center py-4 text-gray-600 text-sm">Has llegado al fondo.</div>
      )}

      {/* Modal con PROPS COMPLETAS */}
      {selectedShot && (
        <ShotDetailModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          isSaved={savedShots.includes(selectedShot.id)}
          isSaving={savingId === selectedShot.id}
          onSave={() => handleSaveShot(selectedShot.id)}
          user={user}
        />
      )}
    </section>
  );
}