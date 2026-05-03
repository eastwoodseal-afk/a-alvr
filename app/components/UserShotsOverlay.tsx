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
            
            {/* Título (Sin flex-1 para que se pegue al botón) */}
            <h2 className="text-left text-base font-semibold">
              Mis Shots <span className="text-gray-500 mx-1">|</span> Mi Estudio
            </h2>
            
            {/* Botón Compartir (Pegado al título, Icono Lámpara) */}
            <button 
              onClick={() => setShowShareModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow transition ml-2"
              title="Compartir mi Estudio"
            >
              {/* Icono: Lámpara de Dibujante (Estilo Pixar) */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
                {/* Base */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6" />
                {/* Soporte Vertical */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6" />
                {/* Brazo de la lámpara */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-5-6" />
                {/* Pantalla/Tulipa (apuntando hacia abajo/izquierda) */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h6l2-4H6z" />
              </svg>
            </button>
          </div>

          {/* CONTENIDO: Grid de Shots */}
          <div className="w-full flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <UserShots userId={userId} />
          </div>
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