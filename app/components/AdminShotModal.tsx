"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  author?: string;
  username?: string;
}

interface Props {
  shot: Shot;
  onClose: () => void;
  onApprove: (id: string, categoryId?: number) => void;
  onReject: (id: string) => void;
}

export default function AdminShotModal({ shot, onClose, onApprove, onReject }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // NUEVO: Estados para crear categoría
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  // NUEVO: Crear categoría al vuelo
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newCategoryName, slug })
      .select()
      .single();

    if (!error && data) {
      await fetchCategories(); // Actualizar lista
      setSelectedCategory(data.id); // Seleccionar la nueva
      setIsAdding(false);
      setNewCategoryName("");
    }
    setSavingCategory(false);
  };

  const handleApprove = () => {
    onApprove(shot.id, selectedCategory ? Number(selectedCategory) : undefined);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black bg-opacity-80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col max-w-lg w-full max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-yellow-400">Revisar Shot</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <img src={shot.image_url} alt="" className="w-full h-auto rounded-lg mb-4" />
          {shot.author && <div className="text-yellow-400 font-bold">{shot.author}</div>}
          {shot.title && <div className="text-white font-semibold mb-1">{shot.title}</div>}
          {shot.description && <div className="text-gray-300 text-sm">{shot.description}</div>}
          {shot.username && <div className="text-xs text-gray-500 mt-2">Subido por: {shot.username}</div>}
        </div>

        {/* SELECTOR DE CATEGORÍA + CREACIÓN RÁPIDA */}
        <div className="px-4 py-3 border-t border-gray-700 space-y-2">
          <label className="text-xs text-gray-400 block">Asignar Categoría (Curaduría):</label>
          
          {!isAdding ? (
            <div className="flex gap-2">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Sin Categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsAdding(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded transition"
                title="Crear nueva categoría"
              >
                +
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-2 bg-gray-800 rounded border border-gray-600">
              <input
                type="text"
                placeholder="Nombre de la nueva categoría..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-2 py-1 text-sm rounded bg-gray-700 border border-gray-500 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => { setIsAdding(false); setNewCategoryName(""); }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddCategory}
                  disabled={savingCategory}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded"
                >
                  {savingCategory ? "Creando..." : "Crear y Seleccionar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={() => onReject(shot.id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
          >
            Rechazar
          </button>
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
          >
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}