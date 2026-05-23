"use client";
import React, { useState } from "react";
import { autoTagBoard } from "../lib/tagUtils";

interface Board { id: string; name: string; shot_count?: number; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  viewMode: string | null;
  obraFilter: string | null;
  boards: Board[];
  loadingBoards: boolean;
  obrasCount: number;
  selectedShotsCount: number;
  depositing: boolean;
  userId: string | null;
  onNavigate: (mode: string | null, obraSlug?: string | null) => void;
  onOpenObras: () => void;
  onCreateBoard: (name: string) => Promise<void>;
  onDepositToBoard: (boardId: string) => void;
  onDeleteBoard: (boardId: string) => Promise<void>;
}

export default function SavedShotsDrawer({ 
  isOpen, onClose, viewMode, obraFilter, boards, loadingBoards, obrasCount, 
  selectedShotsCount, depositing, userId, onNavigate, onOpenObras, 
  onCreateBoard, onDepositToBoard, onDeleteBoard 
}: Props) {
  
  // 🆕 MICRO-ESTADOS LOCALES (Aquí viven, ya no ensucian el Overlay)
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState<string | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!boardName.trim() || !userId) return;
    setCreating(true);
    await onCreateBoard(boardName.trim());
    setBoardName("");
    setCreating(false);
  };

  const handleDelete = async (boardId: string) => {
    setDeletingBoardId(boardId);
    await onDeleteBoard(boardId);
    setDeletingBoardId(null);
    setConfirmDeleteBoardId(null);
  };

  return (
    <div className={`fixed right-0 top-[56px] h-[calc(100vh-56px)] w-64 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col border-l border-gray-700 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Organizar</h3>
        <button className="text-gray-400 hover:text-white text-xl font-bold transition" onClick={onClose}>&times;</button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 custom-scrollbar">
        <div className="space-y-2">
          <button onClick={() => onNavigate('all')} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === 'all' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Colección (Vitrina)
          </button>
          <button onClick={() => onNavigate(null)} className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 ${viewMode === null && !obraFilter ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
            Shots Guardados (Bandeja)
          </button>
        </div>

        <div className="h-px bg-gray-700"></div>
        
        <button 
          onClick={onOpenObras}
          className="w-full py-3 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-500/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
          <span className="flex-1">Obras Guardadas</span>
          <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold">{obrasCount}</span>
        </button>

        <div className="h-px bg-gray-700"></div>
        
        <div>
          <h4 className="text-xs text-gray-400 font-bold uppercase mb-2">Tableros</h4>
          <form onSubmit={handleCreate} className="flex gap-2 mb-3">
            <input type="text" placeholder="Nuevo tablero..." className="flex-1 border border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={boardName} onChange={e => setBoardName(e.target.value)} disabled={creating} />
            <button type="submit" className="bg-yellow-500 text-black rounded-lg px-3 py-1.5 font-bold text-sm disabled:opacity-50 transition hover:bg-yellow-400" disabled={creating || !boardName.trim()}>{creating ? "..." : "+"}</button>
          </form>
          
          {loadingBoards ? <div className="text-gray-400 text-xs text-center py-2">Cargando...</div> : boards.length === 0 ? <div className="text-gray-600 text-xs text-center italic">Sin tableros aún.</div> : (
            <div className="space-y-1.5">
              {boards.map(board => (
                <div key={board.id} className="flex items-center gap-1 group">
                  <button className={`w-full py-2 px-3 rounded-lg font-semibold text-left text-sm transition flex items-center gap-2 flex-1 min-w-0 ${viewMode === board.id ? 'bg-yellow-700 text-white shadow-inner' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`} disabled={depositing} onClick={() => onDepositToBoard(board.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                    <span className="truncate flex-1">{board.name}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">({board.shot_count || 0})</span>
                  </button>
                  {confirmDeleteBoardId === board.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0 animate-fade-in">
                      <button onClick={() => handleDelete(board.id)} disabled={deletingBoardId === board.id} className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-1.5 py-0.5 rounded transition disabled:opacity-50">{deletingBoardId === board.id ? "..." : "Sí"}</button>
                      <button onClick={() => setConfirmDeleteBoardId(null)} className="text-[10px] bg-gray-600 hover:bg-gray-500 text-white font-bold px-1.5 py-0.5 rounded transition">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteBoardId(board.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-red-400 flex-shrink-0" title="Eliminar tablero">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {selectedShotsCount > 0 && viewMode === null && (
        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 text-xs text-center text-yellow-400 font-bold">Selecciona un tablero para depositar {selectedShotsCount} shot(s)</div>
      )}
    </div>
  );
}