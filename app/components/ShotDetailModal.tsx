import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

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

interface ModalProps {
  shot: Shot; 
  onClose: () => void;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  user: any;
  isLiked: boolean;
  likesCount: number;
  onLike: () => void;
  viewsCount: number;
  onView?: (id: string) => void;
}

export default function ShotDetailModal({ shot, onClose, isSaved, isSaving, onSave, user, isLiked, likesCount, onLike, viewsCount, onView }: ModalProps) {
  
  const { user: currentUser } = useAuth();
  const hasIncremented = useRef(false);

  const [authorData, setAuthorData] = useState<{ followers_count: number, avatar_url?: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // --- FETCH DATA ---
  const fetchAuthorData = async () => {
    if (!shot?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('followers_count, avatar_url')
        .eq('id', shot.user_id)
        .single();

      if (error) throw error;
      
      if (data) {
        setAuthorData({
          followers_count: data.followers_count || 0,
          avatar_url: data.avatar_url || null
        });
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
      // Dejamos el estado por defecto (0 seguidores)
      setAuthorData({ followers_count: 0 });
    }

    // Check follow status
    if (currentUser) {
      const { data: followData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', shot.user_id)
        .maybeSingle();
        
      setIsFollowing(!!followData);
    }
  };

  useEffect(() => {
    fetchAuthorData();
  }, [shot?.user_id, currentUser]);

  const handleToggleFollow = async () => {
    if (!currentUser || !shot?.user_id || followLoading) return;
    setFollowLoading(true);

    try {
      const { data, error } = await supabase.rpc('toggle_follow', { 
        target_user_id: shot.user_id 
      });

      if (error) throw error;

      setIsFollowing(data);
      await fetchAuthorData(); // Refrescar
      
    } catch (err) {
      console.error("Error siguiendo:", err);
    } finally {
      setFollowLoading(false);
    }
  };
  // -------------------------------

  useEffect(() => {
    if (shot?.id && !hasIncremented.current && onView) {
      hasIncremented.current = true;
      onView(shot.id);
      supabase.rpc('increment_view', { shot_id: parseInt(shot.id) }).then(({ error }) => {
        if (error) console.error("Error incrementing view", error);
      });
    }
  }, [shot?.id, onView]);

  if (!shot) return null;
  
  const isOwnShot = currentUser?.id === shot.user_id;

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col items-center pt-[40px] pb-[80px] overflow-auto custom-scrollbar" style={{ top: '64px', maxHeight: 'calc(100vh - 64px)', background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center overflow-auto custom-scrollbar w-full sm:w-fit px-4 sm:px-8 p-6"
        style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}
      >
        
        {/* BOTONES DERECHA */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10 bg-black/50 backdrop-blur-sm rounded-xl p-2">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow" onClick={onClose}>&times;</button>
          {user && (
            <button
              className={`rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg`}
              style={isSaved ? { background: '#facc15', color: '#fff', cursor: 'default' } : { background: 'rgba(236, 72, 153, 0.35)', backdropFilter: 'blur(8px)', color: '#fff' }}
              disabled={isSaved || isSaving}
              onClick={(e) => { e.stopPropagation(); onSave(); }}
            >
              {isSaved ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" /></svg>}
            </button>
          )}
          <div className="flex flex-col items-center gap-0.5">
            {user && (
              <button className={`rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg`} style={isLiked ? { background: '#ef4444', color: '#fff' } : { background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }} onClick={(e) => { e.stopPropagation(); onLike(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "white" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
              </button>
            )}
            <span className="text-white text-xs font-bold">{likesCount || 0}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 mt-2">
             <div className="rounded-full w-[28px] h-[28px] flex items-center justify-center bg-gray-700 text-white"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
             <span className="text-white text-xs font-bold">{viewsCount || 0}</span>
          </div>
        </div>

        <img src={shot.image_url} alt={shot.title || "Shot"} className="object-contain rounded-lg mb-4" style={{ width: '100%', maxWidth: '100vw', height: 'auto', maxHeight: '80vh', display: 'block' }} onLoad={e => { const img = e.currentTarget; if (img.parentElement) { if (window.innerWidth >= 640) { const naturalWidth = Math.min(img.naturalWidth, 1600); img.parentElement.style.width = naturalWidth + 'px'; } else { img.parentElement.style.width = '100%'; } } }} />
        
        <div className="w-full text-left">
          
          {shot.author && (<div className="text-lg text-yellow-400 font-bold mb-1">{shot.author}</div>)}
          {shot.title && <div className="text-base font-bold text-gray-100 mb-2">{shot.title}</div>}
          {shot.description && <div className="text-sm text-gray-300 mb-4">{shot.description}</div>}

          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-800">
            
            <div className="text-right">
                <div className="text-sm text-white font-bold">{shot.username || "Anónimo"}</div>
                <div className="text-[10px] text-gray-500">{authorData?.followers_count ?? 0} seguidores</div>
            </div>

            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white border border-gray-600">
               {authorData?.avatar_url ? <img src={authorData.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : (shot.username || "?").charAt(0).toUpperCase()}
            </div>

            {currentUser && !isOwnShot && (
               <button onClick={handleToggleFollow} disabled={followLoading} className={`px-3 py-1 rounded text-xs font-bold transition-all ${isFollowing ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'} ${followLoading ? 'opacity-50 cursor-wait' : ''}`}>
                   {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
               </button>
            )}
            {isOwnShot && (<span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-500 border border-gray-700">Tú</span>)}

          </div>
          
        </div>
      </div>
    </div>
  );
}