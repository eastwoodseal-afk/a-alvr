import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
}

interface MyShotDetailModalProps {
  shot: Shot;
  user: any;
  onClose: () => void;
  setShots: (shots: Shot[]) => void;
  shots: Shot[];
}

export default function MyShotDetailModal({ shot, user, onClose, setShots, shots }: MyShotDetailModalProps) {
  const [editTitle, setEditTitle] = useState(shot?.title || "");
  const [editDescription, setEditDescription] = useState(shot?.description || "");
  const [editAuthor, setEditAuthor] = useState(shot?.author || "");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

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
      setShots(shots.map(s => s.id === shot.id ? { ...s, title: editTitle, description: editDescription, author: editAuthor } : s));
      setEditing(false); // Salir de modo edición
      // Opcional: cerrar modal después de guardar
      // onClose(); 
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center pt-20 pb-[80px] overflow-auto custom-scrollbar" style={{ background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center overflow-auto custom-scrollbar w-full sm:w-fit px-4 sm:px-8 p-6"
        style={{
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          background: 'rgba(17, 24, 39, 0.85)',
        }}
      >
        {/* --- BARRA DE BOTONES A LA DERECHA (Estilo Unificado) --- */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10">
          
          {/* Botón Cerrar */}
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow transition-colors"
            onClick={onClose}
            aria-label="Cerrar"
          >
            &times;
          </button>

          {/* Botón Editar (Solo si eres dueño y no estás editando ya) */}
          {user && shot && user.id === shot.user_id && !editing && (
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-lg font-bold shadow transition-colors"
              onClick={() => setEditing(true)}
              aria-label="Editar"
            >
              {/* Icono de Lápiz */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}

        </div>
        {/* -------------------------------------------------------- */}

        <img
          src={shot.image_url}
          alt={shot.title || "Shot"}
          className="object-contain rounded-lg mb-4"
          style={{
            width: '100%',
            maxWidth: '100vw',
            height: 'auto',
            maxHeight: '80vh',
            display: 'block',
          }}
          onLoad={e => {
            const img = e.currentTarget;
            if (img.parentElement) {
              if (window.innerWidth >= 640) {
                const naturalWidth = Math.min(img.naturalWidth, 1600);
                img.parentElement.style.width = naturalWidth + 'px';
              } else {
                img.parentElement.style.width = '100%';
              }
            }
          }}
        />
        
        <div className="w-full text-left">
          {/* MODO VISUALIZACIÓN */}
          {!editing ? (
            <>
              {shot.author && (
                <div className="text-lg text-yellow-400 font-bold mb-2">{shot.author}</div>
              )}
              {shot.title && <div className="text-base font-bold text-yellow-400 mb-2">{shot.title}</div>}
              {shot.description && <div className="text-base text-gray-200 mb-2">{shot.description}</div>}
              <div className="text-xs text-gray-400 mt-4">
                Usuario: {shot.username || "sin username"}
              </div>
            </>
          ) : (
          /* MODO EDCCIÓN */
            <form className="space-y-3 mb-2 mt-4" onSubmit={handleSave}>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center font-bold"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Título"
                disabled={editLoading}
              />
              <textarea
                className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Descripción"
                disabled={editLoading}
              />
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center"
                value={editAuthor}
                onChange={e => setEditAuthor(e.target.value)}
                placeholder="Autor"
                disabled={editLoading}
              />
              {editError && <div className="text-red-500 text-sm mb-2">{editError}</div>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition" disabled={editLoading}>
                  {editLoading ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-bold hover:bg-gray-600 transition" onClick={() => setEditing(false)} disabled={editLoading}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}