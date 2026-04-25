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

interface ShotCardProps {
  shot: Shot;
  user: any;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClick: () => void;
  boardName?: string; // <--- NUEVA PROP (Opcional)
}

export default function ShotCard({ shot, user, isSaved, isSaving, onSave, onClick, boardName }: ShotCardProps) {
  return (
    <div
      className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative"
      onClick={onClick}
    >
      <img src={shot.image_url} alt={shot.title || "Shot"} className="w-full object-cover" />
      
      {/* Etiqueta de Tablero (Solo si existe) */}
      {boardName && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg opacity-90 hover:opacity-100 transition">
          {boardName}
        </div>
      )}

      {shot.author && (
        <div className="px-2 pt-2 text-yellow-400 font-bold text-sm">{shot.author}</div>
      )}

      {user && (
        <button
          className={`absolute top-2 right-2 rounded-full w-[32px] h-[32px] flex items-center justify-center shadow-lg z-0 transition-colors`}
          style={isSaved
            ? { background: '#facc15', color: '#fff', cursor: 'default', boxShadow: '0 2px 8px #facc15aa' }
            : { background: 'rgba(236, 72, 153, 0.35)', backdropFilter: 'blur(8px)', color: '#fff' }
          }
          disabled={isSaved || isSaving}
          tabIndex={-1}
          aria-label={isSaved ? "Guardado" : "Guardar shot"}
          onClick={e => { e.stopPropagation(); onSave(); }}
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

      {shot.title && <div className="px-2 py-2 font-semibold text-gray-200">{shot.title}</div>}
    </div>
  );
}