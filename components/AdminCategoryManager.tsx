"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface Category { id: number; name: string; slug: string; }

export default function AdminCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

  const handleNameChange = (name: string) => setForm(prev => ({ ...prev, name, slug: generateSlug(name) }));

  const resetForm = () => { setForm({ name: "", slug: "" }); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    if (editingId) {
      await supabase.from('categories').update({ name: form.name, slug: form.slug }).eq('id', editingId);
    } else {
      await supabase.from('categories').insert({ name: form.name, slug: form.slug });
    }
    await fetchCategories();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (cat: Category) => { setEditingId(cat.id); setForm({ name: cat.name, slug: cat.slug }); };
  
  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar categoría?")) return;
    await supabase.from('categories').delete().eq('id', id);
    await fetchCategories();
  };

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando categorías...</div>;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-yellow-400 mb-6">{editingId ? "Editar Categoría" : "Nueva Categoría"}</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input type="text" placeholder="Nombre" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" value={form.name} onChange={e => handleNameChange(e.target.value)} required disabled={saving} />
        <input type="text" placeholder="Slug (auto)" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} required disabled={saving} />
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 bg-yellow-500 text-black font-bold rounded-lg text-sm disabled:opacity-50 transition hover:bg-yellow-400">
            {saving ? "..." : (editingId ? "Actualizar" : "Crear")}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="px-4 bg-gray-600 text-white font-bold rounded-lg text-sm">X</button>}
        </div>
      </form>

      <div className="space-y-2">
        {categories.length === 0 && <div className="text-gray-600 text-sm text-center italic">Sin categorías.</div>}
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition">
            <div>
              <span className="text-white font-medium">{cat.name}</span>
              <span className="text-gray-500 text-xs ml-2">({cat.slug})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(cat)} className="text-xs text-blue-400 hover:underline">Editar</button>
              <button onClick={() => handleDelete(cat.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}