"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AllSavedShotsView from "./AllSavedShotsView";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import PublicCollectionOverlay from "./PublicCollectionOverlay";
import ObrasIndexOverlay from "./ObrasIndexOverlay";
import SavedShotsDrawer from "./SavedShotsDrawer";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { autoTagBoard, batchLinkObra, Tag } from "../lib/tagUtils";

const BATCH_SIZE = 30;

interface Board { id: string; name: string; shot_count?: number; }
interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; is_approved?: boolean; tags?: Tag[]; category_name?: string; }

interface Props {
  userId: string | null | undefined;
  onClose: () => void;
  initialView?: 'all' | null;
}

export default function SavedShotsOverlay({ userId, onClose, initialView = null }: Props) {
  const { user: currentUser } = useAuth();
  
  const [viewMode, setViewMode] = useState<string | null>(initialView);
  const [allSavedShots, setAllSavedShots] = useState<Shot[]>([]);
  const [shotsInBoards, setShotsInBoards] = useState<string[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  const [depositing, setDepositing] = useState(false);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [obraName, setObraName] = useState("");
  const [linkingObra, setLinkingObra] = useState(false);
  const [obraFilter, setObraFilter] = useState<string | null>(null);
  const [showObrasOverlay, setShowObrasOverlay] = useState(false);

  const isAdmin = currentUser?.actualRole === 'admin' || currentUser?.actualRole === 'superadmin';

  useEffect(() => {
    if (userId) {
      supabase.from('profiles').select('username, avatar_url, followers_count, following_count').eq('id', userId).single().then(({ data }) => {
        if(data) setProfileData(data);
      });
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoadingBoards(true);
    supabase.from("boards").select("id, name").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setBoards(data);
      setLoadingBoards(false);
    });
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      const { data: savedData } = await supabase.from('saved_shots').select('shot_id, shots(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username), categories(name), shot_tags(tags(id, name, slug, facet)))').eq('user_id', userId).order('created_at', { ascending: false });
      
      let processedSaved: Shot[] = [];
      if (savedData) {
        processedSaved = savedData.filter((ss: any) => ss.shots !== null).map((ss: any) => ({ 
            ...ss.shots, id: String(ss.shots.id), username: ss.shots.profiles?.username || "Anónimo",
            tags: ss.shots.shot_tags?.map((st: any) => st.tags).filter(Boolean) || [], category_name: ss.shots.categories?.name 
        }));
        setAllSavedShots(processedSaved);
      }

      const { data: boardData } = await supabase.from('board_shots').select('board_id, shot_id');
      if (boardData) {
        const allShotIds = boardData.map((bs: any) => String(bs.shot_id));
        setShotsInBoards(allShotIds);
        const counts: Record<string, number> = {};
        boardData.forEach((bs: any) => { counts[bs.board_id] = (counts[bs.board_id] || 0) + 1; });
        setBoards(prev => prev.map(b => ({ ...b, shot_count: counts[b.id] || 0 })));
      }

      if (currentUser?.id) {
        const { data: likedData } = await supabase.from("likes").select("shot_id").eq("user_id", currentUser.id);
        if (likedData) setLikedShots(likedData.map((l: any) => String(l.shot_id)));
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, currentUser?.id]);

  const unassignedShots = allSavedShots.filter(s => !shotsInBoards.includes(s.id));
  const [boardShots, setBoardShots] = useState<Shot[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    if (selectedShots.length > 0 && viewMode === null) {
      const selectedData = unassignedShots.filter(s => selectedShots.includes(s.id));
      let foundObra = "";
      for (const shot of selectedData) { const obraTag = shot.tags?.find((t: Tag) => t.facet === 'obra'); if (obraTag) { foundObra = obraTag.name; break; } }
      setObraName(foundObra);
    } else { setObraName(""); }
  }, [selectedShots, viewMode, unassignedShots]);

  const obrasByCategory = useMemo(() => {
    const obrasMap = new Map<string, { slug: string; name: string; thumbnail: string; category: string }>();
    allSavedShots.forEach(shot => { shot.tags?.forEach(tag => { if (tag.facet === 'obra' && tag.slug) { if (!obrasMap.has(tag.slug)) { obrasMap.set(tag.slug, { slug: tag.slug, name: tag.name, thumbnail: shot.image_url, category: shot.category_name || 'Sin Categoría' }); } } }); });
    const grouped: Record<string, Array<{ slug: string; name: string; thumbnail: string }>> = {};
    obrasMap.forEach(obra => { const cat = obra.category; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(obra); });
    const sortedGrouped: Record<string, Array<{ slug: string; name: string; thumbnail: string }>> = {};
    Object.keys(grouped).sort().forEach(cat => { sortedGrouped[cat] = grouped[cat].sort((a, b) => a.name.localeCompare(b.name)); });
    return sortedGrouped;
  }, [allSavedShots]);

  useEffect(() => {
    if (viewMode && viewMode !== 'all' && viewMode !== 'obra') {
      setLoadingBoard(true);
      supabase.from('board_shots').select('shot_id, shots(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username), shot_tags(tags(id, name, slug, facet)))').eq('board_id', viewMode).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) { const processed = data.filter((bs: any) => bs.shots !== null).map((bs: any) => ({ ...bs.shots, id: String(bs.shots.id), username: bs.shots.profiles?.username || "Anónimo", tags: bs.shots.shot_tags?.map((st: any) => st.tags).filter(Boolean) || [] })); setBoardShots(processed); }
        setLoadingBoard(false);
      });
    }
  }, [viewMode]);

  const handleNavigate = (mode: string | null, obraSlug: string | null = null) => {
    setViewMode(mode);
    setObraFilter(obraSlug);
    setDrawerOpen(false);
  };

  const handleCreateBoard = async (name: string) => {
    if (!userId) return;
    const { data, error } = await supabase.from('boards').insert({ name, user_id: userId }).select().single();
    if (!error && data) { setBoards(prev => [{ ...data, shot_count: 0 }, ...prev]); await autoTagBoard(name); }
  };

  const handleDepositToBoard = async (boardId: string) => {
    if (selectedShots.length === 0) {
      setViewMode(boardId);
      setObraFilter(null);
      setDrawerOpen(false);
      return;
    }
    setDepositing(true);
    const inserts = selectedShots.map(shot_id => ({ board_id: boardId, shot_id }));
    const { error } = await supabase.from('board_shots').insert(inserts);
    if (!error) {
      setShotsInBoards(prev => [...prev, ...selectedShots]);
      setSelectedShots([]);
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, shot_count: (b.shot_count || 0) + inserts.length } : b));
    } else if (error.code === '23505') alert("Algunos shots ya estaban aquí.");
    setDepositing(false);
  };

  const handleDeleteBoard = async (boardId: string) => {
    await supabase.from('board_shots').delete().eq('board_id', boardId);
    await supabase.from('boards').delete().eq('id', boardId);
    setBoards(prev => prev.filter(b => b.id !== boardId));
    const { data: boardData } = await supabase.from('board_shots').select('board_id, shot_id');
    if (boardData) {
      const counts: Record<string, number> = {}; const allShotIds: string[] = [];
      boardData.forEach((bs: any) => { allShotIds.push(String(bs.shot_id)); counts[bs.board_id] = (counts[bs.board_id] || 0) + 1; });
      setShotsInBoards(allShotIds);
      setBoards(prev => prev.map(b => ({ ...b, shot_count: counts[b.id] || 0 })));
    }
    if (viewMode === boardId) setViewMode(null);
  };

  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    const updateCount = (arr: Shot[]) => arr.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s);
    if (viewMode === null || viewMode === 'obra') setAllSavedShots(updateCount); 
    else setBoardShots(updateCount);
    if (alreadyLiked) await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); 
    else await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); 
  };

  const handleLinkObra = async () => {
    if (!obraName.trim() || selectedShots.length === 0 || !isAdmin) return;
    setLinkingObra(true);
    const success = await batchLinkObra(selectedShots, obraName.trim());
    if (success) {
      const newTag: Tag = { name: obraName.trim(), slug: obraName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''), facet: 'obra' };
      setAllSavedShots(prev => prev.map(s => { if (selectedShots.includes(s.id)) { const existingTags = s.tags || []; return { ...s, tags: [...existingTags, newTag] }; } return s; }));
      setSelectedShots([]); setObraName("");
    } else { alert("Error al vincular la obra."); }
    setLinkingObra(false);
  };

  // 🆕 HANDLER: Entrar a la vista de Obra desde el Índice
  const handleSelectObraFromIndex = (slug: string) => { 
    setObraFilter(slug); 
    setViewMode('obra'); // MODO DEDICADO
    setShowObrasOverlay(false); 
  };

  // 🆕 LÓGICA DE RENDERIZADO LIMPIA
  let shotsToRender: Shot[] = [];
  let viewTitle = 'Shots Guardados'; // Título dinámico
  
  if (viewMode === 'all') { 
    // AllSavedShotsView (no cambia)
  } else if (viewMode === 'obra') {
    // 🆕 VISTA DEDICADA: Todos los shots guardados de esa obra
    shotsToRender = allSavedShots.filter(s => s.tags?.some(t => t.facet === 'obra' && t.slug === obraFilter));
    viewTitle = Object.values(obrasByCategory).flat().find(o => o.slug === obraFilter)?.name || 'Obra Guardada';
  } else if (viewMode === null) {
    // BANDEJA: Solo no asignados
    shotsToRender = unassignedShots;
  } else {
    // TABLERO: Shots de un tablero específico
    shotsToRender = boardShots;
    viewTitle = boards.find(b => b.id === viewMode)?.name || 'Tablero';
  }

  const isObraCellActive = selectedShots.length > 0 && viewMode === null;

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[50] bg-gray-950 flex flex-col">
      
      <SavedShotsDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        viewMode={viewMode}
        obraFilter={obraFilter}
        boards={boards}
        loadingBoards={loadingBoards}
        obrasCount={Object.values(obrasByCategory).flat().length}
        selectedShotsCount={selectedShots.length}
        depositing={depositing}
                userId={userId ?? null}
        onNavigate={handleNavigate}
        onOpenObras={() => { setDrawerOpen(false); setShowObrasOverlay(true); }}
        onCreateBoard={handleCreateBoard}
        onDepositToBoard={handleDepositToBoard}
        onDeleteBoard={handleDeleteBoard}
      />

      <div className="flex-1 flex flex-col relative" style={{ background: 'rgba(20,20,20,0.95)' }}>
        
        <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[rgba(20,20,20,0.95)] z-10 border-b border-yellow-500">
          {viewMode === 'all' ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl font-bold text-yellow-400">{currentUser?.id === userId ? 'Colección' : 'Perfil de'}</span>
              <div className="flex flex-col justify-center border-l border-gray-600 pl-3">
                <span className="text-sm text-white font-bold leading-tight">{profileData?.username || "Usuario"}</span>
                <span className="text-[10px] text-gray-400">{profileData?.followers_count ?? 0} seguidores</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                {profileData?.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : (profileData?.username || "?").charAt(0).toUpperCase()}
              </div>
              <div className="border-l border-gray-600 pl-3 flex items-center gap-1.5"><span className="text-xs text-gray-400">Siguiendo</span><span className="text-sm text-white font-bold">{profileData?.following_count ?? 0}</span></div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* 🆕 BACK BUTTON: Vuelve a la Bandeja (null) desde Obra o Tablero */}
              <button onClick={() => { setViewMode(null); setObraFilter(null); }} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-200 truncate">{viewTitle}</h2>
              {selectedShots.length > 0 && viewMode === null && <span className="text-xs text-yellow-400 font-bold">({selectedShots.length} selec.)</span>}
            </div>
          )}

          <div className="flex-1" />

          {isObraCellActive && (
            <div className={`flex items-center gap-1.5 bg-gray-800 rounded-full border transition-all duration-200 h-8 border-yellow-500 shadow-sm shadow-yellow-500/20 w-64 px-3`}>
              <span className="text-[10px] bg-yellow-500 text-black font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{selectedShots.length}</span>
              <input type="text" placeholder="Vincular a Obra..." className="bg-transparent border-none text-white focus:outline-none placeholder:text-gray-500 flex-1 text-xs" value={obraName} onChange={e => setObraName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLinkObra()} disabled={linkingObra || !isAdmin} />
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdmin && ( <button onClick={handleLinkObra} disabled={!obraName.trim() || linkingObra} className="w-5 h-5 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition disabled:opacity-50" title="Confirmar Obra"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></button> )}
                <button onClick={() => { setSelectedShots([]); setObraName(""); }} className="w-5 h-5 rounded-full bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center transition" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
          )}

          <div className="flex-1" />
          <button onClick={() => setDrawerOpen(v => !v)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow ml-2 flex-shrink-0"> &#9776; </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
           {viewMode === 'all' ? (
            <AllSavedShotsView userId={userId} isOwner={currentUser?.id === userId} />
          ) : (
            (loading || loadingBoard) && shotsToRender.length === 0 ? <div className="text-center py-8 text-gray-400 text-xs animate-pulse">Cargando...</div> :
            shotsToRender.length === 0 ? <div className="text-center py-8 text-gray-600 text-xs">{viewMode === null ? "¡Bandeja vacía! Todo está archivado." : "Sin shots para mostrar."}</div> :
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
              {shotsToRender.map(shot => (
                <div key={shot.id} className="relative group mb-2">
                  <ShotCard shot={shot} isSaved={true} isSaving={false} onSave={() => {}} hideSave={true} isLiked={likedShots.includes(shot.id)} likesCount={shot.likes_count || 0} isLiking={false} onLike={() => handleLike(shot.id)} viewsCount={shot.views_count || 0} user={currentUser} onClick={() => setSelectedShot(shot)} hideViews={false} />
                  
                  {/* 🆕 CHECKBOXES: Solo en la Bandeja (null) */}
                  {viewMode === null && (<input type="checkbox" checked={selectedShots.includes(shot.id)} onChange={(e) => setSelectedShots(prev => e.target.checked ? [...prev, shot.id] : prev.filter(id => id !== shot.id))} className="absolute top-2 left-2 z-10 w-5 h-5 accent-yellow-500 bg-gray-800 border-gray-600 rounded cursor-pointer" />)}
                  
                  {/* 🆕 REMOVE BUTTON: Solo en Tableros (no en Obra) */}
                  {viewMode !== null && viewMode !== 'obra' && (<button onClick={async () => { await supabase.from('board_shots').delete().match({ board_id: viewMode, shot_id: shot.id }); setBoardShots(prev => prev.filter(s => s.id !== shot.id)); setShotsInBoards(prev => prev.filter(id => id !== shot.id)); setBoards(prev => prev.map(b => b.id === viewMode ? { ...b, shot_count: Math.max(0, (b.shot_count || 1) - 1) } : b)); }} className="absolute top-2 left-2 z-10 bg-red-600/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow">&times;</button>)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showObrasOverlay && (
        <ObrasIndexOverlay obras={obrasByCategory} onClose={() => setShowObrasOverlay(false)} onSelectObra={handleSelectObraFromIndex} />
      )}

      {selectedShot && currentUser && ( 
        <ShotDetailModal 
          shot={selectedShot} onClose={() => setSelectedShot(null)} user={currentUser}
          initialIsLiked={likedShots.includes(selectedShot.id)} initialIsSaved={true} initialLikesCount={selectedShot.likes_count || 0}
          onLikeChange={(newIsLiked, newCount) => {
            setLikedShots(prev => newIsLiked ? [...prev, selectedShot.id] : prev.filter(id => id !== selectedShot.id));
            const updateCount = (arr: Shot[]) => arr.map(s => s.id === selectedShot.id ? { ...s, likes_count: newCount } : s);
            setAllSavedShots(updateCount); setBoardShots(updateCount);
          }}
          onSaveChange={(newIsSaved) => { if(newIsSaved) setAllSavedShots(prev => [...prev, selectedShot]); }}
          onOpenCollection={(uocId) => { setSelectedShot(null); setSelectedCollectionId(uocId); }}
        />
      )}

      {selectedCollectionId && (
        <PublicCollectionOverlay userId={selectedCollectionId} onClose={() => setSelectedCollectionId(null)} />
      )}
    </div>
  );
}