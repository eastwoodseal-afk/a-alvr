"use client";
import React, { useState } from "react";
import UserShots from "./UserShots";
import ShareDesktopModal from "./ShareDesktopModal";

interface Props {
  userId: string;
  onClose: () => void;
}

export default function UserShotsOverlay({ userId, onClose }: Props) {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <div className="fixed inset-0 top-[56px] z-20 flex flex-col items-center justify-start" style={{ minHeight: 'calc(100vh - 56px)', background: '#0a1833' }}>
        <div className="w-full rounded-b-2xl shadow-2xl p-2 pt-2 text-gray-200 flex flex-col items-center relative" style={{ minHeight: 'calc(100vh - 56px)', background: 'transparent' }}>
          
          {/* HEADER INTERNO */}
          <div className="w-full flex items-center px-4 py-3 sticky top-0 bg-[#0a1833] z-10" style={{ borderBottom: '1px solid #facc15' }}>
            
            {/* Botón Volver */}
            <button 
              className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xl font-bold shadow mr-2" 
              onClick={onClose} 
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Título */}
            <h2 className="text-left text-base font-semibold flex-1">Mis Shots</h2>
            
            {/* Botón Compartir Estudio */}
            <button 
              onClick={() => setShowShareModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow"
              title="Compartir mi Estudio"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>
          </div>

          {/* CONTENIDO: Grid de Shots */}
          <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <UserShots userId={userId} />
          </div>
        </div>
      </div>

      {/* MODAL DE COMPARTIR (Lógica movida aquí) */}
      <ShareDesktopModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}