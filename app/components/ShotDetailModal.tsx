import React from "react";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
}

interface ModalProps {
  shot: Shot; 
  onClose: () => void;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  user: any;
}

export default function ShotDetailModal({ shot, onClose, isSaved, isSaving, onSave, user }: ModalProps) {
  if (!shot) return null;
  
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col items-center pt-[40px] pb-[80px] overflow-auto custom-scrollbar" style={{ top: '64px', maxHeight: 'calc(100vh - 64px)', background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center overflow-auto custom-scrollbar w-full sm:w-fit px-4 sm:px-8 p-6"
        style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}
      >
        
        {/* CONTENEDOR DE BOTONES A LA DERECHA */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-center z-10">
          
          {/* Botón Cerrar (X) */}
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow transition-colors"
            onClick={onClose}
            aria-label="Cerrar"
          >
            &times;
          </button>

          {/* Botón Guardar (Cámara/Paloma) - Solo si hay usuario */}
          {user && (
            <button
              className={`rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg transition-colors`}
              style={isSaved
                ? { background: '#facc15', color: '#fff', cursor: 'default', boxShadow: '0 2px 8px #facc15aa' }
                : { background: 'rgba(236, 72, 153, 0.35)', backdropFilter: 'blur(8px)', color: '#fff' }
              }
              disabled={isSaved || isSaving}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              aria-label={isSaved ? "Guardado" : "Guardar shot"}
            >
              {isSaved ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Imagen y Contenido */}
        <img
          src={shot.image_url}
          alt={shot.title || "Shot"}
          className="object-contain rounded-lg mb-4"
          style={{ width: '100%', maxWidth: '100vw', height: 'auto', maxHeight: '80vh', display: 'block' }}
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
          {shot.author && (
            <div className="text-lg text-yellow-400 font-bold mb-2">{shot.author}</div>
          )}
          {shot.title && <div className="text-lg font-bold text-yellow-400 mb-2">{shot.title}</div>}
          {shot.description && <div className="text-base text-gray-200 mb-2">{shot.description}</div>}
          <div className="text-xs text-gray-400 mt-2">Usuario: {shot.username || "sin username"}</div>
        </div>
      </div>
    </div>
  );
}