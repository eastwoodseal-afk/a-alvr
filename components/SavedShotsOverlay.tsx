"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import AllSavedShotsView from "./AllSavedShotsView";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

const BATCH_SIZE = 30;

interface Board { id: string; name: string; }
interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; is_approved?: boolean; }

interface Props {
  userId: string | null | undefined;
  onClose: () => void;
  initialView?: 'all' | null;
}

export default function SavedShotsOverlay({ userId, onClose, initialView = null }: Props) {
  const { user: currentUser } = useAuth();
  
  // Estados de Vista
  const [viewMode, setViewMode] = useState<string | null>(initialView); // 'all', null (Bandeja), o board_id
  
  // Estados de Datos
  const [allSavedShots, setAllSavedShots] = useState<Shot[]>([]); // Todo lo guardado
  const [shotsInBoards, setShotsInBoards] = useState<string[]>([]); // IDs de shots que ESTÁN en tableros
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(true); // RESTAURADO
  const [profileData, setProfileData] = useState<any>(null);

  // Estados de UI
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Estados de Interacción
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  const [depositing, setDepositing] = useState(false);
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

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
      
      // 1. Traer todos los shots guardados (Bandeja completa)
      const { data: savedData } = await supabase.from('saved_shots')
        .select('shot_id, shots(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username))')
        .eq('user_id', userId).order('created_at', { ascending: false });
      
      let processedSaved: Shot[] = [];
      if (savedData) {
        processedSaved = savedData.map((ss: any) => ({ ...ss.shots, id: String(ss.shots.id), username: ss.shots.profiles?.username || "Anónimo" })).filter(Boolean);
        setAllSavedShots(processedSaved);
      }

      // 2. Traer todos los IDs de shots que YA ESTÁN en algún tablero
      const { data: boardData } = await supabase.from('board_shots').select('shot_id');
      if (boardData) {
        setShotsInBoards(boardData.map((bs: any) => String(bs.shot_id)));
      }

      // 3. Cargar likes
      if (currentUser?.id) {
        const { data: likedData } = await supabase.from("likes").select("shot_id").eq("user_id", currentUser.id);
        if (likedData) setLikedShots(likedData.map((l: any) => String(l.shot_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [userId, currentUser?.id]);

  // CALCULO CLAVE: Shots sin asignar (Bandeja de entrada)
  const unassignedShots = allSavedShots.filter(s => !shotsInBoards.includes(s.id));

  // Shots de un tablero específico
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

  // Acciones
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault(); if (!boardName.trim() || !userId) return;
    setCreating(true);
    const { data, error } = await supabase.from('boards').insert({ name: boardName.trim(), user_id: userId }).select().single();
    if (!error && data) { setBoards(prev => [data, ...prev]); setBoardName(""); }
    setCreating(false);
  };

  const handleDepositToBoard = async (boardId: string) => {
    if (selectedShots.length === 0) return;
    setDepositing(true);
    const inserts = selectedShots.map(shot_id => ({ board_id: boardId, shot_id }));
    const { error } = await supabase.from('board_shots').insert(inserts);
    if (!error) {
      setShotsInBoards(prev => [...prev, ...selectedShots]); // Los marcamos como asignados
      setSelectedShots([]); // Limpiamos selección
    } else if (error.code === '23505') alert("Algunos shots ya estaban aquí.");
    setDepositing(false);
  };

  const handleRemoveFromBoard = async (shotId: string) => {
    if (!viewMode) return;
    await supabase.from('board_shots').delete().match({ board_id: viewMode, shot_id: shotId });
    setBoardShots(prev => prev.filter(s => s.id !== shotId));
    setShotsInBoards(prev => prev.filter(id => id !== shotId)); // Vuelve a estar "sin asignar"
  };

  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    // Actualizamos el array correcto
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

  // Decidir qué array dibujar
  const shotsToRender = viewMode === null ? unassignedShots : (viewMode === 'all' ? [] : boardShots);

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* DRAWER LATERAL DERECHO (Tableros) - ESTILO NUEVO */}
      <div className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-64 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col border-l border-gray-700 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header del Drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Organizar</h3>
          <button className="text-gray-400 hover:text-white text-xl font-bold transition" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">
          
          {/* Sección de Vistas */}
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

          {/* Sección de Tableros */}
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
                <button key={board.id} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition disabled:opacity-50 flex items-center gap-2 ${viewMode === board.id ? 'bg-yellow-700 text-white shadow-inner' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`} disabled={depositing}
                  onClick={() => { if (selectedShots.length > 0 && viewMode === null) handleDepositToBoard(board.id); else { setViewMode(board.id); setDrawerOpen(false); } }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                  <span className="truncate">{board.name}</span>
                </button>
              ))}
             </div>
            }
          </div>
        </div>
        
        {/* Footer Informativo del Drawer */}
        {selectedShots.length > 0 && viewMode === null && (
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-xs text-center text-yellow-400 font-bold">
            Selecciona un tablero para depositar {selectedShots.length} shot(s)
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col relative" style={{ background: 'rgba(20,20,20,0.95)' }}>
        
        {/* HEADER DINÁMICO */}
        <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[rgba(20,20,20,0.95)] z-10 border-b border-yellow-500">
          
          {viewMode === 'all' ? (
            // MODO VITRINA
            <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xl font-bold text-yellow-400">
                {currentUser?.id === userId ? 'Colección' : 'Perfil de'}
              </span>
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
            // MODO BANDEJA / TABLERO
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
        
        {/* GRID SEGÚN MODO */}
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
                  {/* Checkbox SIEMPRE VISIBLE (Solo en Bandeja de Entrada) */}
                  {viewMode === null && (
                    <input type="checkbox" checked={selectedShots.includes(shot.id)} onChange={(e) => setSelectedShots(prev => e.target.checked ? [...prev, shot.id] : prev.filter(id => id !== shot.id))}
                      className="absolute top-2 left-2 z-10 w-5 h-5 accent-yellow-500 bg-gray-800 border-gray-600 rounded cursor-pointer"
                    />
                  )}
                  {/* Eliminar (Solo en Tableros) */}
                  {viewMode !== null && (
                    <button onClick={() => handleRemoveFromBoard(shot.id)} className="absolute top-2 left-2 z-10 bg-red-600/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow">&times;</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLE */}
      {selectedShot && currentUser && ( 
        <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={true} isSaving={false} onSave={() => {}} user={currentUser} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={handleView} />
      )}
    </div>
  );
}