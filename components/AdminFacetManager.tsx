"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useFacets } from "../lib/FacetContext"; // 🆕 IMPORT

interface Facet {
  id: number;
  name: string;
  label: string;
  icon: string;
  sort_order: number;
}

export default function AdminFacetManager() {
  const [facets, setFacets] = useState<Facet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // 🆕 OBTENER FUNCIÓN DE REFRESCO GLOBAL
  const { refreshFacets } = useFacets();

  useEffect(() => {
    fetchFacets();
  }, []);

  const fetchFacets = async () => {
    setLoading(true);
    const { data } = await supabase.from('facets').select('*').order('sort_order');
    if (data) setFacets(data);
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setLabel("");
    setIcon("");
    setSortOrder(0);
    setEditingId(null);
  };

  const handleEdit = (facet: Facet) => {
    setEditingId(facet.id);
    setName(facet.name);
    setLabel(facet.label);
    setIcon(facet.icon || "");
    setSortOrder(facet.sort_order);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) return;
    
    setSaving(true);
    
    const finalName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');

    if (editingId) {
      // Actualizar
      const { error } = await supabase
        .from('facets')
        .update({ label, icon, sort_order: sortOrder, name: finalName })
        .eq('id', editingId);
      if (error) alert("Error al actualizar: " + error.message);
    } else {
      // Crear
      const { error } = await supabase
        .from('facets')
        .insert({ name: finalName, label, icon, sort_order: sortOrder });
      if (error) alert("Error al crear: " + error.message);
    }

    await fetchFacets(); // Refresca lista local
    refreshFacets(); // 🆕 AVISA A TODA LA APP
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('facets').delete().eq('id', id);
    if (error) {
      alert("Error: No se puede eliminar. Probablemente hay etiquetas usando esta faceta (restricción FK).");
    } else {
      setFacets(prev => prev.filter(f => f.id !== id));
      refreshFacets(); // 🆕 AVISA A TODA LA APP
    }
    setConfirmDeleteId(null);
  };

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando facetas...</div>;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-yellow-400 mb-6">Taxonomía del Ateneo (Facetas)</h3>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8 bg-gray-800 p-4 rounded-lg border border-gray-600">
        <input 
          type="text" 
          placeholder="Nombre clave (slug)" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" 
          disabled={saving || !!editingId} 
          required 
        />
        <input 
          type="text" 
          placeholder="Título visible" 
          value={label} 
          onChange={e => setLabel(e.target.value)} 
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" 
          required 
        />
        <input 
          type="text" 
          placeholder="Icono (emoji)" 
          value={icon} 
          onChange={e => setIcon(e.target.value)} 
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-yellow-500" 
        />
        <input 
          type="number" 
          placeholder="Orden" 
          value={sortOrder} 
          onChange={e => setSortOrder(parseInt(e.target.value))} 
          className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" 
        />
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-sm disabled:opacity-50 transition">
            {editingId ? "Actualizar" : "Crear"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded text-sm transition">X</button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {facets.length === 0 && <div className="text-gray-600 text-sm text-center italic">No hay facetas definidas.</div>}
        {facets.map(f => (
          <div key={f.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition">
            <div className="flex items-center gap-3">
              <span className="text-xl">{f.icon || '❓'}</span>
              <div>
                <div className="text-white font-bold">{f.label}</div>
                <div className="text-[10px] text-gray-500 font-mono">{f.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Orden: {f.sort_order}</span>
              <button onClick={() => handleEdit(f)} className="text-xs text-blue-400 hover:underline">Editar</button>
              
              {confirmDeleteId === f.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(f.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-0.5 rounded">Sí, borrar</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold px-2 py-0.5 rounded">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(f.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}