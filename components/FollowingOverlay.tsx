"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import UserProfileOverlay from "./UserProfileOverlay";
import PublicCollectionOverlay from "./PublicCollectionOverlay"; // NUEVO

interface UserRelation {
  id: string;
  username: string;
  avatar_url?: string;
  hasSharedStudio: boolean;
}

const BATCH_SIZE = 20;

interface Props {
  userId: string;
  onClose: () => void;
}

export default function FollowingOverlay({ userId, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const [relatedUsers, setRelatedUsers] = useState<UserRelation[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [shots, setShots] = useState<any[]>([]);
  const [loadingShots, setLoadingShots] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const isFetchingRef = useRef(false);

  // NUEVO: Estado para la Vitrina Pública (Avatar)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  // Estado existente: Para el Estudio Compartido (Botón Azul)
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  
  // Interacciones del Muro
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [likedShots, setLikedShots] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const [followsRes, sharesRes] = await Promise.all([
          supabase.from('follows').select('profiles!follows_following_id_fkey(id, username, avatar_url)').eq('follower_id', userId),
          supabase.from('studio_shares').select('owner_id, profiles!studio_shares_owner_id_fkey(id, username, avatar_url)').eq('viewer_id', userId)
        ]);

        const followingUsers = (followsRes.data || []).map((f: any) => f.profiles ? { id: f.profiles.id, username: f.profiles.username, avatar_url: f.profiles.avatar_url, hasSharedStudio: false } : null).filter(Boolean) as UserRelation[];
        const studioUsers = (sharesRes.data || []).map((s: any) => s.profiles ? { id: s.profiles.id, username: s.profiles.username, avatar_url: s.profiles.avatar_url, hasSharedStudio: true } : null).filter(Boolean) as UserRelation[];

        const userMap = new Map<string, UserRelation>();
        followingUsers.forEach(u => userMap.set(u.id, u));
        studioUsers.forEach(u => {
          if (userMap.has(u.id)) userMap.get(u.id)!.hasSharedStudio = true;
          else userMap.set(u.id, u);
        });

        const finalUsers = Array.from(userMap.values());
        setRelatedUsers(finalUsers);
        setFollowingIds(finalUsers.map(u => u.id));

        if (currentUser?.id) {
          const [savedRes, likedRes] = await Promise.all([
            supabase.from("saved_shots").select("shot_id").eq("user_id", currentUser.id),
            supabase.from("likes").select("shot_id").eq("user_id", currentUser.id)
          ]);
          if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
          if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
        }
      } catch (err) { console.error("Error cargando relaciones:", err); } 
      finally { setLoadingUsers(false); }
    };
    fetchUsers();
  }, [userId, currentUser?.id]);

  const fetchShots = useCallback(async (pageNum: number) => {
    if (isFetchingRef.current || followingIds.length === 0) return;
    isFetchingRef.current = true;
    setLoadingShots(true);
    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;
    try {
      const { data, error } = await supabase.from('shots').select('id, image_url, title, description, user_id, author, likes_count, views_count, profiles!shots_user_id_fkey(username)').in('user_id', followingIds).eq('is_approved', true).order('created_at', { ascending: false }).range(start, end);
      if (!error && data) {
        const processed = data.map((s: any) => ({ ...s, id: s.id.toString(), username: s.profiles?.username || "Anónimo" }));
        if (pageNum === 0) setShots(processed);
        else setShots(prev => [...prev, ...processed]);
        if (data.length < BATCH_SIZE) setHasMore(false);
      } else { setHasMore(false); }
    } catch (err) { console.error(err); } 
    finally { isFetchingRef.current = false; setLoadingShots(false); }
  }, [followingIds]);

  useEffect(() => {
    if (followingIds.length > 0) fetchShots(0);
    else { setShots([]); setLoadingShots(false); }
  }, [followingIds]);

  const loadMore = useCallback(() => { if (hasMore && !isFetchingRef.current) { const nextPage = page + 1; setPage(nextPage); fetchShots(nextPage); } }, [page, hasMore, fetchShots]);
  const sentinelRef = useInfiniteScroll(loadMore, loadingShots);

  const handleSave = async (shotId: string) => { if (!currentUser) return; await supabase.from("saved_shots").insert({ user_id: currentUser.id, shot_id: shotId }); setSavedShots(prev => [...prev, shotId]); };
  const handleLike = async (shotId: string) => { if (!currentUser) return; const alreadyLiked = likedShots.includes(shotId); setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s)); if (alreadyLiked) await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); else await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); };
  const handleView = useCallback(async (shotId: string) => { await supabase.rpc('increment_view', { shot_id: parseInt(shotId) }); setShots(prev => prev.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s)); }, []);

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-40 bg-gray-950 flex flex-col md:grid md:grid-cols-[180px_1fr] overflow-hidden">
        
      {/* SIDEBAR IZQUIERDO */}
      <aside className="w-full h-auto md:h-full border-r border-gray-800 bg-gray-900/50 overflow-y-auto pt-4 pb-4 custom-scrollbar">
        <div className="px-2 mb-4 flex justify-between items-center md:block">
          <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider text-center">RELACIONES</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold md:hidden">&times;</button>
        </div>
        <div className="space-y-1 px-1">
          {loadingUsers ? <div className="text-center text-gray-500 p-4 text-xs">Cargando...</div> :
           relatedUsers.length === 0 ? <div className="text-center text-gray-600 text-xs p-4">Vacío</div> :
           relatedUsers.map((u) => (
            <div key={u.id} className="w-full flex flex-col items-center gap-1 p-1">
              <div className="w-full flex items-center justify-center gap-1">
                {/* AVATAR -> ABRE VITRINA PÚBLICA */}
                <button onClick={() => setSelectedCollectionId(u.id)} className="flex flex-col items-center hover:opacity-80 transition" title="Ver Colección">
                  <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-gray-600">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : (u.username || "?").charAt(0).toUpperCase()}
                  </div>
                </button>
                {/* BOTÓN AZUL -> ABRE ESTUDIO COMPARTIDO */}
                {u.hasSharedStudio && (
                  <button onClick={() => setSelectedStudioId(u.id)} className="bg-blue-600 rounded-full w-7 h-7 flex items-center justify-center shadow hover:bg-blue-500 transition flex-shrink-0" title="Ver Estudio Compartido">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedCollectionId(u.id)} className="w-full text-center hover:opacity-80 transition">
                <span className="text-[10px] text-gray-400 truncate block px-1">@{u.username}</span>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* GRID DERECHO */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto relative p-2 custom-scrollbar">
        {loadingShots && shots.length === 0 ? <div className="text-center py-8 text-gray-400">Cargando...</div> : 
         shots.length === 0 ? <div className="text-center py-8 text-gray-500">Sin shots aprobados.</div> :
         <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
            {shots.map(shot => (
              <ShotCard key={shot.id} shot={shot} isSaved={savedShots.includes(shot.id)} isSaving={false} onSave={() => handleSave(shot.id)} isLiked={likedShots.includes(shot.id)} likesCount={shot.likes_count || 0} isLiking={false} onLike={() => handleLike(shot.id)} viewsCount={shot.views_count || 0} user={currentUser} onClick={() => setSelectedShot(shot)} />
            ))}
         </div>
        }
        {loadingShots && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
        <div ref={sentinelRef} className="h-1 w-full"></div>
      </div>

      {/* --- MODALES Y OVERLAYS --- */}

      {/* NUEVO: Vitrina Pública (Clic en Avatar) */}
      {selectedCollectionId && (
        <PublicCollectionOverlay 
          userId={selectedCollectionId}
          onClose={() => setSelectedCollectionId(null)}
        />
      )}

      {/* EXISTENTE: Estudio Compartido (Clic en Botón Azul) */}
      {selectedStudioId && (
        <UserProfileOverlay 
          userId={selectedStudioId}
          onClose={() => setSelectedStudioId(null)}
          studioMode={true}
        />
      )}

      {/* Modal Detalle del Muro */}
      {selectedShot && ( 
        <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={savedShots.includes(selectedShot.id)} isSaving={false} onSave={() => handleSave(selectedShot.id)} user={currentUser} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={handleView} /> 
      )}
    </div>
  );
}