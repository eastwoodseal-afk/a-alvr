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
    // Log temporal para depuración
    console.log('Modal user:', user);
    console.log('Modal shot.user_id:', shot?.user_id);
  const [editTitle, setEditTitle] = useState(shot?.title || "");
  const [editDescription, setEditDescription] = useState(shot?.description || "");
  const [editAuthor, setEditAuthor] = useState(shot?.author || "");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  if (!shot) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center pt-20 pb-[80px] overflow-auto custom-scrollbar" style={{ background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center overflow-auto custom-scrollbar w-full sm:w-fit px-4 sm:px-8 p-6"
        style={{
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          background: 'rgba(17, 24, 39, 0.85)', // semitransparente
        }}
      >
        <button
          className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow"
          onClick={onClose}
          aria-label="Cerrar"
        >
          &times;
        </button>
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
            <div className="text-lg text-yellow-400 font-bold mb-2">
              {shot.author || "sin autor"}
            </div>
            {shot.title && <div className="text-base font-bold text-yellow-400 mb-2">{shot.title}</div>}
            {shot.description && <div className="text-base text-gray-200 mb-2">{shot.description}</div>}
            {/* ...otros datos... */}
            {/** Mostrar el username al final con el título 'Usuario' */}
            <div className="text-xs text-gray-400 mt-4">
              Usuario: {shot.username || "sin username"}
            </div>
          {user && shot && user.id === shot.user_id ? (
            <>
              {!editing ? (
                <>
                  {/* La descripción ya se muestra arriba */}
                  <button
                    className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-4 rounded font-bold"
                    onClick={() => setEditing(true)}
                  >
                    Editar
                  </button>
                </>
              ) : (
                <form
                  className="space-y-3 mb-2"
                  onSubmit={async e => {
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
                      onClose();
                      setShots(shots.map(s => s.id === shot.id ? { ...s, title: editTitle, description: editDescription, author: editAuthor } : s));
                      setEditing(false);
                    }
                  }}
                >
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
                      {editLoading ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button type="button" className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-bold hover:bg-gray-600 transition" onClick={() => setEditing(false)} disabled={editLoading}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              {shot.title && <div className="text-lg font-bold text-yellow-400 mb-2">{shot.title}</div>}
              {shot.description && <div className="text-base text-gray-200 mb-2">{shot.description}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
