"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import TagInput from "./TagInput";
import { saveShotTags, autoTagAuthor, Tag } from "../lib/tagUtils";

interface Shot {
  id: string; 
  image_url: string;
  title?: string; 
  description?: string; 
  username?: string;
  user_id?: string;
  author?: string; 
  likes_count?: number;
  views_count?: number;
  uoc_id?: string;
  uoc_username?: string;
  category_id?: number | null; 
  category_name?: string;
  category_slug?: string;
  source_url?: string;
  tags?: Tag[];
}

interface Props {
  shot: Shot;
  isOwnShot: boolean;
  onSave: (updatedShot: Shot) => void;
  onCancel: () => void;
  onRelinquish?: (shotId: string) => void;
}

export default function CuratePanel({ shot, isOwnShot, onSave, onCancel, onRelinquish }: Props) {
  const [editTitle, setEditTitle] = useState(shot.title || "");
  const [editDescription, setEditDescription] = useState(shot.description || "");
  const [editAuthor, setEditAuthor] = useState(shot.author || "");
  const [editCategoryId, setEditCategoryId] = useState<string>(shot.category_id?.toString() || "");
  const [editTags, setEditTags] = useState<Tag[]>(shot.tags || []);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [relinquishing, setRelinquishing] = useState(false);
  const [confirmRelinquish, setConfirmRelinquish] = useState(false);

  useEffect(() => {
    setEditTitle(shot.title || "");
    setEditDescription(shot.description || "");
    setEditAuthor(shot.author || "");
    setEditCategoryId(shot.category_id?.toString() || "");
    setEditTags(shot.tags || []);
    setConfirmRelinquish(false);
  }, [shot]);

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
      setEditCategoryId(data.id); 
      setIsAddingCategory(false);
      setNewCategoryName("");
    }
    setSavingCategory(false);
  };

  const handleSave = async () => {
    setEditLoading(true); setEditError("");
    const updateData = { title: editTitle, description: editDescription, author: editAuthor, category_id: editCategoryId ? parseInt(editCategoryId) : null };
    const { error } = await supabase.from('shots').update(updateData).eq('id', shot.id);
    if (error) { setEditError("Error al guardar."); } 
    else {
      await saveShotTags(shot.id, editTags);
      if (editAuthor.trim()) await autoTagAuthor(editAuthor.trim(), shot.id);

      const categoryObj = categories.find(c => c.id.toString() === editCategoryId);
      onSave({ ...shot, ...updateData, tags: editTags, category_name: categoryObj?.name || null });
    }
    setEditLoading(false);
  };

  const handleRelinquish = async () => {
    if (!onRelinquish) return;
    setRelinquishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Error de autenticación."); setRelinquishing(false); return; }

      const res = await fetch('/api/relinquish-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, accessToken: session.access_token })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onRelinquish(shot.id);
      } else {
        alert(data.error || "No se pudo eliminar el shot.");
      }
    } catch (err) {
      alert("Error de conexión al eliminar.");
    } finally {
      setRelinquishing(false);
      setConfirmRelinquish(false);
    }
  };

  return (
    <div className="space-y-2">
      <input type="text" placeholder="Título" className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={editTitle} onChange={e => setEditTitle(e.target.value)} disabled={editLoading || relinquishing} />
      <input type="text" placeholder="Arquitecto / Estudio" className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} disabled={editLoading || relinquishing} />
      <textarea placeholder="Descripción" className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={editLoading || relinquishing} />
      
      {!isAddingCategory ? (
        <div className="flex gap-2">
          <select className="flex-1 px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} disabled={editLoading || relinquishing}>
            <option value="">Sin Categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setIsAddingCategory(true)} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition" title="Crear nueva">+</button>
        </div>
      ) : (
        <div className="p-2 bg-gray-800 rounded border border-gray-600 space-y-2">
          <input type="text" placeholder="Nombre nueva categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full px-2 py-1 text-xs rounded bg-gray-700 border border-gray-500 text-white focus:outline-none" autoFocus />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }} className="text-[10px] text-gray-400 hover:text-white">Cancelar</button>
            <button onClick={handleAddCategory} disabled={savingCategory} className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">{savingCategory ? "..." : "Crear"}</button>
          </div>
        </div>
      )}

      <TagInput selectedTags={editTags} onChange={setEditTags} />

      {editError && <div className="text-red-400 text-[10px] text-center">{editError}</div>}

      {confirmRelinquish && (
        <div className="w-full text-[10px] text-red-400 bg-red-900/30 border border-red-800/50 rounded px-2 py-1.5 text-center animate-fade-in">
          ⚠️ Acción irreversible. El shot pasará al acervo público del Ateneo.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {isOwnShot && onRelinquish && (
          <button 
            type="button" 
            onClick={() => confirmRelinquish ? handleRelinquish() : setConfirmRelinquish(true)} 
            disabled={relinquishing} 
            className={`h-7 px-3 rounded-lg font-bold text-xs transition disabled:opacity-50 flex-shrink-0 ${confirmRelinquish ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/50'}`}
          >
            {/* 🆕 NOMBRE CAMBIADO: De "Renunciar" a "Eliminar" */}
            {relinquishing ? "..." : confirmRelinquish ? "¿Eliminar?" : "Eliminar"}
          </button>
        )}

        <button type="button" onClick={() => { onCancel(); setConfirmRelinquish(false); }} disabled={editLoading || relinquishing} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 rounded text-xs transition">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={editLoading || relinquishing} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 rounded text-xs transition disabled:opacity-50">
          {editLoading ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}