"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ShotCard from "./ShotCard";
import ShotDetailModal from "./ShotDetailModal";

interface Board { id: string; name: string; }
interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; board_name?: string; }

interface Props {
  userId: string;
  onClose: () => void;
}

export default function PublicCollectionOverlay({ userId, onClose }: Props) {
  const { user: currentUser } = useAuth();
  
  // Datos y Vistas
  const [profileData, setProfileData] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  // viewMode: 'all' (Creados+Guardados), 'created' (Solo Creados), o board_id
  const [viewMode, setViewMode] = useState<string>('all'); 
  
  // Estados UI
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  // Interacciones del visitante
  const [likedShots, setLikedShots] = useState<string[]>([]);
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // 1. Cargar Perfil
  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('username, avatar_url, followers_count, following_count').eq('id', userId).single().then(({ data }) => {
      if (data) setProfileData(data);
    });
  }, [userId]);

  // 2. Cargar Tableros del usuario visitado
  useEffect(() => {
    if (!userId) return;
    setLoadingBoards(true);
    supabase.from("boards").select("id, name").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setBoards(data);
      setLoadingBoards(false);
    });
  }, [userId]);

  // 3. Cargar Shots según vista
  useEffect(() => {
    const fetchShots = async () => {
      if (!userId) return;
      setLoading(true);
      let processed: Shot[] = [];

      if (viewMode === 'all') {
        // VITRINA TOTAL: Fusionar Creados y Guardados
        // 1. Fetch Creados (Aprobados)
        const { data: createdData } = await supabase.from('shots')
          .select('id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username)')
          .eq('user_id', userId).eq('is_approved', true);
        
        const created = (createdData || []).map((s: any) => ({ ...s, id: String(s.id), username: s.profiles?.username || "Anónimo" }));

        // 2. Fetch Guardados (Aprobados)
        const { data: savedData } = await supabase.from('saved_shots')
          .select(`shot_id, shots!inner(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username), board_shots(board_id, boards(name)))`)
          .eq('user_id', userId).eq('shots.is_approved', true);
        
        const saved = (savedData || []).map((ss: any) => {
          const bs = ss.shots?.board_shots?.[0];
          return { ...ss.shots, id: String(ss.shots.id), username: ss.shots.profiles?.username || "Anónimo", board_name: bs?.boards?.name };
        });

        // 3. Deduplicar y fusionar
        const shotMap = new Map<string, Shot>();
        created.forEach(s => shotMap.set(s.id, s)); // Los creados tienen prioridad base
        saved.forEach(s => { if (!shotMap.has(s.id)) shotMap.set(s.id, s); else { // Si ya existe, añadimos el board_name si tiene
            const existing = shotMap.get(s.id)!;
            if (s.board_name && !existing.board_name) shotMap.set(s.id, {...existing, board_name: s.board_name});
        }});
        
        processed = Array.from(shotMap.values());

      } else if (viewMode === 'created') {
        // SOLO CREADOS: Lo que él ha aportado al museo
        const { data } = await supabase.from('shots')
          .select('id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username)')
          .eq('user_id', userId).eq('is_approved', true).order('created_at', { ascending: false });
        
        if (data) processed = data.map((s: any) => ({ ...s, id: String(s.id), username: s.profiles?.username || "Anónimo" }));

      } else {
        // TABLERO ESPECÍFICO
        const { data } = await supabase.from('board_shots')
          .select('shot_id, shots!inner(id, image_url, title, description, author, likes_count, views_count, user_id, is_approved, profiles!shots_user_id_fkey(username))')
          .eq('board_id', viewMode).eq('shots.is_approved', true).order('created_at', { ascending: false });
        
        if (data) processed = data.map((bs: any) => ({ ...bs.shots, id: String(bs.shots.id), username: bs.shots.profiles?.username || "Anónimo" }));
      }
      
      setShots(processed);
      setLoading(false);
    };
    fetchShots();
  }, [userId, viewMode]);

  // 4. Cargar interacciones del visitante
  useEffect(() => {
    const fetchInteractions = async () => {
      if (!currentUser?.id) return;
      const [savedRes, likedRes] = await Promise.all([
        supabase.from("saved_shots").select("shot_id").eq("user_id", currentUser.id),
        supabase.from("likes").select("shot_id").eq("user_id", currentUser.id)
      ]);
      if (savedRes.data) setSavedShots(savedRes.data.map((s: any) => String(s.shot_id)));
      if (likedRes.data) setLikedShots(likedRes.data.map((l: any) => String(l.shot_id)));
    };
    fetchInteractions();
  }, [currentUser?.id]);

  // --- FUNCIONES DE INTERACCIÓN ---
  const handleLike = async (shotId: string) => { 
    if (!currentUser) return; 
    const alreadyLiked = likedShots.includes(shotId); 
    setLikedShots(prev => alreadyLiked ? prev.filter(id => id !== shotId) : [...prev, shotId]); 
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, likes_count: (s.likes_count || 0) + (alreadyLiked ? -1 : 1) } : s));
    if (alreadyLiked) await supabase.from("likes").delete().match({ user_id: currentUser.id, shot_id: shotId }); 
    else await supabase.from("likes").insert({ user_id: currentUser.id, shot_id: shotId }); 
  };

  const handleSave = async (shotId: string) => {
    if (!currentUser || savedShots.includes(shotId)) return;
    setSavingId(shotId);
    await supabase.from("saved_shots").insert({ user_id: currentUser.id, shot_id: shotId });
    setSavedShots(prev => [...prev, shotId]);
    setSavingId(null);
  };

  const handleView = async (shotId: string) => { 
    await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, views_count: (s.views_count || 0) + 1 } : s));
  };

  const currentBoard = boards.find(b => b.id === viewMode);

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[60] bg-gray-950 flex flex-col">
      
      {/* DRAWER LATERAL */}
      <div className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-64 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col border-l border-gray-700 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Navegar</h3>
          <button className="text-gray-400 hover:text-white text-xl font-bold transition" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 custom-scrollbar">
          
          {/* VISTA TODA LA COLECCIÓN */}
          <button onClick={() => { setViewMode('all'); setDrawerOpen(false); }} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === 'all' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Toda la Colección
          </button>

          {/* NUEVO: VISTA SOLO CREADOS */}
          <button onClick={() => { setViewMode('created'); setDrawerOpen(false); }} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === 'created' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
            Sus Shots
          </button>
          
          <div className="h-px bg-gray-700 my-2"></div>

          {loadingBoards ? <div className="text-gray-400 text-xs text-center py-2">Cargando...</div> : 
           boards.length === 0 ? <div className="text-gray-600 text-xs text-center italic">Sin tableros públicos.</div> :
           boards.map(board => (
            <button key={board.id} onClick={() => { setViewMode(board.id); setDrawerOpen(false); }} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === board.id ? 'bg-yellow-700 text-white shadow-inner' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
              <span className="truncate">{board.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col relative" style={{ background: 'rgba(20,20,20,0.95)' }}>
        
        {/* HEADER (BREADCRUMB) */}
        <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[rgba(20,20,20,0.95)] z-10 border-b border-yellow-500">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            
            {/* BOTÓN REGRESAR INTELIGENTE */}
            <button 
              onClick={() => viewMode === 'all' ? onClose() : setViewMode('all')} 
              className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition mt-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>

            <span className="text-sm font-bold text-yellow-400 flex-shrink-0 pt-1">Perfil de:</span>
            <div className="h-5 w-px bg-gray-600 flex-shrink-0 mt-1.5"></div>

            {/* INFO USUARIO */}
            <div className="flex items-center gap-2 min-w-0 pt-0.5">
              <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white border border-gray-600 flex-shrink-0">
                {profileData?.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" /> : (profileData?.username || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white font-bold leading-tight truncate">@{profileData?.username || "..."}</div>
                <div className="text-[9px] text-gray-400">{profileData?.followers_count ?? 0} seguidores</div>
              </div>
            </div>

            {/* BREADCRUMB SECUNDARIO (Tablero o Creados) */}
            {viewMode !== 'all' && (
              <>
                <div className="h-5 w-px bg-gray-600 flex-shrink-0 mt-1.5"></div>
                <span className="text-sm font-semibold text-gray-200 truncate pt-1">
                  {viewMode === 'created' ? 'Sus Shots' : currentBoard?.name || 'Tablero'}
                </span>
              </>
            )}
          </div>

          <button onClick={() => setDrawerOpen(v => !v)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow ml-2 flex-shrink-0"> &#9776; </button>
        </div>
        
                {/* GRID */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {loading ? <div className="text-center py-8 text-gray-400 text-xs animate-pulse">Cargando colección...</div> :
           shots.length === 0 ? <div className="text-center py-8 text-gray-600 text-xs">Colección vacía o privada.</div> :
           <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
             {shots.map(shot => (
               <ShotCard 
                 key={shot.id} 
                 shot={shot} 
                 isSaved={savedShots.includes(shot.id)} 
                 isSaving={savingId === shot.id} 
                 onSave={() => handleSave(shot.id)}
                 isLiked={likedShots.includes(shot.id)}
                 likesCount={shot.likes_count || 0}
                 isLiking={false}
                 onLike={() => handleLike(shot.id)}
                 viewsCount={shot.views_count || 0}
                 user={currentUser}
                 onClick={() => setSelectedShot(shot)}
                 hideViews={false}
                 boardName={viewMode === 'all' ? shot.board_name : undefined} 
               />
             ))}
           </div>
          }
        </div>
      </div>

      {/* MODAL DETALLE */}
      {selectedShot && currentUser && ( 
        <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} isSaved={savedShots.includes(selectedShot.id)} isSaving={savingId === selectedShot.id} onSave={() => handleSave(selectedShot.id)} user={currentUser} isLiked={likedShots.includes(selectedShot.id)} likesCount={selectedShot.likes_count || 0} onLike={() => handleLike(selectedShot.id)} viewsCount={selectedShot.views_count || 0} onView={handleView} />
      )}
    </div>
  );
}