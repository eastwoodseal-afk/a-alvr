"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import UserProfileOverlay from "./UserProfileOverlay";
import PublicCollectionOverlay from "./PublicCollectionOverlay";

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
  
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [shots, setShots] = useState<any[]>([]);
  const [loadingShots, setLoadingShots] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const isFetchingRef = useRef(false);

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [likedShots, setLikedShots] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

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
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[50] bg-gray-950 flex flex-col overflow-hidden"> {/* 🆕 Z-50 */}
        
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">RELACIONES</h3>
        <button onClick={() => setDrawerOpen(!drawerOpen)} className="md:hidden ml-auto bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full h-7 px-3 flex items-center gap-1 text-[10px] font-bold transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.5 19.125a7.125 7.125 0 00-7.124-7.125 9.067 9.067 0 013.462 2.625c.616.798 1.052 1.714 1.277 2.699.09.39.147.788.166 1.19.005.103.008.207.008.311-.001.119-.002.238-.004.357l-.001.011a.75.75 0 01-.363.63 12.985 12.985 0 01-4.921 1.586c1.32.256 2.69.391 4.092.391 1.936 0 3.81-.333 5.55-.955a.75.75 0 00.39-.596l.001-.119v-.003z" /></svg>
          {relatedUsers.length}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {drawerOpen && (<div className="md:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setDrawerOpen(false)} />)}
        <aside className={`fixed md:static top-14 left-0 bottom-0 w-48 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar z-20 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="px-2 py-3 border-b border-gray-800 hidden md:block"><h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider text-center">RELACIONES</h3></div>
          <div className="space-y-1 px-2 py-2">
            {loadingUsers ? <div className="text-center text-gray-500 p-4 text-xs">Cargando...</div> :
             relatedUsers.length === 0 ? <div className="text-center text-gray-600 text-xs p-4">Vacío</div> :
             relatedUsers.map((u) => (
              <div key={u.id} className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800 transition">
                <button onClick={() => { setSelectedCollectionId(u.id); setDrawerOpen(false); }} className="flex items-center gap-2 hover:opacity-80 transition min-w-0 flex-1" title="Ver Colección">
                  <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-gray-600">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : (u.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-gray-300 truncate">@{u.username}</span>
                </button>
                {u.hasSharedStudio && (
                  <button onClick={() => { setSelectedStudioId(u.id); setDrawerOpen(false); }} className="bg-blue-600 rounded-full w-[24px] h-[24px] flex items-center justify-center shadow hover:bg-blue-500 transition flex-shrink-0" title="Ver Estudio">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>
                  </button>
                )}
              </div>
            ))
            }
          </div>
        </aside>

        <div className="flex-1 min-w-0 h-full overflow-y-auto relative p-2 custom-scrollbar">
          {loadingShots && shots.length === 0 ? <div className="text-center py-8 text-gray-400">Cargando...</div> : 
           shots.length === 0 ? <div className="text-center py-8 text-gray-500">Sin shots aprobados.</div> :
           <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
              {shots.map(shot => (
                <ShotCard key={shot.id} shot={shot} isSaved={savedShots.includes(shot.id)} isSaving={false} onSave={() => handleSave(shot.id)} isLiked={likedShots.includes(shot.id)} likesCount={shot.likes_count || 0} isLiking={false} onLike={() => handleLike(shot.id)} viewsCount={shot.views_count || 0} user={currentUser} onClick={() => setSelectedShot(shot)} />
              ))}
           </div>
          }
          {loadingShots && shots.length > 0 && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
          <div ref={sentinelRef} className="h-1 w-full"></div>
        </div>
      </div>

      {selectedCollectionId && (<PublicCollectionOverlay userId={selectedCollectionId} onClose={() => setSelectedCollectionId(null)} />)}
      {selectedStudioId && (<UserProfileOverlay userId={selectedStudioId} onClose={() => setSelectedStudioId(null)} studioMode={true} />)}
      
      {/* 🆕 MODAL DETALLE CORREGIDO */}
      {selectedShot && currentUser && ( 
        <ShotDetailModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          user={currentUser}
          initialIsLiked={likedShots.includes(selectedShot.id)}
          initialIsSaved={savedShots.includes(selectedShot.id)}
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
    </div>
  );
}