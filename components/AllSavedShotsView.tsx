"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import PublicCollectionOverlay from "./PublicCollectionOverlay"; 
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Tag } from "../lib/tagUtils"; // 🆕 IMPORT TAG

const BATCH_SIZE = 20;

interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; is_approved?: boolean; board_name?: string; tags?: Tag[]; } // 🆕 TAGS AÑADIDOS

interface Props {
  userId: string | null | undefined;
  isOwner: boolean;
}

export default function AllSavedShotsView({ userId, isOwner }: Props) {
  const { user: currentUser } = useAuth();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [likedShots, setLikedShots] = useState<string[]>([]);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const fetchShots = useCallback(async (pageNum: number) => {
    if (!userId || loading) return; 
    
    setLoading(true);
    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    // 🆕 INYECCIÓN: Añadido shot_tags ( tags ( id, name, slug, facet ) ) a la consulta
    let query = supabase
      .from("saved_shots")
      .select(`
        shot_id,
        created_at,
        shots (
          id, image_url, title, description, author, user_id, likes_count, views_count, is_approved, 
          profiles!shots_user_id_fkey ( username ),
          board_shots ( board_id, boards ( name ) ),
          shot_tags ( tags ( id, name, slug, facet ) )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (!isOwner) {
      query = query.eq("shots.is_approved", true);
    }

    const { data, error } = await query;

    if (!error && data) {
      const processedShots = (data || [])
        .filter((item: any) => item.shots !== null)
        .map((item: any) => {
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
              username: item.shots?.profiles?.username || "Anónimo", 
              board_name: bs?.boards?.name,
              views_count: item.shots?.views_count || 0,
              is_approved: item.shots?.is_approved,
              tags: item.shots?.shot_tags?.map((st: any) => st.tags).filter(Boolean) || [] // 🆕 MAPEO DE TAGS
          };
      });

      if (pageNum === 0) setShots(processedShots);
      else setShots(prev => [...prev, ...processedShots]);

      if (data.length < BATCH_SIZE) setHasMore(false);
    }
    setLoading(false);

  }, [userId, loading, isOwner]);

  useEffect(() => { 
    setShots([]); 
    setPage(0); 
    setHasMore(true); 
    if (userId) fetchShots(0); 
  }, [userId, isOwner]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) { const nextPage = page + 1; setPage(nextPage); fetchShots(nextPage); }
  }, [page, hasMore, loading, fetchShots]);
  
  const sentinelRef = useInfiniteScroll(loadMore, loading);

  useEffect(() => {
    async function fetchInteractions() {
      if (!currentUser?.id) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", currentUser.id),
        supabase.from("likes").select("shot_id").eq("user_id", currentUser.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
    }
    fetchInteractions();
  }, [currentUser?.id]);

  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s));
    if (alreadyLiked) await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); 
    else await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); 
  };

  const handleView = async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s));
  };

  if (!userId) return <div className="text-center py-8 text-gray-400">No hay usuario.</div>;

  return (
    <>
      {loading && shots.length === 0 && <div className="text-center py-8 text-gray-400">Cargando...</div>}
      
      {shots.length > 0 && (
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
          {shots.map(shot => (
            <ShotCard 
              key={shot.id} 
              shot={shot} 
              isSaved={savedShots.includes(shot.id)} 
              isSaving={false} 
              onSave={() => {}} 
              user={currentUser}
              isLiked={likedShots.includes(shot.id)}
              likesCount={shot.likes_count || 0}
              isLiking={false}
              onLike={() => handleLike(shot.id)}
              viewsCount={shot.views_count || 0}
              onClick={() => setSelectedShot(shot)}
              hideViews={false}
              hideSave={true} 
              boardName={shot.board_name} 
            />
          ))}
        </div>
      )}

      {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
      {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin de la colección.</div>}

      <div ref={sentinelRef} className="h-1 w-full"></div>

      {selectedShot && currentUser && (
        <ShotDetailModal 
          shot={selectedShot}
          onClose={() => setSelectedShot(null)}
          user={currentUser}
          initialIsLiked={likedShots.includes(selectedShot.id)}
          initialIsSaved={true}
          initialLikesCount={selectedShot.likes_count || 0}
          onLikeChange={(newIsLiked, newCount) => {
            setLikedShots(prev => newIsLiked ? [...prev, selectedShot.id] : prev.filter(id => id !== selectedShot.id));
            setShots(prev => prev.map(s => s.id === selectedShot.id ? { ...s, likes_count: newCount } : s));
          }}
          onSaveChange={(newIsSaved) => {
            if(newIsSaved) setSavedShots(prev => [...prev, selectedShot.id]);
          }}
          onOpenCollection={(uocId) => { setSelectedShot(null); setSelectedCollectionId(uocId); }}
        />
      )}

      {selectedCollectionId && (
        <PublicCollectionOverlay userId={selectedCollectionId} onClose={() => setSelectedCollectionId(null)} />
      )}
    </>
  );
}