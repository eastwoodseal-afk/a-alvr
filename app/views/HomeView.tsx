"use client";
import React, { useEffect, useState, useCallback } from "react";
import MasonryGrid from "../components/MasonryGrid";
import ShotDetailModal from "../components/ShotDetailModal";
import UserProfileOverlay from "../components/UserProfileOverlay";
import ConfirmModal from "../components/ConfirmModal";
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

// Interfaz extendida para la lista de usuarios
interface UserRelation {
  id: string;
  username: string;
  avatar_url?: string;
  hasSharedStudio: boolean; // NUEVO: Flag para el botón de escuadras
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

  // NUEVO: Estado unificado para la lista de gente
  const [relatedUsers, setRelatedUsers] = useState<UserRelation[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'public' | 'studio'>('public'); // NUEVO: Modo de vista del perfil
  
  const [confirmDisapproveId, setConfirmDisapproveId] = useState<string | null>(null);
  const [disapprovingId, setDisapprovingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const gridColumnsClass = followingOnly 
    ? "columns-1 md:columns-3 lg:columns-4 xl:columns-6" 
    : "columns-2 md:columns-3 lg:columns-4 xl:columns-6";

  const fetchShots = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading) return; setLoading(true);
    const start = pageNum * BATCH_SIZE; const end = start + BATCH_SIZE - 1;
    let query = supabase.from("shots").select("id, image_url, title, description, user_id, author, likes_count, views_count").eq("is_approved", true);
    if (followingOnly && user) {
        const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        const followingIds = followingData?.map(f => f.following_id) || [];
        if (followingIds.length === 0) { setShots([]); setHasMore(false); setLoading(false); return; }
        query = query.in('user_id', followingIds);
    }
    query = query.order('created_at', { ascending: false }).range(start, end);
    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }
    if (data) {
      let newShots = data.map(s => ({...s, id: s.id.toString()}));
      if (!user && !followingOnly && newShots.length > 0) newShots.sort(() => Math.random() - 0.5);
      const userIds = [...new Set(newShots.map((shot) => shot.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
        // CORRECCIÓN AQUÍ: Tipado explícito en el reduce
        if (profiles) profilesMap = profiles.reduce((acc: Record<string, string>, p) => { acc[p.id] = p.username || "sin Creador"; return acc; }, {} as Record<string, string>);
      }
      const processedShots = newShots.map((s) => ({ ...s, views_count: s.views_count || 0, username: profilesMap[s.user_id] || "sin Creador" }));
      if (isRefresh) setShots(processedShots); else setShots((prev) => [...prev, ...processedShots]);
      if (data.length < BATCH_SIZE) setHasMore(false);
    } else setHasMore(false);
    setLoading(false);
  }, [user, loading, followingOnly]);

  // NUEVA LÓGICA: FETCH DE USUARIOS RELACIONADOS (FOLLOW + STUDIO SHARES)
  useEffect(() => {
    if (followingOnly && user) {
        const fetchRelatedUsers = async () => {
            // 1. Traer a quienes sigo
            const { data: followsData } = await supabase
                .from('follows')
                .select('profiles!follows_following_id_fkey(id, username, avatar_url)')
                .eq('follower_id', user.id);
            
            const followingUsers = (followsData || []).map((f: any) => ({
                id: f.profiles.id,
                username: f.profiles.username,
                avatar_url: f.profiles.avatar_url,
                hasSharedStudio: false
            }));

            // 2. Traer quienes me compartieron su estudio
            const { data: sharesData } = await supabase
                .from('studio_shares')
                .select('owner_id, profiles!studio_shares_owner_id_fkey(id, username, avatar_url)')
                .eq('viewer_id', user.id);

            const studioUsers = (sharesData || []).map((s: any) => ({
                id: s.profiles.id,
                username: s.profiles.username,
                avatar_url: s.profiles.avatar_url,
                hasSharedStudio: true
            }));

            // 3. Mergear listas (evitando duplicados, priorizando hasSharedStudio: true)
            const userMap = new Map<string, UserRelation>();
            
            followingUsers.forEach(u => userMap.set(u.id, u));
            
            studioUsers.forEach(u => {
                if (userMap.has(u.id)) {
                    // Si ya existe (lo sigo), actualizamos el flag
                    const existing = userMap.get(u.id)!;
                    existing.hasSharedStudio = true;
                } else {
                    userMap.set(u.id, u);
                }
            });

            setRelatedUsers(Array.from(userMap.values()));
        };
        fetchRelatedUsers();
    } else {
        setRelatedUsers([]);
    }
  }, [followingOnly, user]);

  useEffect(() => { 
    setShots([]); 
    setPage(0); 
    setHasMore(true); 
    fetchShots(0, true); 
    
    async function fetchUserInteractions() {
      if (!user) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", user.id),
        supabase.from("likes").select("shot_id").eq("user_id", user.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
    }
    fetchUserInteractions();
  }, [user, followingOnly]);
  
  const handleSave = async (shotId: string) => {
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

  const handleView = async (shotId: string) => {
    // Increment view logic handled inside modal usually, but here for safety
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
  };

  const handleDisapproveRequest = (shotId: string) => { if (!isAdmin) return; setConfirmDisapproveId(shotId); };
  
  const executeDisapprove = async () => {
    if (!confirmDisapproveId) return;
    setDisapprovingId(confirmDisapproveId);
    const { error } = await supabase.from('shots').update({ is_approved: false }).eq('id', confirmDisapproveId);
    if (!error) setShots(prev => prev.filter(s => s.id !== confirmDisapproveId));
    setDisapprovingId(null);
    setConfirmDisapproveId(null);
  };
  
  const openProfile = (userId: string, mode: 'public' | 'studio' = 'public') => {
    setSelectedProfileId(userId);
    setViewMode(mode);
  };

  const loadMore = useCallback(() => {
    if (hasMore && !loading) { 
      const nextPage = page + 1; 
      setPage(nextPage); 
      fetchShots(nextPage); 
    }
  }, [page, hasMore, loading, fetchShots]);

  useInfiniteScroll(loadMore, loading);

  return (
    <section className={`flex w-full ${followingOnly ? 'h-[calc(100vh-64px)]' : ''}`}>
      
      {followingOnly && (
        <aside className="w-1/3 min-w-[100px] max-w-[200px] flex-shrink-0 border-r border-gray-800 bg-gray-900/50 overflow-y-auto pt-20 pb-4">
            <div className="px-2 mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Mi Gente</h3>
            </div>
            <div className="space-y-1 px-1">
                {relatedUsers.length === 0 && (
                    <div className="text-center text-gray-600 text-xs p-4">Vacío</div>
                )}
                {relatedUsers.map((u) => (
                    <div key={u.id} className="w-full flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-800 transition group relative">
                        
                        {/* Botón Principal: Ver Perfil Público */}
                        <button onClick={() => openProfile(u.id, 'public')} className="flex flex-col items-center w-full">
                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : (u.username || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] text-gray-300 group-hover:text-yellow-400 truncate w-full text-center mt-1">@{u.username}</span>
                        </button>

                        {/* NUEVO: Botón Escuadras (Solo si tiene estudio compartido) */}
                        {u.hasSharedStudio && (
                            <button 
                                onClick={() => openProfile(u.id, 'studio')}
                                className="absolute top-1 right-1 bg-blue-600 rounded-full p-1 shadow-md hover:bg-blue-500 transition"
                                title="Ver Estudio Compartido"
                            >
                                {/* Icono Escuadras / Dibujo Técnico */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </aside>
      )}

      <div className={`flex-1 p-2 overflow-y-auto ${followingOnly ? 'h-full' : ''}`}>
        {loading && shots.length === 0 && <div className="text-center py-8 text-gray-400">Cargando Ateneo...</div>}
        
        {shots.length > 0 && (
          <MasonryGrid 
            shots={shots} 
            setSelectedShot={setSelectedShot} 
            savedShots={savedShots}
            savingId={savingId} 
            onSaveShot={handleSave} 
            user={user}
            likedShots={likedShots} 
            likingId={likingId} 
            onLike={handleLike}
            columnsClass={gridColumnsClass}
            isAdmin={isAdmin} 
            onDisapprove={handleDisapproveRequest} 
            disapprovingId={disapprovingId}
          />
        )}
        
        {loading && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
        {!hasMore && !loading && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin del Ateneo.</div>}
      </div>

      {/* Modales */}
      {selectedShot && (
        <ShotDetailModal 
          shot={selectedShot}
          onClose={() => setSelectedShot(null)}
          isSaved={savedShots.includes(selectedShot.id)}
          isSaving={savingId === selectedShot.id}
          onSave={() => handleSave(selectedShot.id)}
          user={user}
          isLiked={likedShots.includes(selectedShot.id)}
          likesCount={selectedShot.likes_count || 0}
          onLike={() => handleLike(selectedShot.id)}
          viewsCount={selectedShot.views_count || 0}
          onView={handleView}
        />
      )}

      {/* PERFIL: Pasamos el modo */}
      {selectedProfileId && (
        <UserProfileOverlay 
          userId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          studioMode={viewMode === 'studio'} // NUEVA PROP
        />
      )}

      <ConfirmModal 
        open={!!confirmDisapproveId}
        onClose={() => setConfirmDisapproveId(null)}
        onConfirm={executeDisapprove}
        title="Desaprobar"
        message="¿Ocultar este shot?"
        confirmText="Sí"
        variant="danger"
      />
    </section>
  );
}