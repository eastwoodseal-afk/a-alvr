"use client";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useShotInteractions } from "../lib/useShotInteractions";
import CuratePanel from "./CuratePanel";
import ProjectTextPanel from "./ProjectTextPanel";
import TechnicalSheetPanel from "./TechnicalSheetPanel";
import { Tag } from "../lib/tagUtils";
import { FACET_SLUGS } from "../lib/facetConstants";

const GHOST_USER_ID = '9e717b49-395c-48d2-add9-7a60ab9c7baf';

interface Shot {
  id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; uoc_id?: string; uoc_username?: string; category_id?: number | null; category_name?: string; category_slug?: string; source_url?: string; tags?: Tag[];
  work_name?: string;
  land_area?: string;
  construction_area?: string;
  awards?: string;
  info_source?: string;
  objective?: string;
  functionality?: string;
  challenges?: string;
  construction_method?: string;
  location_type?: string;
  designers?: string;
  client?: string;
  original_use?: string;
  year?: string;
  photographer?: string;
  locality?: string;
}

interface ModalProps {
  shot: Shot; 
  onClose: () => void;
  user: any;
  initialIsLiked?: boolean;
  initialIsSaved?: boolean;
  initialLikesCount?: number;
  onOpenCollection?: (userId: string) => void;
  onShotUpdated?: (updatedShot: Shot) => void;
  onDisapprove?: (shotId: string) => void;
  onRelinquish?: (shotId: string) => void;
  onLikeChange?: (newIsLiked: boolean, newCount: number) => void; 
  onSaveChange?: (newIsSaved: boolean) => void;
}

export default function ShotDetailModal({ shot, onClose, user, initialIsLiked, initialIsSaved, initialLikesCount, onOpenCollection, onShotUpdated, onDisapprove, onRelinquish, onLikeChange, onSaveChange }: ModalProps) {
  
  const { user: currentUser } = useAuth();
  const [currentShot, setCurrentShot] = useState<Shot>(shot);
  const [loadingData, setLoadingData] = useState(true);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  
  const { isLiked, likesCount, isLiking, handleLike, isSaved, isSaving, handleSave, viewsCount, handleView, setIsLiked, setIsSaved, setLikesCount, setViewsCount } = useShotInteractions({
    shotId: currentShot.id,
    userId: currentUser?.id,
    initialIsLiked: initialIsLiked ?? false, 
    initialIsSaved: initialIsSaved ?? false,
    initialLikesCount: initialLikesCount ?? currentShot.likes_count ?? 0,
    initialViewsCount: currentShot.views_count || 0,
    onLikeChange,
    onSaveChange
  });

  const [authorData, setAuthorData] = useState<{ followers_count: number, avatar_url?: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [uocActive, setUocActive] = useState(true);
  const [relatedShots, setRelatedShots] = useState<Shot[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isOwnShot = currentUser?.id === currentShot.user_id;
  const isGhost = currentShot?.user_id === GHOST_USER_ID; 
  
  const [curateMode, setCurateMode] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAllData = async (shotId: string) => {
    setLoadingData(true);
    const { data, error } = await supabase.rpc('get_shot_detail', { 
      p_shot_id: parseInt(shotId), 
      p_user_id: currentUser?.id || null 
    });

    if (error || !data || data.error) {
      console.error("Error cargando detalle:", error || data?.error);
      setLoadingData(false);
      return;
    }

    const shotData = data.shot as Shot;
    setCurrentShot(shotData);
    setAuthorData(data.author_data);
    setIsFollowing(data.is_following);
    setUocActive(data.uoc_active);
    setRelatedShots(data.related_shots || []);
    
    if (data.tags) {
      setCurrentShot(prev => ({ ...prev, tags: data.tags }));
    }
    
    setLikesCount(shotData.likes_count || 0);
    setViewsCount(shotData.views_count || 0);

    if (currentUser?.id) {
      const [likeRes, saveRes] = await Promise.all([
        supabase.from('likes').select('shot_id').match({ user_id: currentUser.id, shot_id: shotId }).maybeSingle(),
        supabase.from('saved_shots').select('shot_id').match({ user_id: currentUser.id, shot_id: shotId }).maybeSingle()
      ]);
      setIsLiked(!!likeRes.data);
      setIsSaved(!!saveRes.data);
    } else {
      setIsLiked(false);
      setIsSaved(false);
    }

    handleView();
    setLoadingData(false);
  };

  useEffect(() => {
    fetchAllData(currentShot.id);
  }, [currentShot.id, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser || !currentShot?.user_id || followLoading) return;
    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { target_user_id: currentShot.user_id });
      if (error) throw error;
      setIsFollowing(data);
      if (authorData) setAuthorData({...authorData, followers_count: authorData.followers_count + (data ? 1 : -1)});
    } catch (err) { console.error("Error:", err); } 
    finally { setFollowLoading(false); }
  };

  const handleCurateSave = (updatedShot: Shot) => {
    setCurrentShot(updatedShot);
    if (onShotUpdated) onShotUpdated(updatedShot);
    setCurateMode(false);
  };

  const handleRelatedClick = async (relatedShotId: string) => {
    setCurrentShot(prev => ({...prev, id: String(relatedShotId)}));
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = () => {
    if (currentShot.category_id) {
      window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: currentShot.category_id.toString() }));
      onClose();
    }
  };

  const handleTagClick = (tag: Tag) => {
    if (!tag.id) return;
    window.dispatchEvent(new CustomEvent('tag-filter-changed', { detail: { id: tag.id.toString(), name: tag.name } }));
    onClose();
  };

  const obraTag = currentShot.tags?.find(tag => tag.facet === FACET_SLUGS.OBRA);

  const col1 = relatedShots.filter((_, i) => i % 2 === 0);
  const col2 = relatedShots.filter((_, i) => i % 2 !== 0);

  if (!currentShot) return null;
  
  const displayUsername = currentShot.username || "Acervo A'AL";

  const FloatingButtons = () => (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 bg-gray-500/50 backdrop-blur-sm rounded-xl p-1">
      <button onClick={onClose} className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full p-1 shadow transition"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      <button onClick={() => { const url = `${window.location.origin}/shot/${currentShot.id}`; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Mira esta pieza en A'AL VR 🏛️\n\n👉 ${url}`)}`, '_blank'); }} className="bg-green-600 hover:bg-green-500 text-white rounded-full p-1 shadow transition" title="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg></button>
      
      {(isOwnShot || isAdmin) && !curateMode && (
        <button onClick={() => setCurateMode(true)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1 shadow transition" title={isOwnShot ? "Editar mi Shot" : "Curar Shot"}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
        </button>
      )}
      {curateMode && (
        <button onClick={() => setCurateMode(false)} className="bg-gray-600 hover:bg-gray-500 text-white rounded-full p-1 shadow transition" title="Salir">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
        </button>
      )}
      {isAdmin && curateMode && onDisapprove && (
        <button onClick={() => onDisapprove(currentShot.id)} className="bg-orange-600 hover:bg-orange-500 text-white rounded-full p-1 shadow transition" title="Desaprobar (Admin)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125h2.25m-10.125 0h17.25M5.625 7.5h12.75" /></svg>
        </button>
      )}
    </div>
  );

  const ShotInfoBlock = () => (
    <>
      {loadingData ? (
        <div className="text-center text-gray-500 text-xs animate-pulse py-4">Cargando datos...</div>
      ) : !curateMode ? (
        <div className="space-y-3">
          {/* LAYOUT SPLIT */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              {currentShot.author && <div className="text-base text-yellow-400 font-bold leading-tight">{currentShot.author}</div>}
              {currentShot.title && <div className="text-sm font-bold text-gray-100 leading-tight">{currentShot.title}</div>}
            </div>
            
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                {currentShot.uoc_username && uocActive !== null && (
                  <button onClick={() => onOpenCollection?.(currentShot.uoc_id!)} className="flex-shrink-0 bg-green-900/20 border border-green-800/30 rounded-md px-2 py-0.5 text-center hover:bg-green-900/40 transition">
                    <span className="text-[7px] text-green-700 font-bold">UOC</span>
                    <span className="text-[9px] text-green-500 ml-0.5 italic hover:underline">@{currentShot.uoc_username}</span>
                  </button>
                )}
                
                {user && (
                  <button
                    className={`rounded-full w-[26px] h-[26px] flex items-center justify-center shadow-lg transition-colors ${
                      isSaved 
                        ? 'bg-gray-800/60 backdrop-blur-sm border border-yellow-500/70 text-yellow-400' 
                        : 'bg-pink-500/35 backdrop-blur-sm text-gray-300 hover:bg-pink-500/50'
                    }`}
                    disabled={isSaved || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isSaved ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.841-1.672A2.31 2.31 0 0013.86 4H10.14a2.31 2.31 0 00-2.087 1.278l-.84 1.672zM12 16.5a3 3 0 100-6 3 3 0 000 6z" /></svg>
                    )}
                  </button>
                )}
                
                {user && (
                  <button
                    className={`rounded-full w-[26px] h-[26px] flex items-center justify-center shadow-lg transition-colors ${isLiked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    onClick={handleLike}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "white" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  </button>
                )}
                
                <span className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                  <span>❤️{likesCount || 0}</span>
                  <span>👁️{viewsCount || 0}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white border border-gray-600 flex-shrink-0">
                    {authorData?.avatar_url && !imgError ? (<img src={authorData.avatar_url} className="w-full h-full object-cover" onError={() => setImgError(true)} />) : (<span>{displayUsername.charAt(0).toUpperCase()}</span>)}
                  </div>
                  <div className="text-right min-w-0">
                    <div className="text-[11px] text-white font-semibold truncate">{displayUsername}</div>
                    {!isGhost && <div className="text-[9px] text-gray-500">{authorData?.followers_count ?? 0} seg</div>}
                  </div>
                </div>
                
                {currentUser && !isOwnShot && !isGhost && (
                  <button onClick={handleToggleFollow} disabled={followLoading} className={`h-[22px] px-2 bg-gray-700 text-yellow-400 border border-yellow-500 rounded-full text-[10px] font-bold transition disabled:opacity-50 flex-shrink-0 ${isFollowing ? 'opacity-60' : 'hover:bg-gray-600'}`}>
                    {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
                  </button>
                )}
                {isGhost && (<span className="text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Archivo</span>)}
              </div>
            </div>
          </div>
          
          {currentShot.description && <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{currentShot.description}</p>}
          
          <div className="mt-2 pt-2 border-t border-gray-800"></div>
          
        </div>
      ) : (
        <CuratePanel 
          shot={currentShot} 
          isOwnShot={isOwnShot} 
          isAdmin={isAdmin} 
          onSave={handleCurateSave} 
          onCancel={() => setCurateMode(false)} 
          onRelinquish={(shotId) => { if (onRelinquish) onRelinquish(shotId); onClose(); }} 
        />
      )}
    </>
  );

  const ModalContent = (
    <div className="fixed left-0 right-0 bottom-0 z-[60] flex flex-col items-center pt-3 pb-[20px]" style={{ top: '56px', background: 'rgba(10, 24, 51, 0.88)' }}>
        
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 w-full md:w-[80vw] mx-auto overflow-hidden border border-gray-700" style={{ maxHeight: '95vh' }}>

        {/* LAYOUT ESCRITORIO */}
        <div className="hidden md:flex md:flex-row h-full">
          <div className="w-[62.5%] flex flex-col border-r border-gray-800 overflow-y-auto custom-scrollbar">
            <div className="relative pt-4">
              <img src={currentShot.image_url} alt="" className="w-full h-auto max-h-[65vh] object-contain bg-gray-950" />
              <FloatingButtons />
            </div>
            {currentShot.source_url && (
              <a href={currentShot.source_url} target="_blank" rel="noopener noreferrer" className="block text-center text-[9px] text-gray-700 hover:text-gray-400 truncate px-4 py-1 transition bg-gray-950">{currentShot.source_url}</a>
            )}
            <div className="p-4 flex-1 space-y-4"> {/* Aumenté espacio entre items */}
              <ShotInfoBlock />
              
              {/* 🛠️ ORDEN CAMBIADO: FICHA TÉCNICA PRIMERO */}
              <TechnicalSheetPanel shot={currentShot} />

              {/* 🛠️ TEXTO DEL PROYECTO DESPUÉS */}
              {obraTag && (
                <ProjectTextPanel 
                  obraTag={obraTag}
                  canEdit={isOwnShot || isAdmin}
                  onUpdated={(newUrl) => {
                    setCurrentShot(prev => ({
                      ...prev,
                      tags: prev.tags?.map(t => 
                        t.id === obraTag.id ? { ...t, project_file_url: newUrl } : t
                      )
                    }));
                  }}
                />
              )}
            </div>
          </div>

          <div className="w-[37.5%] bg-gray-950/50 flex flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-gray-800 flex-shrink-0 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                {currentShot.category_name && (<button onClick={handleCategoryClick} className="px-1 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-full text-[8px] font-bold hover:bg-blue-600/50 transition cursor-pointer">{currentShot.category_name}</button>)}
                {currentShot.tags?.filter(t => t.facet !== FACET_SLUGS.OBRA).map(tag => (tag.id ? <button key={tag.id} onClick={() => handleTagClick(tag)} className="px-1 py-0.5 bg-gray-700 text-gray-300 border border-gray-600 rounded-full text-[8px] font-medium hover:bg-gray-600 transition cursor-pointer">{tag.name}</button> : null))}
              </div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex-shrink-0 ml-2">Relaciones</h4>
            </div>
            <div className="flex-1 flex flex-row overflow-hidden">
              <div className="w-1/2 overflow-y-auto custom-scrollbar p-2 border-r border-gray-800">
                {loadingData ? <div className="text-center text-gray-500 text-[10px] animate-pulse pt-8">...</div> : (<div className="space-y-2">{col1.map(rShot => (<div key={rShot.id} onClick={() => handleRelatedClick(rShot.id)} className="cursor-pointer group relative rounded-lg overflow-hidden border border-gray-800 hover:border-yellow-500 transition bg-gray-900"><img src={rShot.image_url} alt={rShot.title} className="w-full h-24 object-cover" /><div className="p-1 bg-gray-900/80 opacity-0 group-hover:opacity-100 absolute bottom-0 left-0 right-0 transition"><p className="text-[8px] text-white font-bold truncate">{rShot.title || rShot.author || "—"}</p></div></div>))}</div>)}
              </div>
              <div className="w-1/2 overflow-y-auto custom-scrollbar p-2">
                {loadingData ? <div className="text-center text-gray-500 text-[10px] animate-pulse pt-8">...</div> : (<div className="space-y-2">{col2.map(rShot => (<div key={rShot.id} onClick={() => handleRelatedClick(rShot.id)} className="cursor-pointer group relative rounded-lg overflow-hidden border border-gray-800 hover:border-yellow-500 transition bg-gray-900"><img src={rShot.image_url} alt={rShot.title} className="w-full h-24 object-cover" /><div className="p-1 bg-gray-900/80 opacity-0 group-hover:opacity-100 absolute bottom-0 left-0 right-0 transition"><p className="text-[8px] text-white font-bold truncate">{rShot.title || rShot.author || "—"}</p></div></div>))}</div>)}
              </div>
            </div>
          </div>
        </div>

        {/* LAYOUT MÓVIL */}
        <div ref={mobileScrollRef} className="flex flex-col md:hidden h-full overflow-y-auto custom-scrollbar">
          <div className="relative pt-4">
            <img src={currentShot.image_url} alt="" className="w-full h-auto max-h-[70vh] object-contain bg-gray-950" />
            <FloatingButtons />
          </div>
          {currentShot.source_url && (
            <a href={currentShot.source_url} target="_blank" rel="noopener noreferrer" className="block text-center text-[9px] text-gray-700 hover:text-gray-400 truncate px-4 py-1 transition bg-gray-950">{currentShot.source_url}</a>
          )}
          <div className="p-4 space-y-4">
            <ShotInfoBlock />
            
            {/* 🛠️ ORDEN CAMBIADO: FICHA TÉCNICA PRIMERO */}
            <TechnicalSheetPanel shot={currentShot} />

            {/* 🛠️ TEXTO DEL PROYECTO DESPUÉS */}
            {obraTag && (
              <ProjectTextPanel 
                obraTag={obraTag}
                canEdit={isOwnShot || isAdmin}
                onUpdated={(newUrl) => {
                  setCurrentShot(prev => ({
                    ...prev,
                    tags: prev.tags?.map(t => 
                      t.id === obraTag.id ? { ...t, project_file_url: newUrl } : t
                    )
                  }));
                }}
              />
            )}
          </div>
          <div className="px-4 pt-2 pb-2 border-t border-gray-800 flex items-center justify-between gap-2 sticky top-0 bg-gray-900 z-10">
            <div className="flex flex-wrap gap-1 min-w-0 flex-1">
              {currentShot.category_name && (<button onClick={handleCategoryClick} className="px-1 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-full text-[8px] font-bold hover:bg-blue-600/50 transition cursor-pointer">{currentShot.category_name}</button>)}
              {currentShot.tags?.filter(t => t.facet !== FACET_SLUGS.OBRA).map(tag => (tag.id ? <button key={tag.id} onClick={() => handleTagClick(tag)} className="px-1 py-0.5 bg-gray-700 text-gray-300 border border-gray-600 rounded-full text-[8px] font-medium hover:bg-gray-600 transition cursor-pointer">{tag.name}</button> : null))}
            </div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex-shrink-0 ml-2">Relaciones</h4>
          </div>
          <div className="p-4 pt-0">
            {loadingData ? <div className="text-center text-gray-500 text-xs animate-pulse pt-4">...</div> : relatedShots.length === 0 ? <div className="text-center text-gray-600 text-xs pt-4 italic">Sin conexiones.</div> : (
              <div className="grid grid-cols-2 gap-2">
                {relatedShots.map(rShot => (
                  <div key={rShot.id} onClick={() => handleRelatedClick(rShot.id)} className="cursor-pointer group relative rounded-lg overflow-hidden border border-gray-800 hover:border-yellow-500 transition bg-gray-900">
                    <img src={rShot.image_url} alt={rShot.title} className="w-full h-28 object-cover" />
                    <div className="p-1 bg-gray-900/80 opacity-0 group-hover:opacity-100 absolute bottom-0 left-0 right-0 transition">
                      <p className="text-[8px] text-white font-bold truncate">{rShot.title || rShot.author || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(ModalContent, document.body);
}