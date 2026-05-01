"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import MasonryGrid from "./MasonryGrid";
import ShotDetailModal from "./ShotDetailModal";

interface Props {
  userId: string; // El ID del usuario que estamos viendo
  onClose: () => void;
}

export default function UserProfileOverlay({ userId, onClose }: Props) {
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
  }, [userId, currentUser]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchShots = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shots')
      .select('id, image_url, title, description, user_id, author, likes_count, views_count')
      .eq('user_id', userId)
      .eq('is_approved', true) // Solo shots aprobados
      .order('created_at', { ascending: false });
    
    if (data) {
      const formatted = data.map(s => ({...s, id: s.id.toString(), username: profile?.username}));
      setShots(formatted);
    }
    setLoading(false);
  };

  const checkFollowStatus = async () => {
    if (!currentUser || currentUser.id === userId) return;
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .maybeSingle();
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
      // Actualizamos contador local
      setProfile((prev: any) => ({
        ...prev, 
        followers_count: (prev.followers_count || 0) + (data ? 1 : -1)
      }));
    } catch (err) {
      console.error(err);
    }
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

  if (!profile && !loading) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white z-[60]">Usuario no encontrado <button onClick={onClose} className="ml-4 text-red-500">Cerrar</button></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl mx-auto p-4 pt-20 pb-10" onClick={e => e.stopPropagation()}>
        
        {/* --- HEADER DEL PERFIL --- */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 bg-gray-900 p-6 rounded-2xl border border-gray-800 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl">&times;</button>
            
            {/* Avatar Grande */}
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden border-4 border-yellow-500 shadow-lg flex-shrink-0">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-white font-bold">
                        {(profile?.username || "?").charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white">{profile?.username || "Cargando..."}</h2>
                {profile?.role === 'admin' && <span className="text-xs bg-red-600 px-2 py-0.5 rounded text-white ml-2">Admin</span>}
                {profile?.role === 'superadmin' && <span className="text-xs bg-purple-600 px-2 py-0.5 rounded text-white ml-2">Superadmin</span>}
                
                <p className="text-gray-400 text-sm mt-1">Arquitecto / Creador</p> {/* Podríamos añadir campo bio luego */}

                <div className="flex gap-6 mt-4 justify-center md:justify-start">
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">{profile?.followers_count || 0}</div>
                        <div className="text-xs text-gray-500">Seguidores</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">{profile?.following_count || 0}</div>
                        <div className="text-xs text-gray-500">Siguiendo</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">{shots.length}</div>
                        <div className="text-xs text-gray-500">Shots</div>
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex-shrink-0">
                {!isOwnProfile && currentUser && (
                    <button 
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                        className={`px-6 py-2 rounded-lg font-bold transition-all shadow-lg ${isFollowing ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                    >
                        {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
                    </button>
                )}
            </div>
        </div>

        {/* --- GRID DE SHOTS --- */}
        {loading ? (
            <div className="text-center text-gray-500 py-20">Cargando portfolio...</div>
        ) : shots.length === 0 ? (
            <div className="text-center text-gray-600 py-20">Este usuario aún no ha subido shots.</div>
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

        {/* Modal detalle si clican un shot */}
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