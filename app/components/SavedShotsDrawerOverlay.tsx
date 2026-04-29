import React, { useState, useEffect } from "react";
import AllSavedShotsView from "./AllSavedShotsView";
const SavedShots = React.lazy(() => import("./SavedShots"));
import { supabase } from "../../lib/supabaseClient";

interface Props {
  userId: string | null | undefined;
  onClose: () => void;
  initialView?: 'all' | null;
}

export default function SavedShotsDrawerOverlay({ userId, onClose, initialView = null }: Props) {
    const [filterBoardId, setFilterBoardId] = useState<string>("");
    const [depositing, setDepositing] = useState(false);
    const [depositError, setDepositError] = useState("");
    const [depositSuccess, setDepositSuccess] = useState(false);
    
    const [viewMode, setViewMode] = useState<string | null>(initialView);

    // --- FETCH DATOS PERFIL PARA HEADER ---
    const [profileData, setProfileData] = useState<{username:string, avatar_url:string, followers_count:number, following_count:number} | null>(null);

    useEffect(() => {
        if (userId) {
            supabase.from('profiles')
                .select('username, avatar_url, followers_count, following_count')
                .eq('id', userId)
                .single()
                .then(({ data }) => {
                    if(data) setProfileData(data);
                });
        }
    }, [userId]);
    // ---------------------------------------

    function getSelectedShots() {
      const el = document.getElementById("shots-selected-data");
      if (!el) return [];
      try { return JSON.parse(el.getAttribute("data-selected-shots") || "[]"); } catch { return []; }
    }

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  React.useEffect(() => {
    async function fetchBoards() {
      if (!userId) return;
      setLoadingBoards(true);
      try {
        const { data, error } = await supabase
          .from("boards")
          .select("id, name")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) setBoards(data);
      } catch {}
      setLoadingBoards(false);
    }
    fetchBoards();
  }, [userId]);

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim() || !userId) return;
    setCreating(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("boards")
        .insert([{ name: boardName.trim(), user_id: userId }])
        .select();
      if (error) { setError("No se pudo crear el tablero."); } 
      else if (data && data.length > 0) {
        setBoardName("");
        setBoards(prev => [data[0], ...prev]);
      }
    } catch (err) { setError("Error inesperado."); }
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 top-[56px] z-40 flex flex-row items-start justify-end" style={{ minHeight: 'calc(100vh - 56px)', background: 'rgba(10,24,51,0.98)' }}>
      {/* Drawer lateral */}
      <div className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-32 bg-black shadow-2xl z-50 flex flex-col border-l border-gray-800 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-200">Tableros</h3>
          <button className="text-gray-500 hover:text-gray-700 text-xl font-bold" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="mb-4 flex flex-col gap-2">
            
            <button
                className={`w-24 py-1 px-1 rounded font-semibold text-center shadow transition text-sm ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
                onClick={() => { setViewMode('all'); setFilterBoardId(""); setDrawerOpen(false); }}
            > Ver Todo </button>

            <form className="flex flex-col gap-2 mb-2" onSubmit={handleCreateBoard}>
              <input type="text" placeholder="Nuevo" className="border rounded px-1 py-1 w-24 text-sm bg-gray-400 text-black placeholder:text-gray-700 text-center" value={boardName} onChange={e => setBoardName(e.target.value)} disabled={creating} />
              <button type="submit" className="bg-yellow-500 text-white rounded px-1 py-1 font-semibold w-24 text-sm" disabled={creating || !boardName.trim()}> {creating ? "..." : "Crear"} </button>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </form>
            
            {loadingBoards ? ( <button className="py-2 text-gray-400 bg-gray-100 rounded" disabled>Cargando...</button> 
            ) : boards.length === 0 ? ( <button className="py-2 text-gray-400 bg-gray-100 rounded" disabled>Sin tableros</button> 
            ) : ( boards.map(board => (
                <button key={board.id} className={`w-24 py-1 px-1 rounded font-semibold text-left shadow transition disabled:opacity-50 text-sm ${filterBoardId === board.id ? 'bg-yellow-700 text-white' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                  disabled={depositing}
                  onClick={async () => {
                    const shotIds = getSelectedShots();
                    if (shotIds.length > 0) {
                      setDepositing(true); setDepositError(""); setDepositSuccess(false);
                      try {
                        if (!board.id) return;
                        const inserts = shotIds.map((shot_id: string) => ({ board_id: board.id, shot_id }));
                        const { error } = await supabase.from("board_shots").insert(inserts);
                        if (error) { setDepositError("Error."); } 
                        else {
                          setDepositSuccess(true);
                          const el = document.getElementById("shots-selected-data");
                          if (el) el.setAttribute("data-selected-shots", "[]");
                          window.dispatchEvent(new CustomEvent("shots-cleared", { detail: shotIds }));
                        }
                      } catch { setDepositError("Error."); }
                      setDepositing(false);
                      setTimeout(() => setDepositSuccess(false), 2000);
                    } else {
                      setViewMode(null);
                      setFilterBoardId(filterBoardId === board.id ? "" : board.id);
                    }
                    setDrawerOpen(false);
                  }}
                > {depositing ? "..." : board.name} </button>
              ))
            )}
          </div>
          {depositError && <div className="text-red-500 text-xs mt-1">{depositError}</div>}
          {depositSuccess && <div className="text-green-600 text-xs mt-1">¡Agregados!</div>}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 w-full xl:w-screen xl:max-w-none rounded-b-2xl shadow-2xl p-2 pt-2 text-gray-200 flex flex-col items-center relative" style={{ minHeight: 'calc(100vh - 56px)', background: 'rgba(20,20,20,0.95)' }}>
        
        {/* --- HEADER DINÁMICO --- */}
        <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[rgba(20,20,20,0.95)] z-10" style={{ borderBottom: '1px solid #facc15' }}>
          
          <div className="flex items-center gap-3">
            {viewMode === 'all' ? (
                // --- VISTA "COLECCIÓN" ---
                <>
                    {/* 1. Título */}
                    <span className="text-xl font-bold text-yellow-400">Colección</span>
                    
                    {/* 2. Bloque Usuario (Nombre + Seguidores) */}
                    <div className="flex flex-col justify-center border-l border-gray-600 pl-3">
                        <span className="text-base text-white font-bold leading-tight">{profileData?.username || "Usuario"}</span>
                        <span className="text-xs text-gray-400">{profileData?.followers_count ?? 0} seguidores</span>
                    </div>

                    {/* 3. Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-sm font-bold text-white border border-gray-600">
                       {profileData?.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover" alt="Avatar" /> : (profileData?.username || "?").charAt(0).toUpperCase()}
                    </div>

                    {/* 4. Bloque "Siguiendo a" */}
                    <div className="border-l border-gray-600 pl-3 flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Siguiendo a</span>
                        <span className="text-sm text-white font-bold">{profileData?.following_count ?? 0}</span>
                    </div>
                </>
            ) : (
                // --- VISTA NORMAL (SHOTS GUARDADOS) ---
                <>
                    <button 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow mr-2" 
                        onClick={() => {
                            if (filterBoardId) { setFilterBoardId(""); } 
                            else { onClose(); }
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 6L8 11L14 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <h2 className="text-base font-semibold flex-1 text-left">
                        {filterBoardId ? boards.find(b => b.id === filterBoardId)?.name || 'Tablero' : 'Shots guardados'}
                    </h2>
                </>
            )}
          </div>

          <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow ml-2" onClick={() => setDrawerOpen(v => !v)}> &#9776; </button>
        </div>
        
        {/* CONTENIDO */}
        <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          
          {viewMode === 'all' ? (
             <AllSavedShotsView userId={userId} />
          ) : (
             <React.Suspense fallback={<div className="text-gray-400 py-8">Cargando...</div>}>
              {(() => {
                const el = typeof document !== 'undefined' ? document.getElementById("shots-selected-data") : null;
                let selected = [];
                try { selected = el ? JSON.parse(el.getAttribute("data-selected-shots") || "[]") : []; } catch {}
                if (filterBoardId && selected.length === 0) { return <SavedShots userId={userId} filterBoardId={filterBoardId} />; }
                return <SavedShots userId={userId} />;
              })()}
            </React.Suspense>
          )}

        </div>
      </div>
    </div>
  );
}