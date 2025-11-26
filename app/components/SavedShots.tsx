"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SavedShotsDrawerOverlayEventListener from "./SavedShotsDrawerOverlayEventListener";

interface SavedShotsProps {
  userId: string | null | undefined;
  filterBoardId?: string;
}

export default function SavedShots({ userId, filterBoardId }: SavedShotsProps) {
  // ...existing code...
  const [selectedShot, setSelectedShot] = useState<any | null>(null);
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShots, setSelectedShots] = useState<string[]>([]);
  // Estado para ocultar los shots seleccionados tras guardar
  const [hiddenShots, setHiddenShots] = useState<string[]>([]);


  useEffect(() => {
    async function fetchSavedShots() {
      if (!userId) return;
      setLoading(true);
      let shotsData = [];
      if (filterBoardId) {
        // Obtener shots del tablero seleccionado
        const { data, error } = await supabase
          .from("board_shots")
          .select("*, shots(*)")
          .eq("board_id", filterBoardId)
          .order("created_at", { ascending: false });
        if (!error && data) shotsData = data;
      } else {
          // Consulta los shots guardados del usuario, incluyendo relación con board_shots
          const { data, error } = await supabase
            .from("saved_shots")
            .select("*, shots(*, board_shots(*))")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          if (!error && data) shotsData = data;
      }
      setShots(shotsData || []);
      setLoading(false);
    }
    fetchSavedShots();
  }, [userId, filterBoardId]);

  if (!userId) return <div className="text-gray-400 py-8">No hay usuario</div>;
  if (loading) return <div className="text-gray-400 py-8">Cargando...</div>;
  if (shots.length === 0) return <div className="text-gray-400 py-8">No tienes shots guardados</div>;

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full xl:w-screen xl:max-w-none">
        {shots.map((item, idx) => {
          const shotId = item.shots?.id;
          // Filtrar en la vista general: ocultar si está en hiddenShots o si está en algún tablero
          if (!filterBoardId) {
            if (hiddenShots.includes(shotId)) return null;
            if (item.shots?.board_shots && item.shots.board_shots.length > 0) return null;
          }
          return (
            <div
              key={item.id || item.shot_id || idx}
              className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative"
              onClick={() => setSelectedShot(item.shots)}
            >
              {item.shots?.image_url && (
                <img src={item.shots.image_url} alt={item.shots.title || "Shot"} className="w-full object-cover" />
              )}
              <div className="px-2 pt-2 text-xs text-gray-400 font-semibold">{item.shots?.username || "sin Creador"}</div>
              {item.shots?.title && <div className="px-2 py-2 font-semibold text-gray-200">{item.shots.title}</div>}
              {item.shots?.description && <div className="px-2 pb-2 text-gray-300 text-sm">{item.shots.description}</div>}
              {/* Checkbox para seleccionar solo si no se está filtrando por tablero */}
              {!filterBoardId && shotId && (
                <input
                  type="checkbox"
                  className="absolute top-2 right-2 w-5 h-5 accent-yellow-500"
                  checked={selectedShots.includes(shotId)}
                  onChange={e => {
                    if (!shotId) return;
                    setSelectedShots(prev =>
                      e.target.checked
                        ? [...prev, shotId]
                        : prev.filter(id => id !== shotId)
                    );
                  }}
                  onClick={e => e.stopPropagation()}
                />
              )}
            </div>
          );
        })}
      </div>
        {/* Exponer los shots seleccionados al drawer lateral */}
        <div id="shots-selected-data" style={{ display: 'none' }} data-selected-shots={JSON.stringify(selectedShots)} />
        {/* Escuchar evento de guardado desde el drawer overlay */}
        <SavedShotsDrawerOverlayEventListener onClearSelection={ids => {
          setHiddenShots(prev => [...prev, ...ids]);
          setSelectedShots([]);
        }} />
      {selectedShot && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="relative w-full max-w-xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-6 text-gray-100 flex flex-col items-center">
            <button
              className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow"
              onClick={() => setSelectedShot(null)}
              aria-label="Cerrar"
            >
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>&times;</span>
            </button>
            <img src={selectedShot.image_url} alt={selectedShot.title || "Shot"} className="w-full max-h-[60vh] object-contain rounded-lg mb-4" />
            <div className="w-full text-left">
              <div className="text-xs text-gray-400 font-semibold mb-2">{selectedShot.username || "sin Creador"}</div>
              {selectedShot.title && <div className="text-lg font-bold text-yellow-400 mb-2">{selectedShot.title}</div>}
              {selectedShot.description && <div className="text-base text-gray-200 mb-2">{selectedShot.description}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
