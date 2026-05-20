"use client";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const GHOST_USER_ID = '9e717b49-395c-48d2-add9-7a60ab9c7baf';

interface Shot {
  id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; uoc_id?: string; uoc_username?: string; category_id?: number | null;
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
  onView: (id: string) => void;
  onOpenCollection?: (userId: string) => void;
  onShotUpdated?: (updatedShot: Shot) => void;
  onDisapprove?: (shotId: string) => void;
}

export default function ShotDetailModal({ shot, onClose, isSaved, isSaving, onSave, user, isLiked, likesCount, onLike, viewsCount, onView, onOpenCollection, onShotUpdated, onDisapprove }: ModalProps) {
  
  const { user: currentUser } = useAuth();
  const hasIncremented = useRef(false);

  const [authorData, setAuthorData] = useState<{ followers_count: number, avatar_url?: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [uocActive, setUocActive] = useState<boolean | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const [curateMode, setCurateMode] = useState(false);
  const [editTitle, setEditTitle] = useState(shot.title || "");
  const [editDescription, setEditDescription] = useState(shot.description || "");
  const [editAuthor, setEditAuthor] = useState(shot.author || "");
  const [editCategoryId, setEditCategoryId] = useState<string>(shot.category_id?.toString() || "");
  const [categories, setCategories] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchAuthorData = async () => {
    if (!shot?.user_id) return;
    try {
      const { data, error } = await supabase.from('profiles').select('followers_count, avatar_url, active').eq('id', shot.user_id).single();
      if (error) throw error;
      if (data && data.active === false) {
        setAuthorData({ followers_count: 0, avatar_url: undefined });
      } else if (data) {
        setAuthorData({ followers_count: data.followers_count || 0, avatar_url: data.avatar_url || null });
      }
    } catch (err) { 
      setAuthorData({ followers_count: 0, avatar_url: undefined });
    }

    if (currentUser) {
      const { data: followData } = await supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', shot.user_id).maybeSingle();
      setIsFollowing(!!followData);
    }
  };

  useEffect(() => { 
    setImgError(false); 
    fetchAuthorData(); 
    if (isAdmin) fetchCategories();
  }, [shot?.user_id, currentUser, isAdmin]);

  useEffect(() => {
    const fetchUocStatus = async () => {
      if (shot?.uoc_id) {
        const { data } = await supabase.from('profiles').select('active').eq('id', shot.uoc_id).single();
        setUocActive(data?.active ?? false);
      } else {
        setUocActive(null);
      }
    };
    fetchUocStatus();
  }, [shot?.uoc_id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const handleToggleFollow = async () => {
    if (!currentUser || !shot?.user_id || followLoading) return;
    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { target_user_id: shot.user_id });
      if (error) throw error;
      setIsFollowing(data);
      await fetchAuthorData(); 
    } catch (err) { console.error("Error siguiendo:", err); } 
    finally { setFollowLoading(false); }
  };

  useEffect(() => {
    if (shot?.id && !hasIncremented.current && onView) {
      hasIncremented.current = true;
      onView(shot.id);
    }
  }, [shot?.id, onView]);

  const handleCurateSave = async () => {
    setEditLoading(true);
    setEditError("");
    const updateData = {
      title: editTitle,
      description: editDescription,
      author: editAuthor,
      category_id: editCategoryId ? parseInt(editCategoryId) : null
    };

    const { error } = await supabase.from('shots').update(updateData).eq('id', shot.id);
    
    if (error) {
      setEditError("Error al guardar cambios.");
    } else {
      if (onShotUpdated) onShotUpdated({ ...shot, ...updateData });
      setCurateMode(false);
    }
    setEditLoading(false);
  };

  if (!shot) return null;
  
  const isOwnShot = currentUser?.id === shot.user_id;
  const isGhost = shot?.user_id === GHOST_USER_ID; 
  const displayUsername = shot.username || "Acervo A'AL";

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[49] flex flex-col items-center pt-3 pb-[20px]" style={{ top: '56px', background: 'rgba(10, 24, 51, 0.85)' }}>
        
        <div className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center w-full sm:w-fit p-4 overflow-y-auto custom-scrollbar" style={{ maxWidth: '100vw', maxHeight: '90vh', boxSizing: 'border-box', background: 'rgba(17, 24, 39, 0.85)' }}>
        
        {/* Botones Laterales Derechos */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10 bg-gray-500/50 backdrop-blur-sm rounded-xl p-2 mr-1">
          
          <button onClick={onClose} className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full p-1.5 shadow transition" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* 🆕 BOTÓN WHATSAPP COMPARTIR SHOT */}
          <button 
            onClick={() => {
              const url = `${window.location.origin}/shot/${shot.id}`;
              const text = `Mira esta pieza de arquitectura en A'AL VR 🏛️\n\n👉 ${url}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="bg-green-600 hover:bg-green-500 text-white rounded-full p-1.5 shadow transition"
            title="Compartir por WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </button>

          {isAdmin && !curateMode && (
            <button onClick={() => setCurateMode(true)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5 shadow transition" title="Modo Curaduría">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
            </button>
          )}

          {isAdmin && curateMode && (
             <button onClick={() => { setCurateMode(false); setEditError(""); }} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full p-1.5 shadow transition" title="Salir de Curaduría">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
            </button>
          )}

          {isAdmin && curateMode && onDisapprove && (
            <button onClick={() => onDisapprove(shot.id)} className="bg-orange-600 hover:bg-orange-500 text-white rounded-full p-1.5 shadow transition" title="Archivar Shot">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125h2.25m-10.125 0h17.25M5.625 7.5h12.75" /></svg>
            </button>
          )}

          {user && !curateMode && (
            <button className={`rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg`} style={isSaved ? { background: '#facc15', color: '#fff' } : { background: 'rgba(236, 72, 153, 0.35)', color: '#fff' }} disabled={isSaved || isSaving} onClick={(e) => { e.stopPropagation(); onSave(); }}>
              {isSaved ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" /></svg>}
            </button>
          )}
          
          {!curateMode && (
            <div className="flex flex-col items-center gap-0.5">
              {user && (
                <button className={`rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg`} style={isLiked ? { background: '#ef4444', color: '#fff' } : { background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }} onClick={(e) => { e.stopPropagation(); onLike(); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "white" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                </button>
              )}
              <span className="text-white text-xs font-bold">{likesCount || 0}</span>
            </div>
          )}
          
          {!curateMode && (
            <div className="flex flex-col items-center gap-0.5 mt-2">
               <div className="rounded-full w-[28px] h-[28px] flex items-center justify-center bg-gray-700 text-white"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
               <span className="text-white text-xs font-bold">{viewsCount || 0}</span>
            </div>
          )}
        </div>

        {/* Imagen Tamaño Real */}
        <img src={shot.image_url} alt={shot.title || "Shot"} className="object-contain rounded-lg mb-4" style={{ width: '100%', maxWidth: '100vw', height: 'auto', display: 'block' }} onLoad={e => { const img = e.currentTarget; if (img.parentElement) { if (window.innerWidth >= 640) { img.parentElement.style.width = img.naturalWidth + 'px'; } else { img.parentElement.style.width = '100%'; } } }} />
        
        <div className="w-full text-left">
          
          {curateMode ? (
            <div className="space-y-3 mb-4">
              <div><label className="text-[10px] text-gray-400 block mb-1">Título</label><input type="text" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={editLoading} /></div>
              <div><label className="text-[10px] text-gray-400 block mb-1">Arquitecto / Estudio</label><input type="text" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} disabled={editLoading} /></div>
              <div><label className="text-[10px] text-gray-400 block mb-1">Descripción</label><textarea className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={editLoading} /></div>
              <div><label className="text-[10px] text-gray-400 block mb-1">Categoría</label><select className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)} disabled={editLoading}><option value="">Sin Categoría</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
              {editError && <div className="text-red-400 text-xs text-center">{editError}</div>}
              <div className="flex gap-2">
                <button onClick={handleCurateSave} disabled={editLoading} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-sm transition disabled:opacity-50">{editLoading ? "Guardando..." : "Guardar Cambios"}</button>
                <button onClick={() => setCurateMode(false)} disabled={editLoading} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded-lg text-sm transition">Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              {shot.author && (<div className="text-lg text-yellow-400 font-bold mb-1">{shot.author}</div>)}
              {shot.title && <div className="text-base font-bold text-gray-100 mb-2">{shot.title}</div>}
              {shot.description && <div className="text-sm text-gray-300 mb-4">{shot.description}</div>}
            </>
          )}

          {!curateMode && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800 gap-4">
              
              {shot.uoc_username ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] text-green-800 leading-none flex-shrink-0">UOC</span>
                  {uocActive && onOpenCollection ? (
                    <button onClick={() => onOpenCollection(shot.uoc_id!)} className="text-[10px] text-blue-500/70 hover:text-blue-400 italic truncate hover:underline text-left">@{shot.uoc_username}</button>
                  ) : (
                    <span className="text-[10px] text-green-600/70 italic truncate">@{shot.uoc_username}</span>
                  )}
                </div>
              ) : ( <div /> )}

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-white font-semibold">{displayUsername}</div>
                  {!isGhost && <div className="text-[9px] text-gray-500">{authorData?.followers_count ?? 0} seg</div>}
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-[9px] font-bold text-white border border-gray-600 flex-shrink-0">
                   {authorData?.avatar_url && !imgError ? (<img src={authorData.avatar_url} className="w-full h-full object-cover" alt="Avatar" onError={() => setImgError(true)} />) : (<span>{displayUsername.charAt(0).toUpperCase()}</span>)}
                </div>
                {currentUser && !isOwnShot && !isGhost && (
                   <button onClick={handleToggleFollow} disabled={followLoading} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${isFollowing ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-gray-700 text-yellow-400 hover:bg-gray-600 border-yellow-500'} ${followLoading ? 'opacity-50 cursor-wait' : ''}`}>
                       {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
                   </button>
                )}
                {isGhost && (<span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded font-semibold">Pieza del Archivo</span>)}
                {isOwnShot && (<span className="text-[9px] bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-700">Tú</span>)}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}