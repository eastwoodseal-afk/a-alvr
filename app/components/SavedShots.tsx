"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

interface SavedShotsProps {
  userId: string | null | undefined;
  filterBoardId?: string;
  selectedShots: string[]; // NUEVO: Viene del padre
  onSelectedShotsChange: (shots: string[]) => void; // NUEVO: Teléfono al padre
  recentlyDeposited: string[]; // NUEVO: Para ocultar los depositados
}

export default function SavedShots({ userId, filterBoardId, selectedShots, onSelectedShotsChange, recentlyDeposited }: SavedShotsProps) {
  const { user: currentUser } = useAuth();
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenShots, setHiddenShots] = useState<string[]>([]);
  const [showActions, setShowActions] = useState(false);

  // NUEVO: Cuando el padre deposita, ocultamos los shots visualmente
  useEffect(() => {
    if (recentlyDeposited.length > 0) {
      setHiddenShots(prev => [...prev, ...recentlyDeposited]);
    }
  }, [recentlyDeposited]);

  // --- LÓGICA FOLLOW ---
  const [authorData, setAuthorData] = useState<{ followers_count: number, avatar_url?: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

    // LEY 1.2: Desacoplamiento de identidad. Solo depende del ID, no del objeto completo.
  useEffect(() => {
    if (selectedShot?.user_id) {
      supabase.from('profiles').select('followers_count, avatar_url').eq('id', selectedShot.user_id).single().then(({ data }) => {
        if (data) setAuthorData(data);
      });
      if (currentUser?.id) {
        supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', selectedShot.user_id).maybeSingle().then(({ data }) => {
          setIsFollowing(!!data);
        });
      }
    }
  }, [selectedShot, currentUser?.id]); // 👈 CAMBIO CONSTITUCIONAL

  const handleToggleFollow = async () => {
    if (!currentUser || !selectedShot?.user_id || followLoading) return;
    setFollowLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_follow', { target_user_id: selectedShot.user_id });
      if (error) throw error;
      setIsFollowing(data);
      if (authorData) setAuthorData(prev => ({ ...prev!, followers_count: prev!.followers_count + (data ? 1 : -1) }));
    } catch (err) { console.error(err); } 
    finally { setFollowLoading(false); }
  };
  // -------------------------------

  useEffect(() => {
    async function fetchSavedShots() {
      if (!userId) return;
      setLoading(true);
      let shotsData = [];
      let profilesMap: Record<string, string> = {};
      
      const { data: savedShotsData, error: savedShotsError } = await supabase
        .from("saved_shots")
        .select("*, shots(*, board_shots(*), user_id, views_count)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (!savedShotsError && savedShotsData) shotsData = savedShotsData;
      
      const userIds = [...new Set(shotsData.map((item: any) => item.shots?.user_id).filter(Boolean))];
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc: { [key: string]: string }, profile: any) => {
            acc[profile.id] = profile.username || "sin username";
            return acc;
          }, {});
        }
      }
      
      const shotsWithUsername = shotsData.map((item: any) => ({
        ...item,
        shots: { ...item.shots, username: profilesMap[item.shots?.user_id] || "sin username" }
      }));
      setShots(shotsWithUsername || []);
      setLoading(false);
    }
    fetchSavedShots();
  }, [userId, filterBoardId]);

  useEffect(() => {
    if (selectedShot && filterBoardId) {
      supabase.rpc('increment_view', { shot_id: parseInt(selectedShot.id) }).then();
      window.dispatchEvent(new CustomEvent('shot-viewed', { detail: selectedShot.id.toString() }));
    }
  }, [selectedShot, filterBoardId]);

  const handleRemoveFromBoard = async () => {
    if (!selectedShot || !filterBoardId) return;
    const { error } = await supabase.from("board_shots").delete().match({ board_id: filterBoardId, shot_id: selectedShot.id });
    if (!error) {
      setShots(prev => prev.filter(item => item.shots?.id !== selectedShot.id));
      setSelectedShot(null); setShowActions(false);
    }
  };

  const handleUnsave = async () => {
    if (!selectedShot || !userId) return;
    const shotIdToDelete = selectedShot.id;
    const { error: errorSaved } = await supabase.from("saved_shots").delete().match({ user_id: userId, shot_id: shotIdToDelete });
    if (!errorSaved) {
       await supabase.from("board_shots").delete().eq("shot_id", shotIdToDelete);
       setShots(prev => prev.filter(item => item.shots?.id !== shotIdToDelete));
       window.dispatchEvent(new CustomEvent('shot-unsaved', { detail: shotIdToDelete.toString() }));
       setSelectedShot(null); setShowActions(false);
    }
  };

  if (!userId) return <div className="text-gray-400 py-8">No hay usuario</div>;
  if (loading) return <div className="text-gray-400 py-8">Cargando...</div>;
  if (shots.length === 0) return <div className="text-gray-400 py-8">No tienes shots guardados</div>;

  const isOwnShot = currentUser?.id === selectedShot?.user_id;

  return (
    <>
      {/* GRID */}
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full">
        {shots.map((item, idx) => {
          const shotId = item.shots?.id;
          if (filterBoardId) {
            const belongsToBoard = item.shots?.board_shots?.some((bs: any) => bs.board_id === filterBoardId);
            if (!belongsToBoard) return null;
          } else {
            if (hiddenShots.includes(shotId)) return null;
            if (item.shots?.board_shots && item.shots.board_shots.length > 0) return null;
          }
          return (
            <div key={item.id || idx} className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative" onClick={() => { setSelectedShot(item.shots); setShowActions(false); }}>
              {item.shots?.image_url && <img src={item.shots.image_url} alt="" className="w-full object-cover" />}
              <div className="p-2 flex justify-between items-start gap-2">
                 <div className="flex-1 min-w-0">
                    {item.shots?.author && <div className="text-yellow-400 font-bold text-sm truncate">{item.shots.author}</div>}
                    {item.shots?.title && <div className="font-semibold text-gray-200 text-sm truncate">{item.shots.title}</div>}
                 </div>
                 {filterBoardId && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                       <div className="flex flex-col items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="text-[10px] text-gray-500 font-mono">{item.shots?.views_count || 0}</span>
                       </div>
                    </div>
                 )}
              </div>
              {!filterBoardId && shotId && (
                // NUEVO: El checkbox usa la prop del padre
                <input type="checkbox" className="absolute top-2 right-2 w-5 h-5 accent-yellow-500" checked={selectedShots.includes(shotId)} onChange={e => { if(!shotId) return; onSelectedShotsChange(e.target.checked ? [...selectedShots, shotId] : selectedShots.filter(id => id !== shotId)); }} onClick={e => e.stopPropagation()} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* ELIMINADO: El div oculto y el EventListener Fantasma */}
      
      {/* MODAL */}
      {selectedShot && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col max-w-xl w-full max-h-[90vh]">
            
            {/* BOTONES LATERAL DERECHO */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10 bg-black/50 backdrop-blur-sm rounded-xl p-2">
                <button onClick={() => setSelectedShot(null)} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow">&times;</button>
                <div className="flex flex-col items-center gap-0.5 mt-2">
                   <div className="rounded-full w-[28px] h-[28px] flex items-center justify-center bg-gray-700 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </div>
                   <span className="text-white text-xs font-bold">{selectedShot.views_count || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <img src={selectedShot.image_url} alt="" className="w-full h-auto rounded-lg" />
            </div>

            <div className="p-6 pt-2 border-t border-gray-800">
                {selectedShot.author && (<div className="text-lg text-yellow-400 font-bold mb-1">{selectedShot.author}</div>)}
                {selectedShot.title && <div className="text-base font-bold text-gray-100 mb-2">{selectedShot.title}</div>}
                {selectedShot.description && <div className="text-sm text-gray-300 mb-4">{selectedShot.description}</div>}

                {/* Usuario y Seguir */}
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-800">
                    <div className="text-right">
                        <div className="text-sm text-white font-bold">{selectedShot.username || "Anónimo"}</div>
                        <div className="text-[10px] text-gray-500">{authorData?.followers_count ?? 0} seguidores</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-bold text-white border border-gray-600">
                       {authorData?.avatar_url ? <img src={authorData.avatar_url} className="w-full h-full object-cover" /> : (selectedShot.username || "?").charAt(0).toUpperCase()}
                    </div>
                    {currentUser && !isOwnShot && (
                       <button onClick={handleToggleFollow} disabled={followLoading} className={`px-3 py-1 rounded text-xs font-bold transition-all ${isFollowing ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>
                           {followLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
                       </button>
                    )}
                    {isOwnShot && (<span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-500 border border-gray-700">Tú</span>)}
                </div>

                {/* FOOTER DE EDICIÓN */}
                {filterBoardId && (
                  <div className="flex flex-col items-end gap-2 mt-4 pt-4 border-t border-gray-700">
                    <button 
                      onClick={() => setShowActions(!showActions)} 
                      className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full w-[28px] h-[28px] flex items-center justify-center text-sm shadow transition-transform hover:scale-105"
                      title={showActions ? "Cerrar edición" : "Editar"}
                    >
                        {showActions ? (
    <div className="relative w-7 h-7">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-7 h-7 absolute">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6 20.5H3v-3L16.862 4.487z" />
        </svg>
    </div>
) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
)}
                    </button>
                    {showActions && (
                      <div className="flex gap-2 animate-fade-in">
                        <button onClick={handleRemoveFromBoard} className="bg-yellow-500 text-black text-[10px] px-3 py-1 rounded font-bold shadow">Quitar</button>
                        <button onClick={handleUnsave} className="bg-red-600 text-white text-[10px] px-3 py-1 rounded font-bold shadow">Eliminar</button>
                      </div>
                    )}
                  </div>
                )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}