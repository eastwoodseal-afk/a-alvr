"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSettings() {
  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_settings').select('value_boolean').eq('key', 'enable_category_filter').single();
    if (data) setCategoryFilterEnabled(data.value_boolean || false);
    setLoading(false);
  };

  const toggleCategoryFilter = async () => {
    const newValue = !categoryFilterEnabled;
    setSaving(true);
    setCategoryFilterEnabled(newValue); // Optimistic update
    
    const { error } = await supabase
      .from('app_settings')
      .update({ value_boolean: newValue, updated_at: new Date().toISOString() })
      .eq('key', 'enable_category_filter');
    
    if (error) {
      setCategoryFilterEnabled(!newValue); // Revertir si falla
      alert("Error al guardar.");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando configuración...</div>;

  return (
    <div className="space-y-8">
      {/* CONFIGURACIÓN DE CURADURÍA */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-2">Modo Curaduría Estricta</h3>
        <p className="text-sm text-gray-400 mb-6">
          Cuando está activado, los usuarios <strong className="text-white">deben</strong> seleccionar una categoría obligatoriamente para poder subir un shot. 
          Cuando está desactivado, la selección de categoría es opcional.
        </p>

        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div>
            <h4 className="font-semibold text-white text-sm">Exigir Categoría al Subir</h4>
            <p className="text-xs text-gray-400 mt-1">Estado actual: <span className={`font-bold ${categoryFilterEnabled ? 'text-green-400' : 'text-red-400'}`}>{categoryFilterEnabled ? 'ACTIVADO' : 'DESACTIVADO'}</span></p>
          </div>
          
          <button 
            onClick={toggleCategoryFilter} 
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors disabled:opacity-50 ${categoryFilterEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${categoryFilterEnabled ? 'translate-x-7' : 'translate-x-0'}`}></span>
          </button>
        </div>
      </div>
    </div>
  );
}