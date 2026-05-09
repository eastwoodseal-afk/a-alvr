import React from "react";

interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; }

interface ShotCardProps {
  shot: Shot;
  user: any;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClick: () => void;
  isLiked: boolean;
  likesCount: number;
  isLiking: boolean;
  onLike: () => void;
  boardName?: string;
  hideLikes?: boolean;
  hideViews?: boolean;
  isAdmin?: boolean;
  onDisapprove?: (id: string) => void;
  isDisapproving?: boolean;
}

// LEY 1.1: React.memo evita el redibujado masivo. Solo se actualiza si SUS props cambian.
const ShotCard = React.memo(function ShotCard({ 
  shot, user, isSaved, isSaving, onSave, onClick, isLiked, likesCount, isLiking, onLike, boardName, hideLikes, hideViews,
  isAdmin, onDisapprove, isDisapproving 
}: ShotCardProps) {
  return (
    <div 
      className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative" 
      onClick={onClick}
    >
      <div className="relative w-full">
        <img src={shot.image_url} alt={shot.title || "Shot"} className="w-full object-cover" />
        {boardName && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg opacity-90 hover:opacity-100 transition z-10">
            {boardName}
          </div>
        )}
      </div>
      
      <div className="p-2 flex justify-between items-start gap-2 relative">
        
        {/* LADO IZQUIERDO: TEXTO */}
        <div className="flex-1 min-w-0">
          {shot.author && ( <div className="text-yellow-400 font-bold text-sm truncate">{shot.author}</div> )}
          {shot.title && <div className="font-semibold text-gray-200 text-sm truncate">{shot.title}</div>}
        </div>

        {/* LADO DERECHO: CONTADORES */}
        <div className="flex items-center gap-2 flex-shrink-0">
            
            {!hideViews && (
              <div className="flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] text-gray-500 font-mono">{shot.views_count || 0}</span>
              </div>
            )}

            {!hideLikes && (
              <div className="flex flex-col items-center justify-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); onLike(); }} 
                  disabled={!user || isLiking}
                  className={`transition-transform active:scale-125 ${isLiking ? 'animate-pulse' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "#ef4444" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke={isLiked ? "#ef4444" : "#9ca3af"} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>
                <span className="text-[10px] text-gray-400 font-mono">{likesCount}</span>
              </div>
            )}
        </div>
      </div>

      {/* --- BOTÓN GUARDAR (DERECHA) --- */}
      {user && (
        <button
          className="absolute top-2 right-2 rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg z-10"
          style={isSaved ? { background: '#facc15', color: '#fff', cursor: 'default', boxShadow: '0 2px 8px #facc15aa' } : { background: 'rgba(236, 72, 153, 0.35)', backdropFilter: 'blur(8px)', color: '#d1d5db' } }
          disabled={isSaved || isSaving}
          onClick={e => { e.stopPropagation(); onSave(); }}
        >
          {isSaved ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.841-1.672A2.31 2.31 0 0013.86 4H10.14a2.31 2.31 0 00-2.087 1.278l-.84 1.672zM12 16.5a3 3 0 100-6 3 3 0 000 6z" /></svg>
          )}
        </button>
      )}

      {/* --- NUEVO: BOTÓN DESAPROBAR (IZQUIERDA) --- */}
      {isAdmin && onDisapprove && (
        <button
          className="absolute top-2 left-2 rounded-full w-[28px] h-[28px] flex items-center justify-center shadow-lg z-10 backdrop-blur-sm bg-pink-500/40 hover:bg-pink-500 transition group"
          disabled={isDisapproving}
          onClick={e => { e.stopPropagation(); onDisapprove(shot.id); }}
          title="Desaprobar shot (Ocultar)"
        >
            {isDisapproving ? (
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-400 group-hover:text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            )}
        </button>
      )}
    </div>
  );
}); // <--- ESTE ES EL PARÉNTESIS FALTANTE DE React.memo

export default ShotCard;