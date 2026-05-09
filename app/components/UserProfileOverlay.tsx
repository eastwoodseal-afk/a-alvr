"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import MasonryGrid from "./MasonryGrid";
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
    fetchProfile();
    fetchShots();
    checkFollowStatus();
    fetchUserInteractions();
  }, [userId, currentUser, studioMode]);

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
            .select('id, image_url, title, description, user_id, author, likes_count, views_count')
            .eq('user_id', userId)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
    }
    
    if (error) {
        console.error("Error:", error);
        setShots([]);
    } else if (data) {
        setShots(data.map((s: any) => ({...s, id: s.id.toString()})));
    }
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

  const handleToggleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    const { data } = await supabase.rpc('toggle_follow', { target_user_id: userId });
    setIsFollowing(data);
    setProfile((prev: any) => ({ ...prev, followers_count: (prev.followers_count || 0) + (data ? 1 : -1) }));
    setFollowLoading(false);
  };

  const handleSave = async (shotId: string) => { if (!currentUser) return; await supabase.from("saved_shots").insert({ user_id: currentUser.id, shot_id: shotId }); setSavedShots(prev => [...prev, shotId]); };
  const handleLike = async (shotId: string) => { if (!currentUser) return; const alreadyLiked = likedShots.includes(shotId); if (alreadyLiked) { setLikedShots(prev => prev.filter(id => id !== shotId)); await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); } else { setLikedShots(prev => [...prev, shotId]); await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); } };

  const isOwnProfile = currentUser?.id === userId;

  return (
    // CORRECCIÓN: z-[60], fixed full width, top-14 (56px) explícito
    <div className="fixed top-14 right-0 bottom-0 left-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* --- HEADER RENGLÓN (Sin aire) --- */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 bg-gray-900/50 flex-shrink-0 h-10">
        
        {/* Avatar 28px */}
        <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white border border-gray-600">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <span>{(profile?.username || "?").charAt(0).toUpperCase()}</span>}
        </div>

        {/* Nombre y Contadores (En una sola línea, pequeños) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 h-7 overflow-hidden">
            <span className="text-xs font-bold text-white truncate">@{profile?.username || "..."}</span>
            
            {/* Badges */}
            {profile?.role === 'admin' && <span className="text-[8px] bg-red-600 px-1 rounded text-white font-bold flex-shrink-0">Admin</span>}
            {profile?.role === 'superadmin' && <span className="text-[8px] bg-purple-600 px-1 rounded text-white font-bold flex-shrink-0">SA</span>}
            {studioMode && <span className="text-[8px] bg-blue-600 px-1 rounded text-white font-bold animate-pulse flex-shrink-0">ESTUDIO</span>}

            {/* Contadores (ocultos en móvil muy pequeño si falta espacio) */}
            <div className="hidden sm:flex items-center gap-2 text-[9px] text-gray-400 border-l border-gray-700 pl-1.5 ml-1 flex-shrink-0">
                <span><strong className="text-white">{profile?.followers_count || 0}</strong> Seg</span>
                <span><strong className="text-white">{shots.length}</strong> Shots</span>
            </div>
        </div>

        {/* Botón Seguir (28px alto) */}
        {!isOwnProfile && currentUser && (
            <button onClick={handleToggleFollow} disabled={followLoading} className={`h-7 px-3 rounded font-bold transition-all text-[10px] flex-shrink-0 ${isFollowing ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>
                {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
            </button>
        )}

        {/* Botón Cerrar (X) */}
        <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-gray-700 hover:bg-red-500 text-white flex items-center justify-center flex-shrink-0 transition font-bold text-lg"
            title="Cerrar"
        >
            &times;
        </button>
      </div>

      {/* --- GRID DE SHOTS --- */}
      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
        {loading ? <div className="text-center py-8 text-gray-400">Cargando...</div> : 
         shots.length === 0 ? <div className="text-center py-8 text-gray-600">{studioMode ? "El estudio está vacío." : "Sin shots."}</div> :
         <MasonryGrid shots={shots} setSelectedShot={setSelectedShot} savedShots={savedShots} savingId={null} onSaveShot={handleSave} user={currentUser} likedShots={likedShots} likingId={null} onLike={handleLike} />
        }
      </div>

      {/* Modal Shot */}
      {selectedShot && <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={savedShots.includes(selectedShot.id)} isSaving={false} onSave={() => handleSave(selectedShot.id)} user={currentUser} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={() => {}} />}
    </div>
  );
}