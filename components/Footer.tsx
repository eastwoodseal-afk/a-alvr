"use client";
import React, { useState, useEffect } from "react";
import ModalCreateShot from "./ModalCreateShot";
import { useAuth } from "../lib/AuthContext";
import { hasPermission } from "../lib/roleUtils";
import { supabase } from "../lib/supabaseClient";
import { useFacets } from "../lib/FacetContext"; // 🆕 IMPORT

interface TagItem {
  id: number;
  name: string;
  slug: string;
  facet: string;
}

export default function Footer({ skinUrl }: { skinUrl: string | null }) {
  const [showMenu, setShowMenu] = useState(false);
  const [modalSection, setModalSection] = useState<number | null>(null);
  const { user, isAdminMode, toggleAdminMode } = useAuth();

  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedTagName, setSelectedTagName] = useState<string>("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const [isSingleColumn, setIsSingleColumn] = useState(false);

  // 🆕 LEER FACETAS DEL CONTEXTO
  const { facets } = useFacets();

  const fetchTags = async () => {
    setLoadingTags(true);
    const { data } = await supabase.from('tags').select('id, name, slug, facet').order('facet').order('name');
    if (data) setTags(data as TagItem[]);
    setLoadingTags(false);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_settings').select('value_boolean').eq('key', 'enable_category_filter').single();
      if (data) setCategoryFilterEnabled(data.value_boolean || false);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (categoryFilterEnabled) {
      setLoadingCategories(true);
      supabase.from('categories').select('id, name, slug').order('name').then(({ data }) => {
        if (data) setCategories(data);
        setLoadingCategories(false);
      });
    }
  }, [categoryFilterEnabled]);

  useEffect(() => { fetchTags(); }, []);

  useEffect(() => {
    const handleTagsUpdate = () => fetchTags();
    window.addEventListener('tags-updated', handleTagsUpdate);
    return () => window.removeEventListener('tags-updated', handleTagsUpdate);
  }, []);

  useEffect(() => {
    const handleCategorySync = (e: any) => setSelectedCategory(e.detail || "");
    window.addEventListener('category-filter-changed', handleCategorySync);
    
    const handleTagSync = (e: any) => {
      setSelectedTag(e.detail?.id || "");
      setSelectedTagName(e.detail?.name || "");
    };
    window.addEventListener('tag-filter-changed', handleTagSync);
    
    return () => {
      window.removeEventListener('category-filter-changed', handleCategorySync);
      window.removeEventListener('tag-filter-changed', handleTagSync);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const categoryDropdown = document.getElementById("category-dropdown");
      const categoryBtn = document.getElementById("category-btn");
      const tagDropdown = document.getElementById("tag-dropdown");
      const tagBtn = document.getElementById("tag-btn");
      const menu = document.getElementById("footer-menu-dropdown");
      const menuBtn = document.getElementById("footer-menu-btn");

      if (showCategoryDropdown && categoryDropdown && !categoryDropdown.contains(e.target as Node) && categoryBtn && !categoryBtn.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (showTagDropdown && tagDropdown && !tagDropdown.contains(e.target as Node) && tagBtn && !tagBtn.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (showMenu && menu && !menu.contains(e.target as Node) && menuBtn && !menuBtn.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCategoryDropdown, showTagDropdown, showMenu]);

  const canCreate = user ? hasPermission(user.role, 'canCreateShots') : false;
  const isRealAdmin = user?.actualRole === 'admin' || user?.actualRole === 'superadmin';

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? "" : categoryId;
    setSelectedCategory(newCategory);
    setShowCategoryDropdown(false);
    window.dispatchEvent(new CustomEvent('category-filter-changed', { detail: newCategory }));
  };

  const handleTagSelect = (tagId: string, tagName: string) => {
    const newId = selectedTag === tagId ? "" : tagId;
    const newName = selectedTag === tagId ? "" : tagName;
    setSelectedTag(newId);
    setSelectedTagName(newName);
    setShowTagDropdown(false);
    window.dispatchEvent(new CustomEvent('tag-filter-changed', { detail: { id: newId, name: newName } }));
  };

  const handleToggleView = () => {
    const newValue = !isSingleColumn;
    setIsSingleColumn(newValue);
    window.dispatchEvent(new CustomEvent('grid-view-changed', { detail: newValue }));
  };

  const groupedTags = tags.reduce<Record<string, TagItem[]>>((acc, tag) => {
    if (!acc[tag.facet]) acc[tag.facet] = [];
    acc[tag.facet].push(tag);
    return acc;
  }, {});

  return (
    <>
      <footer className={`fixed bottom-0 left-0 right-0 w-full h-16 py-4 px-6 text-gray-200 text-sm flex items-center justify-between z-40 border-t border-gray-700 transition-colors duration-500 ${skinUrl ? 'bg-gray-800/30 backdrop-blur-md' : 'bg-gray-800'}`}>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button id="category-btn" className={`rounded-full w-7 h-7 flex items-center justify-center shadow transition-all ${!categoryFilterEnabled ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed opacity-50' : selectedCategory ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} onClick={() => categoryFilterEnabled && setShowCategoryDropdown(!showCategoryDropdown)} disabled={!categoryFilterEnabled} title={categoryFilterEnabled ? "Filtrar por categoría" : "Filtro desactivado"}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
            </button>
            {showCategoryDropdown && categoryFilterEnabled && (
              <div id="category-dropdown" className="absolute bottom-10 left-0 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <div className="p-1.5 border-b border-gray-700">
                    <button onClick={() => handleCategorySelect("")} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === "" ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}>Todas las categorías</button>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {loadingCategories ? <div className="text-center py-3 text-gray-500 text-xs animate-pulse">Cargando...</div> : categories.map(cat => (
                      <button key={cat.id} onClick={() => handleCategorySelect(cat.id.toString())} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === cat.id.toString() ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}>{cat.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button id="tag-btn" className={`rounded-full w-7 h-7 flex items-center justify-center shadow transition-all ${selectedTag ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} onClick={() => setShowTagDropdown(!showTagDropdown)} title="Filtrar por etiqueta">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            </button>
            {showTagDropdown && (
              <div id="tag-dropdown" className="absolute bottom-10 left-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="p-1.5 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
                    <button onClick={() => handleTagSelect("", "")} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${selectedTag === "" ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}>Todas las etiquetas</button>
                  </div>
                  {loadingTags ? (
                    <div className="text-center py-3 text-gray-500 text-xs animate-pulse">Cargando...</div>
                  ) : (
                    Object.entries(groupedTags).map(([facet, facetTags]) => {
                      // 🛠️ CAMBIO: Usamos el contexto para encontrar la etiqueta visual
                      const facetConfig = facets.find(f => f.name === facet);
                      const displayLabel = facetConfig ? `${facetConfig.icon} ${facetConfig.label}` : facet;

                      return (
                        <div key={facet} className="p-1.5">
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{displayLabel}</div>
                          <div className="space-y-0.5">
                            {facetTags.map(tag => (
                              <button key={tag.id} onClick={() => handleTagSelect(tag.id.toString(), tag.name)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${selectedTag === tag.id.toString() ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}>{tag.name}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleToggleView} className={`rounded-full w-7 h-7 flex items-center justify-center shadow transition-all ${isSingleColumn ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} title={isSingleColumn ? "Vista Mosaico" : "Vista Feed"}>
            {isSingleColumn ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          
          {isRealAdmin && (
            <button onClick={toggleAdminMode} className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${isAdminMode ? 'bg-yellow-500' : 'bg-gray-600'}`} title={isAdminMode ? "Modo Admin: Activado" : "Modo Admin: Desactivado"}>
              <span className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${isAdminMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          )}

          <div className="relative group flex-shrink-0">
            <button id="footer-menu-btn" className={`bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canCreate && setShowMenu((prev) => !prev)} aria-label="Crear shot" disabled={!canCreate}>+</button>
            {!canCreate && user && (<span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">Solo para Miembros</span>)}
          </div>
          
          {showMenu && (
            <div id="footer-menu-dropdown" className="absolute bottom-10 right-6 flex flex-col items-end gap-2 z-50">
              <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow" aria-label="Subir archivo" onClick={() => { setModalSection(1); setShowMenu(false); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4m0 0l-4 4m4-4v12" /></svg></button>
              <button className="bg-green-500 hover:bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow" aria-label="Subir carpeta" onClick={() => { setModalSection(2); setShowMenu(false); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg></button>
              <button className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow" aria-label="Subir por URL" onClick={() => { setModalSection(3); setShowMenu(false); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-6m0 0l-2 2m2-2l2 2m-2-2V5m8 14a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2z" /></svg></button>
              <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow" aria-label="Subir por cámara" onClick={() => { setModalSection(4); setShowMenu(false); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" /></svg></button>
            </div>
          )}
        </div>
      </footer>

      <ModalCreateShot open={modalSection !== null} section={modalSection} onClose={() => setModalSection(null)} />
    </>
  );
}