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
      {/* Overlay principal: z-40 (debajo del Header), inicia debajo del Header (top-14) */}
      <div className="fixed inset-0 top-14 z-40 flex flex-col bg-[#0a1833]">
          
        {/* HEADER INTERNO */}
        <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-yellow-500 bg-[#0a1833]">
            
          {/* Botón Volver */}
          <button 
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow mr-2" 
            onClick={onClose} 
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2003/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Título */}
          <h2 className="text-base font-semibold text-gray-200">
            Mis Shots <span className="text-gray-500 mx-1">|</span> Mi Estudio
          </h2>
          
          {/* Botón Compartir */}
          <button 
            onClick={() => setShowShareModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow transition ml-2"
            title="Compartir mi Estudio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
          </button>
        </div>

        {/* CONTENIDO: Ocupa el resto, con scroll propio y espacio superior pt-4 */}
        <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
          <UserShots userId={userId} />
        </div>
      </div>

      {/* MODAL DE COMPARTIR */}
      <ShareDesktopModal 
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}