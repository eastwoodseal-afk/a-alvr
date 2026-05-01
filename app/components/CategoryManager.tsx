"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", parent_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const resetForm = () => {
    setForm({ name: "", slug: "", parent_id: "" });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);

    const dataToSave = {
      name: form.name,
      slug: form.slug,
      parent_id: form.parent_id ? Number(form.parent_id) : null
    };

    if (editingId) {
      await supabase.from('categories').update(dataToSave).eq('id', editingId);
    } else {
      await supabase.from('categories').insert(dataToSave);
    }

    await fetchCategories();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id ? String(cat.parent_id) : ""
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await supabase.from('categories').delete().eq('id', id);
    await fetchCategories();
  };

  if (loading) return <div className="text-gray-400 text-center py-4">Cargando...</div>;

  return (
    <div className="space-y-4">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-gray-700 p-4 rounded-lg space-y-3">
        <h4 className="font-bold text-white">{editingId ? "Editar Categoría" : "Nueva Categoría"}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Nombre"
            className="px-2 py-1 rounded bg-gray-600 border border-gray-500 text-white text-sm"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Slug"
            className="px-2 py-1 rounded bg-gray-600 border border-gray-500 text-white text-sm"
            value={form.slug}
            onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
            required
          />
          <select
            className="px-2 py-1 rounded bg-gray-600 border border-gray-500 text-white text-sm"
            value={form.parent_id}
            onChange={(e) => setForm(p => ({ ...p, parent_id: e.target.value }))}
          >
            <option value="">Sin Padre (Raíz)</option>
            {categories.filter(c => c.id !== editingId).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-1 bg-yellow-500 text-black text-sm font-bold rounded hover:bg-yellow-400 transition">
            {saving ? "..." : (editingId ? "Actualizar" : "Crear")}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-400">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="space-y-2">
        {categories.length === 0 && <div className="text-gray-500 text-sm">No hay categorías.</div>}
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700">
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