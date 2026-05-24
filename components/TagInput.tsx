"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Tag {
  id?: number;
  name: string;
  slug: string;
  facet: string;
}

interface Props {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

// 🛠️ EXPANDIDO: Añadidas facetas de Obra, Autor y Colección para creación Admin
const FACET_LABELS: Record<string, string> = {
  typology: "🏛️ Tipología",
  materiality: "🧱 Materialidad",
  geography: "🌎 Geografía",
  concept: "💡 Concepto",
  author: "👤 Arquitecto/Estudio",
  collection: "📁 Colección/Tablero",
  obra: "🏗️ Obra / Proyecto",
  free: "🏷️ Libre",
};

export default function TagInput({ selectedTags, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🆕 Estado para la faceta al crear un nuevo tag
  const [createFacet, setCreateFacet] = useState<string>('free');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from('tags').select('*').order('facet', { ascending: true }).order('name', { ascending: true });
    if (data) setAllTags(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions(allTags.filter(t => !selectedTags.find(st => st.slug === t.slug)).slice(0, 15));
      return;
    }
    const lowerSearch = search.toLowerCase();
    const filtered = allTags
      .filter(t => 
        !selectedTags.find(st => st.slug === t.slug) && 
        (t.name.toLowerCase().includes(lowerSearch) || t.facet.toLowerCase().includes(lowerSearch))
      )
      .slice(0, 10);
    setSuggestions(filtered);
  }, [search, allTags, selectedTags]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTag = (tag: Tag) => {
    onChange([...selectedTags, tag]);
    setSearch("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (slug: string) => {
    onChange(selectedTags.filter(t => t.slug !== slug));
  };

  // 🛠️ ACTUALIZADO: Crear tag con la faceta seleccionada
  const handleCreateTag = () => {
    if (!search.trim()) return;
    const slug = search.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    if (selectedTags.find(t => t.slug === slug)) return; 
    
    const newTag: Tag = {
      name: search.trim(),
      slug: slug,
      facet: createFacet // Usa la faceta seleccionada
    };
    
    const existing = allTags.find(t => t.slug === slug);
    if (existing) {
      handleSelectTag(existing);
    } else {
      onChange([...selectedTags, newTag]);
      setSearch("");
      setShowDropdown(false);
      setCreateFacet('free'); // Reset
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && search.trim()) {
        handleSelectTag(suggestions[0]);
      } else if (search.trim()) {
        handleCreateTag();
      }
    }
  };

  const groupedSuggestions = suggestions.reduce((acc, tag) => {
    if (!acc[tag.facet]) acc[tag.facet] = [];
    acc[tag.facet].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="relative w-full">
      
      <div className="flex flex-wrap items-center gap-1.5 w-full min-h-[40px] bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 cursor-text" onClick={() => inputRef.current?.focus()}>
        
        {selectedTags.map(tag => (
          <span key={tag.slug} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${tag.facet === 'free' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gray-700 text-gray-200 border border-gray-600'}`}>
            {tag.name}
            <button type="button" onClick={() => handleRemoveTag(tag.slug)} className="text-gray-400 hover:text-white ml-0.5">&times;</button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "Buscar o crear etiqueta..." : ""}
          className="flex-1 min-w-[100px] bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-500"
        />
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
          
          {loading ? (
            <div className="p-3 text-xs text-gray-500 text-center animate-pulse">Cargando etiquetas...</div>
          ) : (
            <>
              {Object.entries(groupedSuggestions).map(([facet, tags]) => (
                <div key={facet}>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-800 z-10">
                    {FACET_LABELS[facet] || facet}
                  </div>
                  {tags.map(tag => (
                    <button
                      key={tag.id || tag.slug}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectTag(tag)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition flex items-center justify-between"
                    >
                      <span>{tag.name}</span>
                      <span className="text-[9px] text-gray-500 bg-gray-700 px-1.5 rounded">{FACET_LABELS[tag.facet]?.split(' ')[0] || tag.facet}</span>
                    </button>
                  ))}
                </div>
              ))}

              {/* 🛠️ CREACIÓN DE TAGS CON SELECTOR DE FACETA */}
              {search.trim() && !allTags.find(t => t.name.toLowerCase() === search.trim().toLowerCase()) && (
                <div className="border-t border-gray-600 p-2">
                  <div className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">Crear nueva etiqueta</div>
                  <div className="flex items-center gap-2 mb-2 bg-gray-700 rounded p-1">
                    <span className="text-xs text-white font-bold px-2 truncate flex-1">{search.trim()}</span>
                    <select 
                      value={createFacet} 
                      onChange={(e) => setCreateFacet(e.target.value)}
                      className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 flex-shrink-0"
                    >
                      {Object.entries(FACET_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCreateTag}
                    className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-green-900/20 transition flex items-center gap-2 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Añadir como <span className="font-bold">{FACET_LABELS[createFacet]}</span>
                  </button>
                </div>
              )}

              {suggestions.length === 0 && !search.trim() && (
                 <div className="p-3 text-xs text-gray-600 text-center italic">Escribe para buscar o crear.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}