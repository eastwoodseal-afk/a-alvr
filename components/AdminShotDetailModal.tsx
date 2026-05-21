"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import TagInput from "./TagInput";
import { Tag, saveShotTags, autoTagAuthor } from "../lib/tagUtils"; // 🆕 IMPORT

interface Shot {
  id: string; image_url: string; title?: string; description?: string; author?: string; username?: string; tags?: Tag[];
}

interface Props {
  shot: Shot;
  onClose: () => void;
  onApprove: (id: string, updatedData: any) => void; 
  onReject: (id: string, reason: string) => void;
}

export default function AdminShotDetailModal({ shot, onClose, onApprove, onReject }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const [editTitle, setEditTitle] = useState(shot.title || "");
  const [editDescription, setEditDescription] = useState(shot.description || "");
  const [editAuthor, setEditAuthor] = useState(shot.author || "");
  const [editLoading, setEditLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [selectedTags, setSelectedTags] = useState<Tag[]>(shot.tags || []);

  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const { data, error } = await supabase.from('categories').insert({ name: newCategoryName, slug }).select().single();
    if (!error && data) {
      await fetchCategories(); 
      setSelectedCategory(data.id); 
      setIsAdding(false);
      setNewCategoryName("");
    }
    setSavingCategory(false);
  };

  const handleApprove = async () => {
    setEditLoading(true);
    const updatedData = {
      title: editTitle,
      description: editDescription,
      author: editAuthor,
      category_id: selectedCategory ? Number(selectedCategory) : null
    };

    await saveShotTags(shot.id, selectedTags);
    // 🆕 AUTO-TAG AUTOR (Si el admin añadió o corrigió el autor)
    if (editAuthor.trim()) await autoTagAuthor(editAuthor.trim(), shot.id);

    onApprove(shot.id, updatedData);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col max-w-2xl w-full max-h-[90vh] border border-gray-700" onClick={e => e.stopPropagation()}>
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-yellow-400">Revisar y Curar Shot</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:flex md:gap-6">
          <div className="md:w-1/2 mb-4 md:mb-0">
            <img src={shot.image_url} alt="" className="w-full h-auto rounded-lg border border-gray-700" />
            <div className="text-xs text-gray-500 mt-2 text-center">Subido por: @{shot.username || "Desconocido"}</div>
          </div>

          <div className="md:w-1/2 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Título</label>
              <input type="text" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={editLoading} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Arquitecto / Estudio</label>
              <input type="text" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} disabled={editLoading} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Descripción</label>
              <textarea className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={editLoading} />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Asignar Categoría (Ala del Museo):</label>
              {!isAdding ? (
                <div className="flex gap-2">
                  <select className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={editLoading}>
                    <option value="">Sin Categoría</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <button onClick={() => setIsAdding(true)} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition" title="Crear nueva">+</button>
                </div>
              ) : (
                <div className="space-y-2 p-2 bg-gray-800 rounded-lg border border-gray-600">
                  <input type="text" placeholder="Nombre de la nueva categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full px-2 py-1 text-sm rounded bg-gray-700 border border-gray-500 text-white focus:outline-none" autoFocus />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setIsAdding(false); setNewCategoryName(""); }} className="text-xs text-gray-400 hover:text-white">Cancelar</button>
                    <button onClick={handleAddCategory} disabled={savingCategory} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded">
                      {savingCategory ? "..." : "Crear y Seleccionar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Etiquetas (Tags):</label>
              <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
            </div>

          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <input type="text" placeholder="Razón de archivo (opcional, visible para el usuario)..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <button onClick={() => onReject(shot.id, rejectionReason)} disabled={editLoading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm whitespace-nowrap">Archivar</button>
          </div>
          <div className="flex justify-end">
            <button onClick={handleApprove} disabled={editLoading} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm">
              {editLoading ? "Procesando..." : "Aprobar y Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}