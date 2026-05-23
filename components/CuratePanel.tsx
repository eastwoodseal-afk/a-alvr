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
  is_approved?: boolean | null;
}

interface Props {
  shot: Shot;
  isOwnShot: boolean;
  isAdmin: boolean;
  onSave: (updatedShot: Shot) => void;
  onCancel: () => void;
  onRelinquish?: (shotId: string) => void;
}

export default function CuratePanel({ shot, isOwnShot, isAdmin, onSave, onCancel, onRelinquish }: Props) {
  const [editTitle, setEditTitle] = useState(shot.title || "");
  const [editDescription, setEditDescription] = useState(shot.description || "");
  const [editAuthor, setEditAuthor] = useState(shot.author || "");
  const [editCategoryId, setEditCategoryId] = useState<string>(shot.category_id?.toString() || "");
  const [editTags, setEditTags] = useState<Tag[]>(shot.tags || []);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(""); // 🛠️ TIPO STRING IMPLÍCITO

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [relinquishing, setRelinquishing] = useState(false);
  const [confirmRelinquish, setConfirmRelinquish] = useState(false);

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const canReplaceImage = isAdmin || (isOwnShot && !shot.is_approved);

  useEffect(() => {
    setEditTitle(shot.title || "");
    setEditDescription(shot.description || "");
    setEditAuthor(shot.author || "");
    setEditCategoryId(shot.category_id?.toString() || "");
    setEditTags(shot.tags || []);
    setConfirmRelinquish(false);
    setNewImageFile(null); 
    setNewImagePreview(null);
    setIsDraggingOver(false);
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

  const handleNewImageSelect = (file: File | null) => {
    if (!file) { setNewImageFile(null); setNewImagePreview(null); return; }
    if (file.size > 5 * 1024 * 1024) { setEditError("La nueva imagen excede 5MB."); return; }
    setEditError(""); // 🛠️ CURA: String vacío en lugar de null
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
  const handleDrop = (e: React.DragEvent) => { 
    e.preventDefault(); e.stopPropagation(); 
    setIsDraggingOver(false); 
    if (e.dataTransfer.files && e.dataTransfer.files[0]) { 
      handleNewImageSelect(e.dataTransfer.files[0]); 
    } 
  };

  const handleSave = async () => {
    setEditLoading(true); setEditError("");
    
    let finalImageUrl = shot.image_url;

    if (newImageFile) {
      setIsReplacingImage(true);
      const filePath = `${shot.user_id}/${Date.now()}-${newImageFile.name}`;
      const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, newImageFile);
      
      if (uploadError) {
        setEditError("Error al subir la nueva imagen.");
        setEditLoading(false); setIsReplacingImage(false); return;
      }
      
      const { data: publicData } = supabase.storage.from('shots').getPublicUrl(filePath);
      finalImageUrl = publicData.publicUrl;
    }

    const updateData = { 
      title: editTitle, description: editDescription, author: editAuthor, 
      category_id: editCategoryId ? parseInt(editCategoryId) : null,
      image_url: finalImageUrl 
    };

    const { error } = await supabase.from('shots').update(updateData).eq('id', shot.id);
    
    if (error) { 
      setEditError("Error al guardar."); 
    } else {
      await saveShotTags(shot.id, editTags);
      if (editAuthor.trim()) await autoTagAuthor(editAuthor.trim(), shot.id);

      if (newImageFile && shot.image_url) {
        try {
          const url = new URL(shot.image_url);
          const pathParts = url.pathname.split('/');
          const oldPath = pathParts.slice(pathParts.indexOf('shots') + 1).join('/');
          if (oldPath) await supabase.storage.from('shots').remove([oldPath]);
        } catch (e) { console.error("Error limpiando imagen vieja:", e); }
      }

      const categoryObj = categories.find(c => c.id.toString() === editCategoryId);
      onSave({ ...shot, ...updateData, tags: editTags, category_name: categoryObj?.name || null });
    }
    
    setEditLoading(false); setIsReplacingImage(false);
  };

  const handleRelinquish = async () => {
    if (!onRelinquish) return;
    setRelinquishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Error de autenticación."); setRelinquishing(false); return; }
      const res = await fetch('/api/relinquish-shot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, accessToken: session.access_token })
      });
      const data = await res.json();
      if (res.ok && data.success) { onRelinquish(shot.id); } 
      else { alert(data.error || "No se pudo eliminar el shot."); }
    } catch (err) { alert("Error de conexión al eliminar."); } 
    finally { setRelinquishing(false); setConfirmRelinquish(false); }
  };

  return (
    <div className="space-y-2">
      
      {/* ZONA DE TRANSPLANTE (DRAG & DROP + CLICK) */}
      <div className="mb-2">
        <input id="replace-image-input" type="file" accept="image/*" className="hidden" onChange={e => handleNewImageSelect(e.target.files?.[0] || null)} disabled={editLoading || !canReplaceImage} />
        
        <div 
          className={`relative w-full h-28 bg-gray-800 rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
            isDraggingOver ? 'border-yellow-500 bg-yellow-900/20 scale-105' 
            : newImageFile ? 'border-green-500 bg-green-900/10' 
            : canReplaceImage ? 'border-gray-700 hover:border-gray-500 cursor-pointer' 
            : 'border-transparent opacity-90'
          }`}
          onDragOver={canReplaceImage ? handleDragOver : undefined}
          onDragLeave={canReplaceImage ? handleDragLeave : undefined}
          onDrop={canReplaceImage ? handleDrop : undefined}
          onClick={canReplaceImage && !editLoading ? () => document.getElementById('replace-image-input')?.click() : undefined}
        >
          <img src={newImagePreview || shot.image_url} alt="Preview" className={`w-full h-full object-cover transition-opacity ${isDraggingOver ? 'opacity-30' : 'opacity-100'}`} />

          {canReplaceImage && !isReplacingImage && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors ${
              isDraggingOver ? 'bg-black/0' : newImageFile ? 'bg-green-500/20' : 'bg-black/40 opacity-0 hover:opacity-100'
            }`}>
              {newImageFile ? (
                <div className="text-center">
                  <span className="text-green-400 text-xs font-bold">✓ Nueva imagen lista</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setNewImageFile(null); setNewImagePreview(null); }} className="block mx-auto text-red-400 text-[10px] hover:underline mt-1">Cancelar</button>
                </div>
              ) : (
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white mx-auto mb-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <span className="text-white text-[10px] font-bold">Arrastra o haz clic para reemplazar</span>
                </div>
              )}
            </div>
          )}

          {isReplacingImage && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        {!canReplaceImage && shot.is_approved && (
          <p className="text-[9px] text-gray-600 italic mt-1">Las imágenes de shots aprobados solo pueden ser reemplazadas por un Administrador.</p>
        )}
      </div>

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
          <button type="button" onClick={() => confirmRelinquish ? handleRelinquish() : setConfirmRelinquish(true)} disabled={relinquishing} className={`h-7 px-3 rounded-lg font-bold text-xs transition disabled:opacity-50 flex-shrink-0 ${confirmRelinquish ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-700/50'}`}>
            {relinquishing ? "..." : confirmRelinquish ? "¿Eliminar?" : "Eliminar"}
          </button>
        )}
        <button type="button" onClick={() => { onCancel(); setConfirmRelinquish(false); }} disabled={editLoading || relinquishing} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 rounded text-xs transition">Cancelar</button>
        <button onClick={handleSave} disabled={editLoading || relinquishing} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 rounded text-xs transition disabled:opacity-50">
          {isReplacingImage ? "Transplantando..." : editLoading ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}