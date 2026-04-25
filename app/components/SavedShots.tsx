"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SavedShotsDrawerOverlayEventListener from "./SavedShotsDrawerOverlayEventListener";

interface SavedShotsProps {
  userId: string | null | undefined;
  filterBoardId?: string;
}

export default function SavedShots({ userId, filterBoardId }: SavedShotsProps) {
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  const [hiddenShots, setHiddenShots] = useState<string[]>([]);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    async function fetchSavedShots() {
      if (!userId) return;
      setLoading(true);
      let shotsData = [];
      let profilesMap: Record<string, string> = {};
      
      const { data: savedShotsData, error: savedShotsError } = await supabase
        .from("saved_shots")
        .select("*, shots(*, board_shots(*), user_id)")
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

  const handleRemoveFromBoard = async () => {
    if (!selectedShot || !filterBoardId) return;
    const { error } = await supabase.from("board_shots").delete().match({ board_id: filterBoardId, shot_id: selectedShot.id });
    if (!error) {
      setShots(prev => prev.filter(item => item.shots?.id !== selectedShot.id));
      setSelectedShot(null);
      setShowActions(false);
    } else { console.error("Error:", error); }
  };

  const handleUnsave = async () => {
    if (!selectedShot || !userId) return;
    const { error: errorSaved } = await supabase.from("saved_shots").delete().match({ user_id: userId, shot_id: selectedShot.id });
    if (!errorSaved) {
       await supabase.from("board_shots").delete().eq("shot_id", selectedShot.id);
       setShots(prev => prev.filter(item => item.shots?.id !== selectedShot.id));
       setSelectedShot(null);
       setShowActions(false);
    } else { console.error("Error:", errorSaved); }
  };

  if (!userId) return <div className="text-gray-400 py-8">No hay usuario</div>;
  if (loading) return <div className="text-gray-400 py-8">Cargando...</div>;
  if (shots.length === 0) return <div className="text-gray-400 py-8">No tienes shots guardados</div>;

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full xl:w-screen xl:max-w-none">
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
            <div
              key={item.id || item.shot_id || idx}
              className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative"
              onClick={() => { setSelectedShot(item.shots); setShowActions(false); }}
            >
              {item.shots?.image_url && <img src={item.shots.image_url} alt={item.shots.title || "Shot"} className="w-full object-cover" />}
              {item.shots?.author && <div className="px-2 pt-2 text-yellow-400 font-bold text-sm">{item.shots.author}</div>}
              {item.shots?.title && <div className="px-2 py-2 font-semibold text-gray-200">{item.shots.title}</div>}
              {item.shots?.description && <div className="px-2 pb-2 text-gray-300 text-sm">{item.shots.description}</div>}
              {!filterBoardId && shotId && (
                <input type="checkbox" className="absolute top-2 right-2 w-5 h-5 accent-yellow-500" checked={selectedShots.includes(shotId)}
                  onChange={e => { if(!shotId) return; setSelectedShots(prev => e.target.checked ? [...prev, shotId] : prev.filter(id => id !== shotId)); }}
                  onClick={e => e.stopPropagation()}
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div id="shots-selected-data" style={{ display: 'none' }} data-selected-shots={JSON.stringify(selectedShots)} />
      <SavedShotsDrawerOverlayEventListener onClearSelection={ids => { setHiddenShots(prev => [...prev, ...ids]); setSelectedShots([]); }} />
      
      {/* MODAL CON FOOTER FIJO */}
      {selectedShot && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-end sm:items-center justify-center">
          
          {/* Card Container */}
          <div className="relative w-full max-w-xl mx-auto bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl text-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Botón Cerrar (X) */}
            <button
              className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-500 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow z-30"
              onClick={() => { setSelectedShot(null); setShowActions(false); }}
            >
              &times;
            </button>

            {/* Imagen y Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              <img src={selectedShot.image_url} alt={selectedShot.title || "Shot"} className="w-full max-h-[50vh] object-contain rounded-lg mb-4" />
              <div className="w-full text-left">
                {selectedShot.author && (<div className="text-lg text-yellow-400 font-bold mb-2">{selectedShot.author}</div>)}
                {selectedShot.title && <div className="text-lg font-bold text-yellow-400 mb-2">{selectedShot.title}</div>}
                {selectedShot.description && <div className="text-base text-gray-200 mb-2">{selectedShot.description}</div>}
                {selectedShot.username && (<div className="text-xs text-gray-400 font-semibold mt-4">{selectedShot.username}</div>)}
              </div>
            </div>

            {/* --- FOOTER --- */}
            {filterBoardId && (
              <div className="bg-gray-800 border-t border-gray-700 rounded-b-2xl p-4 flex flex-col items-end gap-2">
                
                {/* BOTÓN EDITAR (Icono Lápiz, Amarillo) */}
                <button 
                  onClick={() => setShowActions(!showActions)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full w-[28px] h-[28px] flex items-center justify-center text-sm shadow transition-transform hover:scale-105"
                  title="Editar"
                >
                  {showActions ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  )}
                </button>

                {/* Menú Horizontal (Chicos y Amarillo) */}
                {showActions && (
                  <div className="flex flex-row gap-2 animate-fade-in w-full justify-end">
                    <button 
                      onClick={handleRemoveFromBoard}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black text-[10px] h-5 px-3 rounded font-semibold shadow whitespace-nowrap"
                    >
                      Quitar del tablero
                    </button>
                    <button 
                      onClick={handleUnsave}
                      className="bg-red-600 hover:bg-red-700 text-white text-[10px] h-5 px-3 rounded font-semibold shadow whitespace-nowrap"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}

            {!filterBoardId && (
               <div className="h-4 bg-gray-800 rounded-b-2xl"></div>
            )}

          </div>
        </div>
      )}
    </>
  );
}