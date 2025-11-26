import React, { useState } from "react";

interface Props {
  userId: string | null | undefined;
  onClose: () => void;
}

export default function SavedShotsDrawerOverlay({ userId, onClose }: Props) {
      const [filterBoardId, setFilterBoardId] = useState<string>("");
    const [depositing, setDepositing] = useState(false);
    const [depositError, setDepositError] = useState("");
    const [depositSuccess, setDepositSuccess] = useState(false);
    const [selectedBoardId, setSelectedBoardId] = useState<string>("");

    // Obtener los shots seleccionados desde el DOM
    function getSelectedShots() {
      const el = document.getElementById("shots-selected-data");
      if (!el) return [];
      try {
        return JSON.parse(el.getAttribute("data-selected-shots") || "[]");
      } catch {
        return [];
      }
    }

    async function handleDepositShots() {
      const shotIds = getSelectedShots();
      if (!selectedBoardId || shotIds.length === 0) return;
      setDepositing(true);
      setDepositError("");
      try {
        const inserts = shotIds.map((shot_id: string) => ({ board_id: selectedBoardId, shot_id }));
        const { error } = await (await import("../../lib/supabaseClient")).supabase
          .from("board_shots")
          .insert(inserts);
        if (error) setDepositError("No se pudieron agregar los shots.");
      } catch {
        setDepositError("Error inesperado.");
      }
      setDepositing(false);
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
        const { data, error } = await (await import("../../lib/supabaseClient")).supabase
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
      const { data, error } = await (await import("../../lib/supabaseClient")).supabase
        .from("boards")
        .insert([{ name: boardName.trim(), user_id: userId }])
        .select();
      if (error) {
        setError("No se pudo crear el tablero.");
      } else if (data && data.length > 0) {
        setBoardName("");
        // Actualizar la lista de tableros en memoria sin recargar
        setBoards(prev => [data[0], ...prev]);
      }
    } catch (err) {
      setError("Error inesperado.");
    }
    setCreating(false);
  }


  // Importar SavedShots dinámicamente para evitar problemas de SSR
  const SavedShots = React.lazy(() => import("./SavedShots"));
  return (
    <div className="fixed inset-0 top-[56px] z-40 flex flex-row items-start justify-end" style={{ minHeight: 'calc(100vh - 56px)', background: 'rgba(10,24,51,0.98)' }}>
      {/* Drawer lateral */}
      <div
        className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-32 bg-black shadow-2xl z-50 flex flex-col border-l border-gray-800 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onMouseEnter={() => setDrawerOpen(true)}
        onMouseLeave={() => setDrawerOpen(false)}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Tableros</h3>
          <button className="text-gray-500 hover:text-gray-700 text-xl font-bold" onClick={() => setDrawerOpen(false)} aria-label="Cerrar">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {/* Lista de tableros reales y selector */}
          
          
          <div className="mb-4 flex flex-col gap-2">
            {/* Formulario para crear tablero arriba */}
            <form className="flex flex-col gap-2 mb-2" onSubmit={handleCreateBoard}>
              <input
                type="text"
                placeholder="Nuevo"
                className="border rounded px-1 py-1 w-24 text-sm bg-gray-400 text-black placeholder:text-gray-700 text-center"
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                disabled={creating}
              />
              <button type="submit" className="bg-yellow-500 text-white rounded px-1 py-1 font-semibold w-24 text-sm" disabled={creating || !boardName.trim()}>
                {creating ? "Creando..." : "Crear tablero"}
              </button>
              {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </form>
            {/* Botones de tableros debajo */}
            {loadingBoards ? (
              <button className="py-2 text-gray-400 bg-gray-100 rounded" disabled>Cargando tableros...</button>
            ) : boards.length === 0 ? (
              <button className="py-2 text-gray-400 bg-gray-100 rounded" disabled>No tienes tableros</button>
            ) : (
              boards.map(board => (
                <button
                  key={board.id}
                  className={`w-24 py-1 px-1 rounded font-semibold text-left shadow transition disabled:opacity-50 text-sm ${filterBoardId === board.id ? 'bg-yellow-700 text-white' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                  disabled={depositing}
                  onClick={async () => {
                    const shotIds = getSelectedShots();
                    if (shotIds.length > 0) {
                      // Agregar shots seleccionados al tablero
                      setDepositing(true);
                      setDepositError("");
                      setDepositSuccess(false);
                      try {
                        if (!board.id) return;
                        const inserts = shotIds.map((shot_id: string) => ({ board_id: board.id, shot_id }));
                        const { error } = await (await import("../../lib/supabaseClient")).supabase
                          .from("board_shots")
                          .insert(inserts);
                        if (error) {
                          setDepositError("No se pudieron agregar los shots.");
                        } else {
                          setDepositSuccess(true);
                          // Limpiar selección de shots y ocultar en la UI
                          const el = document.getElementById("shots-selected-data");
                          let cleared = [];
                          if (el) {
                            cleared = JSON.parse(el.getAttribute("data-selected-shots") || "[]");
                            el.setAttribute("data-selected-shots", "[]");
                          }
                          // Emitir evento para que SavedShots limpie y oculte los shots
                          window.dispatchEvent(new CustomEvent("shots-cleared", { detail: cleared }));
                        }
                      } catch {
                        setDepositError("Error inesperado.");
                      }
                      setDepositing(false);
                      setTimeout(() => setDepositSuccess(false), 2000);
                    } else {
                      // Filtrar shots por tablero
                      setFilterBoardId(filterBoardId === board.id ? "" : board.id);
                    }
                    // Cerrar el menú lateral después de cualquier acción
                    setDrawerOpen(false);
                  }}
                >
                  {depositing ? "Agregando..." : board.name}
                </button>
              ))
            )}
          </div>
          {depositError && <div className="text-red-500 text-xs mt-1">{depositError}</div>}
          {depositSuccess && <div className="text-green-600 text-xs mt-1">Shots agregados correctamente</div>}
          {/* Aquí se eliminó el renderizado de SavedShots en el menú lateral, pero se conserva el filtrado en el overlay principal */}
          {depositError && <div className="text-red-500 text-xs mt-1">{depositError}</div>}
          {depositSuccess && <div className="text-green-600 text-xs mt-1">Shots agregados correctamente</div>}
        </div>
      </div>
      {/* Contenido principal de shots guardados */}
      <div className="flex-1 w-full xl:w-screen xl:max-w-none rounded-b-2xl shadow-2xl p-2 pt-2 text-gray-200 flex flex-col items-center relative" style={{ minHeight: 'calc(100vh - 56px)', background: 'rgba(20,20,20,0.95)' }}>
        <div className="w-full flex items-center justify-between px-4 py-3 sticky top-0 bg-[rgba(20,20,20,0.95)] z-10" style={{ borderBottom: '1px solid #facc15' }}>
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow mr-2"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ padding: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 6L8 11L14 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2 className="text-base font-semibold flex-1 text-left">
            {filterBoardId
              ? boards.find(b => b.id === filterBoardId)?.name || 'Tablero'
              : 'Shots guardados'}
          </h2>
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow ml-2"
            onClick={() => setDrawerOpen(v => !v)}
            aria-label="Abrir menú lateral"
          >
            &#9776;
          </button>
        </div>
        <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <React.Suspense fallback={<div className="text-gray-400 py-8">Cargando shots guardados...</div>}>
            {/* Mostrar shots filtrados solo si no hay shots seleccionados y hay filtro activo */}
            {(() => {
              const el = typeof document !== 'undefined' ? document.getElementById("shots-selected-data") : null;
              let selected = [];
              try {
                selected = el ? JSON.parse(el.getAttribute("data-selected-shots") || "[]") : [];
              } catch {}
              if (filterBoardId && selected.length === 0) {
                return <SavedShots userId={userId} filterBoardId={filterBoardId} />;
              }
              return <SavedShots userId={userId} />;
            })()}
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}
