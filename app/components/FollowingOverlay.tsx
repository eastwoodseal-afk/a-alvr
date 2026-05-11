"use client";
import React, { useState, useEffect, useCallback } from "react";
import MasonryGrid from "./MasonryGrid";
import ShotDetailModal from "./ShotDetailModal";
import UserProfileOverlay from "./UserProfileOverlay"; 
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

interface UserRelation {
  id: string;
  username: string;
  avatar_url?: string;
  hasSharedStudio: boolean;
}

const BATCH_SIZE = 20;

export default function FollowingOverlay({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [relatedUsers, setRelatedUsers] = useState<UserRelation[]>([]);
  
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [shots, setShots] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingShots, setLoadingShots] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'public' | 'studio'>('public');
  
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [likedShots, setLikedShots] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) fetchUsers(); 
  }, [user?.id]);

  const fetchUsers = async () => {
    if (!user) return; 

    setLoadingUsers(true);
    try {
      const [followsRes, sharesRes] = await Promise.all([
        supabase.from('follows').select('profiles!follows_following_id_fkey(id, username, avatar_url)').eq('follower_id', user.id),
        supabase.from('studio_shares').select('owner_id, profiles!studio_shares_owner_id_fkey(id, username, avatar_url)').eq('viewer_id', user.id)
      ]);

      const followingUsers = (followsRes.data || [])
        .map((f: any) => f.profiles ? { id: f.profiles.id, username: f.profiles.username, avatar_url: f.profiles.avatar_url, hasSharedStudio: false } : null)
        .filter(Boolean) as UserRelation[];

      const studioUsers = (sharesRes.data || [])
        .map((s: any) => s.profiles ? { id: s.profiles.id, username: s.profiles.username, avatar_url: s.profiles.avatar_url, hasSharedStudio: true } : null)
        .filter(Boolean) as UserRelation[];

      const userMap = new Map<string, UserRelation>();
      followingUsers.forEach(u => userMap.set(u.id, u));
      studioUsers.forEach(u => {
          if (userMap.has(u.id)) userMap.get(u.id)!.hasSharedStudio = true;
          else userMap.set(u.id, u);
      });
      
      const finalUsers = Array.from(userMap.values());
      setRelatedUsers(finalUsers);

      const ids = finalUsers.map(u => u.id);
      setFollowingIds(ids);

      if (user) {
        const [savedRes, likedRes] = await Promise.all([
          supabase.from("saved_shots").select("shot_id").eq("user_id", user.id),
          supabase.from("likes").select("shot_id").eq("user_id", user.id)
        ]);
        if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
        if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
      }

    } catch (err) { console.error("Error cargando usuarios:", err); } 
    finally { setLoadingUsers(false); }
  };

  useEffect(() => {
    if (followingIds.length > 0) {
      setShots([]); setPage(0); setHasMore(true);
      fetchShots(0);
    } else {
      setShots([]); setLoadingShots(false);
    }
  }, [followingIds]);

  const fetchShots = useCallback(async (pageNum: number) => {
    if (loadingShots || followingIds.length === 0) return;
    setLoadingShots(true);

    const start = pageNum * BATCH_SIZE;
    const end = start + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from('shots')
      .select('id, image_url, title, description, user_id, author, likes_count, views_count')
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(start, end);

    if (!error && data) {
      const processedShots = data.map(s => ({...s, id: s.id.toString()}));
      if (pageNum === 0) setShots(processedShots);
      else setShots(prev => [...prev, ...processedShots]);
      if (data.length < BATCH_SIZE) setHasMore(false);
    }
    setLoadingShots(false);
  }, [followingIds, loadingShots]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingShots) { 
      const nextPage = page + 1; 
      setPage(nextPage); 
      fetchShots(nextPage); 
    }
  }, [page, hasMore, loadingShots, fetchShots]);

  const sentinelRef = useInfiniteScroll(loadMore, loadingShots);

  const openProfile = (userId: string, mode: 'public' | 'studio') => {
    setSelectedProfileId(userId);
    setViewMode(mode);
  };

  const handleSave = async (shotId: string) => { if (!user) return; await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId }); setSavedShots(prev => [...prev, shotId]); };
  const handleLike = async (shotId: string) => { if (!user) return; const alreadyLiked = likedShots.includes(shotId); if (alreadyLiked) { setLikedShots(prev => prev.filter(id => id !== shotId)); await supabase.from("likes").delete().match({ user_id: user.id, shot_id: shotId }); } else { setLikedShots(prev => [...prev, shotId]); await supabase.from("likes").insert({ user_id: user.id, shot_id: shotId }); } };

  return (
    <div className="fixed left-0 right-0 bottom-0 top-14 z-[40] bg-gray-950 flex flex-col md:grid md:grid-cols-[180px_1fr] overflow-hidden">
        
        {/* --- SIDEBAR IZQUIERDO --- */}
        <aside className="w-full h-auto md:h-full border-r border-gray-800 bg-gray-900/50 overflow-y-auto pt-4 pb-4 custom-scrollbar">
            <div className="px-2 mb-4 flex justify-between items-center md:block">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider text-center">RELACIONES</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold md:hidden">&times;</button>
            </div>
            <div className="space-y-1 px-1">
                {loadingUsers ? (
                    <div className="text-center text-gray-500 p-4 text-xs">Cargando...</div>
                ) : relatedUsers.length === 0 ? (
                    <div className="text-center text-gray-600 text-xs p-4">Vacío</div>
                ) : (
                 relatedUsers.map((u) => (
                    <div key={u.id} className="w-full flex flex-col items-center gap-1 p-1">
                        <div className="w-full flex items-center justify-center gap-1">
                            <button onClick={() => openProfile(u.id, 'public')} className="flex flex-col items-center hover:opacity-80 transition">
                                <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-gray-600">
                                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : (u.username || "?").charAt(0).toUpperCase()}
                                </div>
                            </button>
                            {u.hasSharedStudio && (
                                <button onClick={() => openProfile(u.id, 'studio')} className="bg-blue-600 rounded-full w-[28px] h-[28px] flex items-center justify-center shadow hover:bg-blue-500 transition flex-shrink-0" title="Ver Estudio Compartido">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button onClick={() => openProfile(u.id, 'public')} className="w-full text-center hover:opacity-80 transition">
                            <span className="text-[10px] text-gray-400 truncate block px-1">@{u.username}</span>
                        </button>
                    </div>
                 ))
                )}
            </div>
        </aside>

        {/* --- GRID DERECHO --- */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto relative p-2 custom-scrollbar">
            <button onClick={onClose} className="absolute top-2 right-2 text-gray-200 hover:text-white text-2xl font-bold hidden md:block z-10">&times;</button>
            
            {loadingShots && shots.length === 0 ? <div className="text-center py-8 text-gray-400">Cargando...</div> : 
             shots.length === 0 && !loadingUsers ? <div className="text-center py-8 text-gray-500">No sigues a nadie aún.</div> :
             <MasonryGrid 
                shots={shots} 
                setSelectedShot={setSelectedShot} 
                savedShots={savedShots} 
                savingId={null} 
                onSaveShot={handleSave} 
                user={user} 
                likedShots={likedShots} 
                likingId={null} 
                onLike={handleLike}
                columnsClass="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-6"
             />
            }

            {loadingShots && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
            {!hasMore && !loadingShots && shots.length > 0 && <div className="text-center py-4 text-gray-600 text-sm">Fin de tus relaciones.</div>}

            <div ref={sentinelRef} className="h-1 w-full"></div>
        </div>

        {selectedShot && (
            <ShotDetailModal 
                shot={selectedShot}
                onClose={() => setSelectedShot(null)}
                isSaved={savedShots.includes(selectedShot.id)}
                isSaving={false}
                onSave={() => handleSave(selectedShot.id)}
                user={user}
                isLiked={likedShots.includes(selectedShot.id)}
                likesCount={selectedShot.likes_count || 0}
                onLike={() => handleLike(selectedShot.id)}
                viewsCount={selectedShot.views_count || 0}
                onView={() => {}}
            />
        )}

        {selectedProfileId && (
            <UserProfileOverlay 
                userId={selectedProfileId}
                onClose={() => setSelectedProfileId(null)}
                studioMode={viewMode === 'studio'}
            />
        )}
    </div>
  );
}