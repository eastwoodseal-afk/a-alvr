"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const FACET_OPTIONS = [
  { value: 'typology', label: '🏛️ Tipología' },
  { value: 'materiality', label: '🧱 Materialidad' },
  { value: 'geography', label: '🌎 Geografía' },
  { value: 'concept', label: '💡 Concepto' },
  { value: 'author', label: '👤 Arquitecto/Estudio' },
  { value: 'collection', label: '📁 Colección/Tablero' },
  { value: 'free', label: '🏷️ Libre' },
  { value: 'obra', label: '🏗️ Obra / Proyecto' }, 
];

interface Tag { id: number; name: string; slug: string; facet: string; }

export default function AdminTagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", facet: "free" });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => { fetchTags(); }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from('tags').select('*').order('facet').order('name');
    if (data) setTags(data);
    setLoading(false);
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setForm({ name: tag.name, slug: tag.slug, facet: tag.facet });
  };

  const resetForm = () => { setForm({ name: "", slug: "", facet: "free" }); setEditingId(null); };

  // 🆕 SINCRONIZACIÓN: Autogenerar slug al cambiar el nombre
  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  const handleNameChange = (name: string) => setForm(prev => ({ ...prev, name, slug: generateSlug(name) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !editingId) return;
    setSaving(true);
    const { error } = await supabase.from('tags').update({ name: form.name, slug: form.slug, facet: form.facet }).eq('id', editingId);
    
    if (error) {
      // 🆕 ESCUDO: Capturar error de slug duplicado (Código 23505 de Postgres)
      if (error.code === '23505') {
        alert("Error: Ya existe una etiqueta con ese nombre o slug. Deben ser únicos.");
      } else {
        alert("Error al guardar: " + error.message);
      }
    } else {
      await fetchTags();
      resetForm();
      window.dispatchEvent(new CustomEvent('tags-updated'));
    }
    setSaving(false);
  };

  const handleDelete = async (tag: Tag) => {
    await supabase.from('blacklisted_tags').insert({ slug: tag.slug, name: tag.name, reason: 'Eliminado por Admin' });
    const { error } = await supabase.from('tags').delete().eq('id', tag.id);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      await fetchTags();
      window.dispatchEvent(new CustomEvent('tags-updated'));
    }
    setConfirmDeleteId(null);
  };

  const getFacetLabel = (f: string) => FACET_OPTIONS.find(o => o.value === f)?.label || f;

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando etiquetas...</div>;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-yellow-400 mb-6">Gestión de Etiquetas (Tags)</h3>
      
      {editingId ? (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8 bg-gray-800 p-4 rounded-lg border border-gray-600">
          {/* 🆕 SINCRONIZACIÓN: Usar handleNameChange para el nombre */}
          <input type="text" placeholder="Nombre" className="flex-1 bg-gray-700 border border-gray-500 rounded-lg px-3 py-2 text-sm text-white" value={form.name} onChange={e => handleNameChange(e.target.value)} required disabled={saving} />
          <input type="text" placeholder="Slug (auto)" className="flex-1 bg-gray-700 border border-gray-500 rounded-lg px-3 py-2 text-sm text-white" value={form.slug} onChange={e => setForm(p => ({...p, slug: e.target.value}))} required disabled={saving} />
          <select className="bg-gray-700 border border-gray-500 rounded-lg px-3 py-2 text-sm text-white" value={form.facet} onChange={e => setForm(p => ({...p, facet: e.target.value}))} disabled={saving}>
            {FACET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 bg-green-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 hover:bg-green-500 transition">Guardar</button>
            <button type="button" onClick={resetForm} className="px-4 bg-gray-600 text-white font-bold rounded-lg text-sm transition">X</button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-gray-400 mb-6 italic">Selecciona una etiqueta para editarla o cambiar su faceta. Las etiquetas eliminadas van a la Lista Negra y no se auto-generarán de nuevo.</p>
      )}

      <div className="space-y-2">
        {tags.length === 0 && <div className="text-gray-600 text-sm text-center italic">Sin etiquetas.</div>}
        {tags.map(tag => (
          <div key={tag.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-white font-medium truncate">{tag.name}</span>
              <span className="text-gray-500 text-xs flex-shrink-0">({tag.slug})</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300 flex-shrink-0">{getFacetLabel(tag.facet)}</span>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0 ml-2">
              <button onClick={() => handleEdit(tag)} className="text-xs text-blue-400 hover:underline">Editar</button>
              
              {confirmDeleteId === tag.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-red-400 font-bold">¿A Lista Negra?</span>
                  <button onClick={() => handleDelete(tag)} className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-0.5 rounded transition">Sí</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold px-2 py-0.5 rounded transition">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(tag.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}