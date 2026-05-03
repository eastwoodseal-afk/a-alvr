"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import MasonryGrid from "./MasonryGrid";
import ShotDetailModal from "./ShotDetailModal";

interface Props {
  userId: string;
  onClose: () => void;
  studioMode?: boolean; // Prop para activar el modo estudio
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
        // LLAMADA RPC: Usa la función segura get_studio_shots
        const response = await supabase.rpc('get_studio_shots', { p_owner_id: userId });
        data = response.data;
        error = response.error;
    } else {
        // QUERY NORMAL: Vista pública (solo aprobados)
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
        console.error("Error loading studio/shots", error);
        setShots([]);
    } else if (data) {
        // Normalizar datos
        const formatted = data.map((s: any) => ({
            ...s, 
            id: s.id.toString(), 
            username: profile?.username
        }));
        setShots(formatted);
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
      supabase.from('saved_shots').select('shot_id').eq('user_id', currentUser.id),
      supabase.from('likes').select('shot_id').eq('user_id', currentUser.id)
    ]);
    if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => s.shot_id.toString()));
    if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => l.shot_id.toString()));
  };

  const handleToggleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { target_user_id: userId });
      if (error) throw error;
      setIsFollowing(data);
      setProfile((prev: any) => ({ ...prev, followers_count: (prev.followers_count || 0) + (data ? 1 : -1) }));
    } catch (err) { console.error(err); }
    setFollowLoading(false);
  };

  const handleSave = async (shotId: string) => {
    if (!currentUser) return;
    await supabase.from('saved_shots').insert({ user_id: currentUser.id, shot_id: shotId });
    setSavedShots(prev => [...prev, shotId]);
  };

  const handleLike = async (shotId: string) => {
    if (!currentUser) return;
    const alreadyLiked = likedShots.includes(shotId);
    if (alreadyLiked) {
        setLikedShots(prev => prev.filter(id => id !== shotId));
        await supabase.from('likes').delete().match({ user_id: currentUser.id, shot_id: shotId });
    } else {
        setLikedShots(prev => [...prev, shotId]);
        await supabase.from('likes').insert({ user_id: currentUser.id, shot_id: shotId });
    }
  };

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" onClick={onClose}>
      {/* CONTENEDOR FULL WIDTH (Sin max-w-4xl) */}
      <div className="w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* --- HEADER ULTRA COMPACTO --- */}
        <div className="flex items-center gap-2 p-2 md:p-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold mr-1">&times;</button>
            
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-700 overflow-hidden border-2 border-yellow-500 shadow-lg flex-shrink-0 flex items-center justify-center">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-lg text-white font-bold">{(profile?.username || "?").charAt(0).toUpperCase()}</span>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1 truncate">
                    <span className="text-sm md:text-base font-bold text-white truncate">@{profile?.username || "..."}</span>
                    {/* Badge de Estudio */}
                    {studioMode && (
                        <span className="text-[8px] bg-blue-600 px-1.5 py-0.5 rounded text-white font-bold animate-pulse">ESTUDIO</span>
                    )}
                    {profile?.role === 'admin' && <span className="text-[8px] bg-red-600 px-1 rounded text-white">Admin</span>}
                    {profile?.role === 'superadmin' && <span className="text-[8px] bg-purple-600 px-1 rounded text-white">SA</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-400">
                    <span><strong className="text-white">{profile?.followers_count || 0}</strong> Seg.</span>
                    <span><strong className="text-white">{profile?.following_count || 0}</strong> Sig.</span>
                    <span><strong className="text-white">{shots.length}</strong> Shots</span>
                </div>
            </div>

            {!isOwnProfile && currentUser && !studioMode && (
                <button 
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`px-3 py-1 rounded font-bold transition-all text-xs ${isFollowing ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                >
                    {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
                </button>
            )}
        </div>

        {/* --- CONTENIDO SCROLLABLE --- */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
            {loading ? (
                <div className="text-center text-gray-500 py-20 text-sm">Cargando estudio...</div>
            ) : shots.length === 0 ? (
                <div className="text-center text-gray-600 py-20 text-sm">
                    {studioMode ? "El estudio está vacío." : "Sin shots públicos."}
                </div>
            ) : (
                <MasonryGrid 
                    shots={shots}
                    setSelectedShot={setSelectedShot}
                    savedShots={savedShots}
                    savingId={null}
                    onSaveShot={handleSave}
                    user={currentUser}
                    likedShots={likedShots}
                    likingId={null}
                    onLike={handleLike}
                />
            )}
        </div>

        {selectedShot && (
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
                onView={() => {}}
            />
        )}

      </div>
    </div>
  );
}