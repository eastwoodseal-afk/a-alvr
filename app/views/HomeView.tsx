"use client";
import React, { useEffect, useState, useCallback } from "react";
import MasonryGrid from "../components/MasonryGrid";
import ShotDetailModal from "../components/ShotDetailModal";
import UserProfileOverlay from "../components/UserProfileOverlay";
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

interface FollowUser {
  id: string;
  username: string;
  avatar_url?: string;
}

export default function HomeView() {
  const { user, followingOnly } = useAuth();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [likingId, setLikingId] = useState<string | null>(null);

  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [disapprovingId, setDisapprovingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Lógica para decidir clases del Grid
  // Si el filtro está activo, en móvil será 1 columna, en escritorio normal.
  const gridColumnsClass = followingOnly 
    ? "columns-1 md:columns-3 lg:columns-4 xl:columns-6" 
    : "columns-2 md:columns-3 lg:columns-4 xl:columns-6";

  const fetchShots = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    let query = supabase
      .from("shots")
      .select("id, image_url, title, description, user_id, author, likes_count, views_count")
      .eq("is_approved", true);

    if (followingOnly && user) {
        const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        
        if (followingIds.length === 0) {
            setShots([]); setHasMore(false); setLoading(false); return;
        }
        query = query.in('user_id', followingIds);
    }

    query = query.order('created_at', { ascending: false }).range(start, end);
    const { data, error } = await query;

    if (error) { console.error("Error fetching:", error); setLoading(false); return; }

    if (data) {
      let newShots = data as any[];
      newShots = newShots.map(s => ({...s, id: s.id.toString()}));

      if (!user && !followingOnly && newShots.length > 0) {
         newShots = newShots.sort(() => Math.random() - 0.5);
      }

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
  }, [user, loading, followingOnly]);

  useEffect(() => {
    if (followingOnly && user) {
        const fetchFollowing = async () => {
            const { data } = await supabase
                .from('follows')
                .select('profiles!follows_following_id_fkey(id, username, avatar_url)')
                .eq('follower_id', user.id);
            
            if (data) {
                const users = data.map((f: any) => f.profiles).filter(Boolean);
                setFollowingUsers(users);
            }
        };
        fetchFollowing();
    } else {
        setFollowingUsers([]);
    }
  }, [followingOnly, user]);

  useEffect(() => {
    setShots([]); setPage(0); setHasMore(true);
    fetchShots(0, true);
    if (user) {
      supabase.from("likes").select("shot_id").eq("user_id", user.id).then(({ data }) => {
        if (data) setLikedShots(data.map((l: any) => l.shot_id.toString()));
      });
    }
  }, [user, followingOnly]);

  useEffect(() => {
    async function fetchSavedShots() {
      if (!user) return;
      const { data } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id);
      if (data) setSavedShots(data.map((row: any) => row.shot_id.toString()));
    }
    fetchSavedShots();
  }, [user]);

  const handleDisapprove = async (shotId: string) => {
    if (!isAdmin) return;
    setShots(prev => prev.filter(s => s.id !== shotId));
    setDisapprovingId(shotId);
    await supabase.from('shots').update({ is_approved: false }).eq('id', shotId);
    setDisapprovingId(null);
  };

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
    <section className={`flex w-full ${followingOnly ? 'h-[calc(100vh-64px)]' : ''}`}>
      
      {/* SIDEBAR: Visible en móvil (1/3) y Escritorio */}
      {followingOnly && (
        <aside className="w-1/3 min-w-[100px] max-w-[200px] flex-shrink-0 border-r border-gray-800 bg-gray-900/50 overflow-y-auto pt-20 pb-4">
            <div className="px-2 mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Mi Gente</h3>
            </div>
            <div className="space-y-1 px-1">
                {followingUsers.length === 0 && (
                    <div className="text-center text-gray-600 text-xs p-4">Vacío</div>
                )}
                {followingUsers.map((u) => (
                    <button
                        key={u.id}
                        onClick={() => setSelectedProfileId(u.id)}
                        className="w-full flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-800 transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : (u.username || "?").charAt(0).toUpperCase()}
                        </div>
                        {/* En móvil truncamos el texto para que quepa */}
                        <span className="text-[10px] text-gray-300 group-hover:text-yellow-400 truncate w-full text-center">@{u.username}</span>
                    </button>
                ))}
            </div>
        </aside>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className={`flex-1 p-2 overflow-y-auto ${followingOnly ? 'h-full' : ''}`}>
        
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
            // Pasamos la clase dinámica
            columnsClass={gridColumnsClass}
            // Props de Admin
            isAdmin={isAdmin}
            onDisapprove={handleDisapprove}
            disapprovingId={disapprovingId}
          />
        )}
        
        {loading && <div className="text-center py-4 text-gray-500">Cargando...</div>}
        {!loading && shots.length === 0 && (
             <div className="text-center text-gray-500 py-8">
                {followingOnly ? "Aún no sigues a nadie o no tienen shots." : "No hay shots."}
             </div>
        )}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin.</div>}
      </div>

      {/* MODALES */}
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

      {selectedProfileId && (
        <UserProfileOverlay 
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}

    </section>
  );
}