"use client";
import React from "react";

interface Props {
  userEmail: string;
  userRole: string;
  onCloseMenu: () => void;
  onLogout: () => void;
  onNavigate: (action: 'shots' | 'config' | 'saved' | 'collection') => void; // ACTUALIZADO
}

export default function UserMenuDropdown({ userEmail, userRole, onCloseMenu, onLogout, onNavigate }: Props) {
  
  const canAccessMyShots = userRole === 'member' || userRole === 'admin' || userRole === 'superadmin';

  return (
    <div className="fixed top-4 right-4 z-50 flex items-start justify-end">
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-64 p-6 relative flex flex-col">
        <button className="absolute top-2 right-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow" onClick={onCloseMenu}>&times;</button>
        
                {/* VINCULO A VITRINA/PERFIL */}
        <button 
          className="px-2 py-2 text-gray-200 text-sm border-b border-gray-700 mb-2 text-left w-full hover:text-yellow-400 font-bold" 
          onClick={() => onNavigate('collection')}
        >
          @{userEmail}
        </button>

        <button className={`w-full text-left px-2 py-2 text-sm border-b border-gray-700 ${canAccessMyShots ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed'}`} onClick={() => canAccessMyShots && onNavigate('shots')} disabled={!canAccessMyShots}>
          Mis Shots
          {!canAccessMyShots && ( <span className="block text-xs text-red-500 mt-1">Solo para Miembros</span> )}
        </button>

        <button className="w-full text-left px-2 py-2 text-gray-200 hover:bg-gray-700 text-sm border-b border-gray-700" onClick={() => onNavigate('saved')}>
          Shots Guardados
        </button>
        
        {/* ACTUALIZADO: La acción ahora es 'config' */}
        <button className="w-full text-left px-2 py-2 text-gray-400 hover:text-yellow-400 text-sm mt-2 border-t border-gray-700 flex items-center gap-2" onClick={() => onNavigate('config')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Configuración
        </button>

        <button className="w-full text-left px-2 py-2 text-red-400 hover:bg-gray-700 text-sm mt-2" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}