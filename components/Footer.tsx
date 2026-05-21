"use client";
import React, { useState, useEffect } from "react";
import ModalCreateShot from "./ModalCreateShot";
import { useAuth } from "../lib/AuthContext";
import { hasPermission } from "../lib/roleUtils";
import { supabase } from "../lib/supabaseClient";

// ... (FACET_LABELS y TagItem se quedan exactamente igual) ...

export default function Footer() {
  const [showMenu, setShowMenu] = useState(false);
  const [modalSection, setModalSection] = useState<number | null>(null);
  const { user, isAdminMode, toggleAdminMode } = useAuth(); // 🆕 Destructurar del context

  // ... (toda la lógica de categorías, tags, etc. se queda exactamente igual) ...

  const canCreate = user ? hasPermission(user.role, 'canCreateShots') : false;
  const isRealAdmin = user?.actualRole === 'admin' || user?.actualRole === 'superadmin'; // 🆕 Ver el rol real

  // ... (groupedTags, etc. se quedan igual) ...

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 w-full h-16 py-4 px-6 bg-gray-800 text-gray-200 text-sm flex items-center justify-between z-40 border-t border-gray-700">
        
        {/* LADO IZQUIERDO (Tags, categorías, vista) - IGUAL */}
        <div className="flex items-center gap-3">
           {/* ... (botones de categoría, tags, vista idénticos) ... */}
        </div>

        {/* LADO DERECHO (Switch + Botón crear) */}
        <div className="flex items-center gap-3"> {/* 🆕 Contenedor flex para alinear */}
          
          {/* 🆕 SWITCH DE MODO ADMIN */}
          {isRealAdmin && (
            <button 
              onClick={toggleAdminMode}
              className={`relative w-[36px] h-[20px] rounded-full transition-colors duration-200 ${isAdminMode ? 'bg-yellow-500' : 'bg-gray-600'}`}
              title={isAdminMode ? "Modo Admin: Activado (Click para vista Miembro)" : "Modo Admin: Desactivado (Click para volver a Admin)"}
            >
              <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${isAdminMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
          )}

          {/* BOTÓN CREAR (Igual que antes) */}
          <div className="relative">
            <div className="relative inline-block group">
              <button id="footer-menu-btn" className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canCreate && setShowMenu((prev) => !prev)} aria-label="Crear shot" disabled={!canCreate}>+</button>
              {!canCreate && user && (<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200" style={{ whiteSpace: 'nowrap' }}>Solo para Miembros</span>)}
            </div>
            {showMenu && (
              <div id="footer-menu-dropdown" className="absolute bottom-10 right-0 flex flex-col items-end gap-2 z-50">
                {/* ... (botones de subir archivo, carpeta, url, cámara idénticos) ... */}
              </div>
            )}
          </div>
        </div>
      </footer>

      <ModalCreateShot open={modalSection !== null} section={modalSection} onClose={() => setModalSection(null)} />
    </>
  );
}