"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";

interface Props {
  userId: string;
  onClose: () => void;
  studioMode?: boolean;
}

export default function UserProfileOverlay({ userId, onClose, studioMode = false }: Props) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [selectedShot, setSelectedShot] = useState<any | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setProfile(data);
    };

    const fetchShots = async () => {
      setLoading(true);
      let data = null;
      let error = null;

      if (studioMode) {
          const response = await supabase.rpc('get_studio_shots', { p_owner_id: userId });
          data = response.data;
          error = response.error;
      } else {
          const response = await supabase
              .from('shots')
              .select('id, image_url, title, description, user_id, author, likes_count, views_count, profiles!shots_user_id_fkey(username)')
              .eq('user_id', userId)
              .eq('is_approved', true)
              .order('created_at', { ascending: false });
          data = response.data;
          error = response.error;
      }
      
      if (error) { console.error("Error:", error); setShots([]); } 
      else if (data) { setShots(data.map((s: any) => ({...s, id: s.id.toString()}))); }
      setLoading(false);
    };

    const checkFollowStatus = async () => {
      if (!currentUser || currentUser.id === userId) return;
      const { data } = await supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle();
      setIsFollowing(!!data);
    };

    const fetchUserInteractions = async () => {
      if (!currentUser) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", currentUser.id),
        supabase.from("likes").select("shot_id").eq("user_id", currentUser.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
    };

    Promise.all([fetchProfile(), fetchShots(), checkFollowStatus(), fetchUserInteractions()]);
  }, [userId, currentUser?.id, studioMode]);

  const handleToggleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    const { data } = await supabase.rpc('toggle_follow', { target_user_id: userId });
    setIsFollowing(data);
    setProfile((prev: any) => ({ ...prev, followers_count: (prev.followers_count || 0) + (data ? 1 : -1) }));
    setFollowLoading(false);
  };

  const handleSave = async (shotId: string) => { if (!currentUser) return; await supabase.from("saved_shots").insert({ user_id: currentUser.id, shot_id: shotId }); setSavedShots(prev => [...prev, shotId]); };
  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s));
    if (alreadyLiked) { await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); } 
    else { await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); } 
  };

  const handleView = async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s));
  };

  const isOwnProfile = currentUser?.id === userId;
  const isInactive = profile?.active === false; // NUEVO: Estado de archivo

  return (
    <div className="fixed top-14 right-0 bottom-0 left-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* HEADER RENGLÓN MODIFICADO */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 bg-gray-900/50 flex-shrink-0 h-10">
        
        {/* Botón Regresar */}
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition" title="Regresar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>

        <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-gray-600">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <span>{(profile?.username || "?").charAt(0).toUpperCase()}</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 h-7 overflow-hidden">
            <span className="text-xs font-bold text-white truncate">@{profile?.username || "..."}</span>
            
            {/* NUEVO: ETIQUETA DE CUENTA INACTIVA */}
            {isInactive && (
              <span className="text-[8px] bg-red-900/50 text-red-400 border border-red-800 px-1.5 rounded font-bold flex-shrink-0 uppercase tracking-wider">Inactivo</span>
            )}

            {studioMode && !isInactive && <span className="text-[8px] bg-blue-600 px-1 rounded text-white font-bold animate-pulse flex-shrink-0">ESTUDIO</span>}
            {!isInactive && (
              <div className="hidden sm:flex items-center gap-2 text-[9px] text-gray-400 border-l border-gray-700 pl-1.5 ml-1 flex-shrink-0">
                  <span><strong className="text-white">{profile?.followers_count || 0}</strong> Seg</span>
                  <span><strong className="text-white">{shots.length}</strong> Shots</span>
              </div>
            )}
        </div>
        
        {/* NUEVO: Ocultar botón seguir si la cuenta está inactiva */}
        {!isOwnProfile && currentUser && !isInactive && (
            <button onClick={handleToggleFollow} disabled={followLoading} className={`h-7 px-3 rounded font-bold transition-all text-[10px] flex-shrink-0 ${isFollowing ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>
                {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
            </button>
        )}
      </div>

      {/* NUEVO: VISTA DE CUENTA INACTIVA / ARCHIVADA */}
      {isInactive ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-700 mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          <h3 className="text-lg font-bold text-gray-500">Archivo Inactivo</h3>
          <p className="text-sm text-gray-600 mt-2 max-w-xs">Este usuario ha decidido abandonar el Ateneo. Su identidad ha sido archivada, pero sus aportes al acervo perduran.</p>
        </div>
      ) : (
        // GRID DE SHOTS (Si la cuenta está activa)
        <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
          {loading ? <div className="text-center py-8 text-gray-400">Cargando...</div> : 
           shots.length === 0 ? <div className="text-center py-8 text-gray-600">{studioMode ? "El estudio está vacío." : "Sin shots."}</div> :
           <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
              {shots.map(shot => (
                <ShotCard 
                  key={shot.id} 
                  shot={shot} 
                  isSaved={savedShots.includes(shot.id)} 
                  isSaving={false} 
                  onSave={() => handleSave(shot.id)}
                  isLiked={likedShots.includes(shot.id)}
                  likesCount={shot.likes_count || 0}
                  isLiking={false}
                  onLike={() => handleLike(shot.id)}
                  viewsCount={shot.views_count || 0}
                  user={currentUser}
                  onClick={() => setSelectedShot(shot)}
                />
              ))}
           </div>
          }
        </div>
      )}

      {/* MODAL DETALLE (Solo si la cuenta está activa) */}
      {!isInactive && selectedShot && ( 
        <ShotDetailModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          isSaved={savedShots.includes(selectedShot.id)} 
          isSaving={false} 
          onSave={() => handleSave(selectedShot.id)} 
          user={currentUser} 
          isLiked={likedShots.includes(selectedShot.id)} 
          likesCount={selectedShot.likes_count || 0} 
          onLike={() => handleLike(selectedShot.id)} 
          viewsCount={selectedShot.views_count || 0} 
          onView={handleView}
        /> 
      )}
    </div>
  );
}