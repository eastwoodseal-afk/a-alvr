"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import AllSavedShotsView from "./AllSavedShotsView";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

const BATCH_SIZE = 30;

// 🆕 ACTUALIZADO: Añadimos shot_count a la interfaz
interface Board { id: string; name: string; shot_count?: number; }
interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; is_approved?: boolean; }

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
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  const [depositing, setDepositing] = useState(false);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  // 🆕 ESTADOS PARA BORRAR TABLERO
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState<string | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);

  // Cargar Perfil
  useEffect(() => {
    if (userId) {
      supabase.from('profiles').select('username, avatar_url, followers_count, following_count').eq('id', userId).single().then(({ data }) => {
        if(data) setProfileData(data);
      });
    }
  }, [userId]);

  // Cargar Tableros
  useEffect(() => {
    if (!userId) return;
    setLoadingBoards(true);
    supabase.from("boards").select("id, name").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setBoards(data);
      setLoadingBoards(false);
    });
  }, [userId]);

  // Cargar TODO lo guardado y los IDs en tableros
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      
      const { data: savedData } = await supabase.from('saved_shots')
        .select('shot_id, shots(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username))')
        .eq('user_id', userId).order('created_at', { ascending: false });
      
      let processedSaved: Shot[] = [];
      if (savedData) {
        processedSaved = savedData.map((ss: any) => ({ ...ss.shots, id: String(ss.shots.id), username: ss.shots.profiles?.username || "Anónimo" })).filter(Boolean);
        setAllSavedShots(processedSaved);
      }

      // 🆕 OPTIMIZACIÓN: Traemos board_id para calcular conteos automáticamente
      const { data: boardData } = await supabase.from('board_shots').select('board_id, shot_id');
      if (boardData) {
        const allShotIds = boardData.map((bs: any) => String(bs.shot_id));
        setShotsInBoards(allShotIds);
        
        // Calcular conteo por tablero
        const counts: Record<string, number> = {};
        boardData.forEach((bs: any) => {
          counts[bs.board_id] = (counts[bs.board_id] || 0) + 1;
        });
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
    if (viewMode && viewMode !== 'all') {
      setLoadingBoard(true);
      supabase.from('board_shots').select('shot_id, shots(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username))').eq('board_id', viewMode).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBoardShots(data.map((bs: any) => ({ ...bs.shots, id: String(bs.shots.id), username: bs.shots.profiles?.username || "Anónimo" })).filter(Boolean));
        setLoadingBoard(false);
      });
    }
  }, [viewMode]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault(); if (!boardName.trim() || !userId) return;
    setCreating(true);
    const { data, error } = await supabase.from('boards').insert({ name: boardName.trim(), user_id: userId }).select().single();
    if (!error && data) { setBoards(prev => [{ ...data, shot_count: 0 }, ...prev]); setBoardName(""); }
    setCreating(false);
  };

  const handleDepositToBoard = async (boardId: string) => {
    if (selectedShots.length === 0) return;
    setDepositing(true);
    const inserts = selectedShots.map(shot_id => ({ board_id: boardId, shot_id }));
    const { error } = await supabase.from('board_shots').insert(inserts);
    if (!error) {
      setShotsInBoards(prev => [...prev, ...selectedShots]);
      setSelectedShots([]);
      // Actualizar conteo del tablero en la UI
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, shot_count: (b.shot_count || 0) + inserts.length } : b));
    } else if (error.code === '23505') alert("Algunos shots ya estaban aquí.");
    setDepositing(false);
  };

  const handleRemoveFromBoard = async (shotId: string) => {
    if (!viewMode) return;
    await supabase.from('board_shots').delete().match({ board_id: viewMode, shot_id: shotId });
    setBoardShots(prev => prev.filter(s => s.id !== shotId));
    setShotsInBoards(prev => prev.filter(id => id !== shotId));
    // Actualizar conteo
    setBoards(prev => prev.map(b => b.id === viewMode ? { ...b, shot_count: Math.max(0, (b.shot_count || 1) - 1) } : b));
  };

  // 🆕 FUNCIÓN: ELIMINAR TABLERO
  const handleDeleteBoard = async (boardId: string) => {
    setDeletingBoardId(boardId);
    
    // 1. Borrar las relaciones (los shots "vuelven" a la bandeja automáticamente al desaparecer de shotsInBoards)
    await supabase.from('board_shots').delete().eq('board_id', boardId);
    // 2. Borrar el tablero
    await supabase.from('boards').delete().eq('id', boardId);
    
    // 3. Actualizar UI
    setBoards(prev => prev.filter(b => b.id !== boardId));
    
    // Re-frescar la lista de shots en tableros (para que aparezcan en la bandeja)
    const { data: boardData } = await supabase.from('board_shots').select('board_id, shot_id');
    if (boardData) {
      const counts: Record<string, number> = {};
      const allShotIds: string[] = [];
      boardData.forEach((bs: any) => {
        allShotIds.push(String(bs.shot_id));
        counts[bs.board_id] = (counts[bs.board_id] || 0) + 1;
      });
      setShotsInBoards(allShotIds);
      setBoards(prev => prev.map(b => ({ ...b, shot_count: counts[b.id] || 0 })));
    }

    // Si estábamos viendo ese tablero, regresar a la bandeja
    if (viewMode === boardId) {
      setViewMode(null);
    }

    setDeletingBoardId(null);
    setConfirmDeleteBoardId(null);
  };

  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    const updateCount = (arr: Shot[]) => arr.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s);
    if (viewMode === null) setAllSavedShots(updateCount);
    else setBoardShots(updateCount);
    if (alreadyLiked) await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); 
    else await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); 
  };

  const handleView = async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    const updateViews = (arr: Shot[]) => arr.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s);
    if (viewMode === null) setAllSavedShots(updateViews);
    else setBoardShots(updateViews);
  };

  const shotsToRender = viewMode === null ? unassignedShots : (viewMode === 'all' ? [] : boardShots);

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* DRAWER LATERAL DERECHO */}
      <div className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-64 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col border-l border-gray-700 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Organizar</h3>
          <button className="text-gray-400 hover:text-white text-xl font-bold transition" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">
          
          <div className="space-y-2">
            <button onClick={() => { setViewMode('all'); setDrawerOpen(false); }} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === 'all' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Colección (Vitrina)
            </button>
            <button onClick={() => { setViewMode(null); setDrawerOpen(false); }} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === null ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              Shots Guardados (Bandeja)
            </button>
          </div>

          <div className="h-px bg-gray-700"></div>

          <div>
            <h4 className="text-xs text-gray-400 font-bold uppercase mb-2">Tableros</h4>
            <form onSubmit={handleCreateBoard} className="flex gap-2 mb-3">
              <input type="text" placeholder="Nuevo tablero..." className="flex-1 border border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={boardName} onChange={e => setBoardName(e.target.value)} disabled={creating} />
              <button type="submit" className="bg-yellow-500 text-black rounded-lg px-3 py-1.5 font-bold text-sm disabled:opacity-50 transition hover:bg-yellow-400" disabled={creating || !boardName.trim()}>
                {creating ? "..." : "+"}
              </button>
            </form>

            {loadingBoards ? <div className="text-gray-400 text-xs text-center py-2">Cargando...</div> : 
             boards.length === 0 ? <div className="text-gray-600 text-xs text-center italic">Sin tableros aún.</div> :
             <div className="space-y-1.5">
               {boards.map(board => (
                 // 🆕 CONTENEDOR FLEX PARA TABLERO + BOTE DE BASURA
                 <div key={board.id} className="flex items-center gap-1 group">
                   <button 
                     className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 flex-1 min-w-0 ${viewMode === board.id ? 'bg-yellow-700 text-white shadow-inner' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`} 
                     disabled={depositing}
                     onClick={() => { if (selectedShots.length > 0 && viewMode === null) handleDepositToBoard(board.id); else { setViewMode(board.id); setDrawerOpen(false); } }}
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                     <span className="truncate flex-1">{board.name}</span>
                     {/* 🆕 CONTADOR DE SHOTS */}
                     <span className="text-[10px] text-gray-500 flex-shrink-0">({board.shot_count || 0})</span>
                   </button>

                   {/* 🆕 BOTÓN BORRAR / CONFIRMACIÓN */}
                   {confirmDeleteBoardId === board.id ? (
                     <div className="flex items-center gap-1 flex-shrink-0 animate-fade-in">
                       <button onClick={() => handleDeleteBoard(board.id)} disabled={deletingBoardId === board.id} className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded transition disabled:opacity-50">
                         {deletingBoardId === board.id ? "..." : "Sí"}
                       </button>
                       <button onClick={() => setConfirmDeleteBoardId(null)} className="text-[10px] bg-gray-600 hover:bg-gray-500 text-white font-bold px-1.5 py-0.5 rounded transition">
                         No
                       </button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setConfirmDeleteBoardId(board.id)}
                       className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-red-400 flex-shrink-0"
                       title="Eliminar tablero"
                     >
                       {/* Icono: Bote de Basura */}
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                       </svg>
                     </button>
                   )}
                 </div>
               ))}
             </div>
            }
          </div>
        </div>
        
        {selectedShots.length > 0 && viewMode === null && (
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-xs text-center text-yellow-400 font-bold">
            Selecciona un tablero para depositar {selectedShots.length} shot(s)
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
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
              <div className="border-l border-gray-600 pl-3 flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Siguiendo</span>
                <span className="text-sm text-white font-bold">{profileData?.following_count ?? 0}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button onClick={() => { if (viewMode !== null) setViewMode(null); else onClose(); }} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-200 truncate">
                {viewMode ? boards.find(b => b.id === viewMode)?.name || 'Tablero' : 'Shots Guardados'}
              </h2>
              {selectedShots.length > 0 && viewMode === null && <span className="text-xs text-yellow-400 font-bold">({selectedShots.length} selec.)</span>}
            </div>
          )}
          <button onClick={() => setDrawerOpen(v => !v)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow ml-2"> &#9776; </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          
           {viewMode === 'all' ? (
            <AllSavedShotsView userId={userId} isOwner={currentUser?.id === userId} />
          ) : (
            (loading || loadingBoard) && shotsToRender.length === 0 ? <div className="text-center py-8 text-gray-400 text-xs animate-pulse">Cargando...</div> :
            shotsToRender.length === 0 ? <div className="text-center py-8 text-gray-600 text-xs">{viewMode === null ? "¡Bandeja vacía! Todo está archivado." : "Tablero vacío."}</div> :
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
              {shotsToRender.map(shot => (
                <div key={shot.id} className="relative group mb-2">
                  <ShotCard 
                    shot={shot} isSaved={true} isSaving={false} onSave={() => {}} hideSave={true} 
                    isLiked={likedShots.includes(shot.id)} likesCount={shot.likes_count || 0} isLiking={false} onLike={() => handleLike(shot.id)}
                    viewsCount={shot.views_count || 0} user={currentUser} onClick={() => setSelectedShot(shot)} hideViews={false}
                  />
                  {viewMode === null && (
                    <input type="checkbox" checked={selectedShots.includes(shot.id)} onChange={(e) => setSelectedShots(prev => e.target.checked ? [...prev, shot.id] : prev.filter(id => id !== shot.id))}
                      className="absolute top-2 left-2 z-10 w-5 h-5 accent-yellow-500 bg-gray-800 border-gray-600 rounded cursor-pointer"
                    />
                  )}
                  {viewMode !== null && (
                    <button onClick={() => handleRemoveFromBoard(shot.id)} className="absolute top-2 left-2 z-10 bg-red-600/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow">&times;</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedShot && currentUser && ( 
        <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={true} isSaving={false} onSave={() => {}} user={currentUser} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={handleView} />
      )}
    </div>
  );
}