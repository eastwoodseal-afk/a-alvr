"use client";
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

interface Shot {
  id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string;
}

interface Props {
  shot: Shot;
  user: any;
  onClose: () => void;
  onUpdate: (updatedShot: Shot) => void;
  onRelinquish: (shotId: string) => void;
}

export default function MyShotDetailModal({ shot, user, onClose, onUpdate, onRelinquish }: Props) {
  const [editTitle, setEditTitle] = useState(shot?.title || "");
  const [editDescription, setEditDescription] = useState(shot?.description || "");
  const [editAuthor, setEditAuthor] = useState(shot?.author || "");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [relinquishing, setRelinquishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // NUEVO: Estado para advertencia estilizada

  if (!shot) return null;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    
    const { error } = await supabase
      .from("shots")
      .update({ title: editTitle, description: editDescription, author: editAuthor })
      .eq("id", shot.id);
      
    setEditLoading(false);
    if (error) {
      setEditError("No se pudo actualizar el shot.");
    } else {
      onUpdate({ ...shot, title: editTitle, description: editDescription, author: editAuthor });
      setEditing(false);
      setConfirmDelete(false); // Resetear si guardamos
    }
  };

  const handleRelinquish = async () => {
    // Ya no usamos el confirm() del sistema. La confirmación es el doble clic en el botón.
    setRelinquishing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Error de autenticación."); setRelinquishing(false); return; }

      const res = await fetch('/api/relinquish-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, accessToken: session.access_token })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        onRelinquish(shot.id);
        onClose();
      } else {
        alert(data.error || "No se pudo renunciar al shot.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setRelinquishing(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[49] flex flex-col items-center pt-3 pb-[20px]" style={{ top: '56px', background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center w-full sm:w-fit p-4 overflow-y-auto custom-scrollbar"
        style={{ maxWidth: '100vw', maxHeight: '90vh', boxSizing: 'border-box', background: 'rgba(17, 24, 39, 0.85)' }}
      >
        
        {/* BARRA LATERAL MÍNIMA */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10 bg-gray-500/50 backdrop-blur-sm rounded-xl p-2 mr-1">
          <button onClick={onClose} className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full p-1.5 shadow transition" aria-label="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {user && shot && user.id === shot.user_id && !editing && (
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shadow transition-colors"
              onClick={() => setEditing(true)}
              aria-label="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}
        </div>

        {/* Imagen Real */}
        <img 
            src={shot.image_url} 
            alt={shot.title || "Shot"} 
            className="object-contain rounded-lg mb-4" 
            style={{ width: '100%', maxWidth: '100vw', height: 'auto', display: 'block' }} 
            onLoad={e => {
                const img = e.currentTarget;
                if (img.parentElement && window.innerWidth >= 640) {
                  img.parentElement.style.width = img.naturalWidth + 'px';
                } else if (img.parentElement) {
                  img.parentElement.style.width = '100%';
                }
            }}
        />
        
        <div className="w-full text-left">
          {!editing ? (
            <>
              {shot.author && (<div className="text-lg text-yellow-400 font-bold mb-1">{shot.author}</div>)}
              {shot.title && <div className="text-base font-bold text-gray-100 mb-2">{shot.title}</div>}
              {shot.description && <div className="text-sm text-gray-300 mb-2">{shot.description}</div>}
              <div className="text-xs text-gray-500 mt-4 border-t border-gray-800 pt-2">
                Subido por: {shot.username || "Tú"}
              </div>
              {/* ELIMINADO: El botón de renuncia ya no está aquí */}
            </>
          ) : (
            <form className="space-y-3 mb-2 mt-4" onSubmit={handleSave}>
              <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center font-bold" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" disabled={editLoading} />
              <textarea className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Descripción" disabled={editLoading} />
              <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} placeholder="Arquitecto / Estudio" disabled={editLoading} />
              {editError && <div className="text-red-500 text-sm mb-2 text-center">{editError}</div>}
              
              {/* NUEVO: Advertencia estilizada de Eliminar */}
              {confirmDelete && (
                <div className="w-full text-[10px] text-red-400 bg-red-900/30 border border-red-800/50 rounded px-2 py-1.5 text-center animate-fade-in">
                  ⚠️ Acción irreversible. El shot pasará al acervo público del Ateneo.
                </div>
              )}

              {/* BOTONERA ACTUALIZADA: 3 botones, 28px alto, Guardar el más ancho */}
              <div className="flex gap-2 w-full">
                <button 
                  type="button" 
                  onClick={() => confirmDelete ? handleRelinquish() : setConfirmDelete(true)} 
                  disabled={relinquishing} 
                  className={`h-7 px-3 rounded-lg font-bold text-xs transition disabled:opacity-50 flex-shrink-0 ${confirmDelete ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/50'}`}
                >
                  {relinquishing ? "..." : confirmDelete ? "¿Eliminar?" : "Eliminar"}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => { setEditing(false); setConfirmDelete(false); }} 
                  disabled={editLoading || relinquishing} 
                  className="h-7 px-4 bg-gray-500 text-white rounded-lg font-bold text-xs hover:bg-gray-400 transition disabled:opacity-50 flex-shrink-0"
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={editLoading || relinquishing} 
                  className="flex-1 h-7 bg-yellow-500 text-black rounded-lg font-bold text-xs hover:bg-yellow-400 transition disabled:opacity-50"
                >
                  {editLoading ? "..." : "Guardar"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}