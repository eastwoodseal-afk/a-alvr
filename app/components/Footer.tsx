"use client";
"use client";
import React, { useState } from "react";
import ModalCreateShot from "./ModalCreateShot";
import { useAuth } from "../../lib/AuthContext";

export default function Footer() {
  const [showMenu, setShowMenu] = useState(false);
  const [modalSection, setModalSection] = useState<number | null>(null);
  const { user } = useAuth();

  // Cerrar menú al hacer click fuera
  React.useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      const menu = document.getElementById("footer-menu-dropdown");
      const btn = document.getElementById("footer-menu-btn");
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <footer className="w-full py-4 px-6 bg-gray-800 text-gray-200 text-sm mt-auto flex items-center justify-end relative">
      <div className="relative">
        <div className="relative inline-block group">
          <button
            id="footer-menu-btn"
            className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow ${!user || user?.role === 'subscriber' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => user && user.role !== 'subscriber' && setShowMenu((prev) => !prev)}
            aria-label="Crear shot"
            disabled={!user || user?.role === 'subscriber'}
          >
            +
          </button>
          {user?.role === 'subscriber' && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200" style={{ whiteSpace: 'nowrap' }}>
              Solo para Miembros
            </span>
          )}
        </div>
        {showMenu && (
          <div id="footer-menu-dropdown" className="absolute bottom-10 right-0 flex flex-col items-end gap-2 z-50">
            <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow" aria-label="Subir archivo" onClick={() => { setModalSection(1); setShowMenu(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0l-4 4m4-4v12" /></svg>
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow" aria-label="Subir carpeta" onClick={() => { setModalSection(2); setShowMenu(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow" aria-label="Subir por URL" onClick={() => { setModalSection(3); setShowMenu(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-6m0 0l-2 2m2-2l2 2m-2-2V5m8 14a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7z" /></svg>
            </button>
            <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow" aria-label="Subir por cámara" onClick={() => { setModalSection(4); setShowMenu(false); }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" /></svg>
            </button>
          </div>
        )}
      </div>
      <ModalCreateShot open={modalSection !== null} section={modalSection} onClose={() => setModalSection(null)} user={user} />
    </footer>
  );
}