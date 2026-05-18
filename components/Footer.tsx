"use client";
import React, { useState, useEffect } from "react";
import ModalCreateShot from "./ModalCreateShot";
import { useAuth } from "../lib/AuthContext";
import { hasPermission } from "../lib/roleUtils";
import { supabase } from "../lib/supabaseClient";

export default function Footer() {
  const [showMenu, setShowMenu] = useState(false);
  const [modalSection, setModalSection] = useState<number | null>(null);
  const { user } = useAuth();

  // --- ESTADOS DE CATEGORÍA ---
  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Leer si el filtro está activado
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_settings').select('value_boolean').eq('key', 'enable_category_filter').single();
      if (data) setCategoryFilterEnabled(data.value_boolean || false);
    };
    fetchSettings();
  }, []);

  // Cargar categorías si el filtro está ON
  useEffect(() => {
    if (categoryFilterEnabled) {
      setLoadingCategories(true);
      supabase.from('categories').select('id, name, slug').order('name').then(({ data }) => {
        if (data) setCategories(data);
        setLoadingCategories(false);
      });
    }
  }, [categoryFilterEnabled]);

  // Cerrar dropdown de categoría al hacer clic fuera
  useEffect(() => {
    if (!showCategoryDropdown) return;
    function handleClick(e: MouseEvent) {
      const dropdown = document.getElementById("category-dropdown");
      const btn = document.getElementById("category-btn");
      if (dropdown && !dropdown.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCategoryDropdown]);

  // Cerrar menú de creación al hacer clic fuera
  useEffect(() => {
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

  const canCreate = user ? hasPermission(user.role, 'canCreateShots') : false;

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? "" : categoryId;
    setSelectedCategory(newCategory);
    setShowCategoryDropdown(false);
    // Avisar al HomeView
    window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: newCategory }));
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 w-full h-16 py-4 px-6 bg-gray-800 text-gray-200 text-sm flex items-center justify-between z-40 border-t border-gray-700">
        
        {/* --- LADO IZQUIERDO: FILTRO DE CATEGORÍAS --- */}
        <div className="relative">
          <button 
            id="category-btn"
            className={`rounded-full h-7 px-3 flex items-center gap-1.5 text-xs font-bold transition-all border ${
              !categoryFilterEnabled 
                ? 'bg-gray-700/50 text-gray-500 border-gray-700 cursor-not-allowed opacity-50' 
                : selectedCategory 
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/20' 
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
            }`}
            onClick={() => categoryFilterEnabled && setShowCategoryDropdown(!showCategoryDropdown)}
            disabled={!categoryFilterEnabled}
            title={categoryFilterEnabled ? "Filtrar por categoría" : "Filtro desactivado"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            {selectedCategory 
              ? (categories.find(c => c.id.toString() === selectedCategory)?.name || "Filtrar") 
              : "Categorías"
            }
          </button>

          {/* DROPDOWN HACIA ARRIBA */}
          {showCategoryDropdown && categoryFilterEnabled && (
            <div 
              id="category-dropdown"
              className="absolute bottom-12 left-0 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {/* Opción: Todas */}
                <div className="p-1.5 border-b border-gray-700">
                  <button 
                    onClick={() => handleCategorySelect("")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedCategory === "" ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Todas las categorías
                  </button>
                </div>
                
                {/* Lista de categorías */}
                <div className="p-1.5 space-y-0.5">
                  {loadingCategories ? (
                    <div className="text-center py-3 text-gray-500 text-xs animate-pulse">Cargando...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-3 text-gray-600 text-xs italic">Sin categorías aún</div>
                  ) : (
                    categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id.toString())}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                          selectedCategory === cat.id.toString() ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- LADO DERECHO: BOTÓN + (Existente) --- */}
        <div className="relative">
          <div className="relative inline-block group">
            <button
              id="footer-menu-btn"
              className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center shadow ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => canCreate && setShowMenu((prev) => !prev)}
              aria-label="Crear shot"
              disabled={!canCreate}
            >
              +
            </button>
            {!canCreate && user && (
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
      </footer>

      <ModalCreateShot open={modalSection !== null} section={modalSection} onClose={() => setModalSection(null)} />
    </>
  );
}