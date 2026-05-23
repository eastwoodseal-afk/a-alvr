"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext"; // 🆕 IMPORT

export default function AdminSettings() {
  const { user } = useAuth(); // 🆕 NECESARIO PARA EL PATH
  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [skinFile, setSkinFile] = useState<File | null>(null);
  const [uploadingSkin, setUploadingSkin] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_settings').select('*').in('key', ['enable_category_filter', 'skin_url']);
    const catFilter = data?.find((d: any) => d.key === 'enable_category_filter');
    const skinSetting = data?.find((d: any) => d.key === 'skin_url');
    setCategoryFilterEnabled(catFilter?.value_boolean || false);
    setSkinUrl(skinSetting?.value_text || null);
    setLoading(false);
  };

  const toggleCategoryFilter = async () => {
    const newValue = !categoryFilterEnabled;
    setSaving(true); setCategoryFilterEnabled(newValue);
    await supabase.from('app_settings').update({ value_boolean: newValue, updated_at: new Date().toISOString() }).eq('key', 'enable_category_filter');
    setSaving(false);
  };

  const handleSkinUpload = async () => {
    if (!skinFile || !user?.id) return;
    setUploadingSkin(true);
    
    // 🆕 CURA: Subir a la carpeta del admin para pasar la RLS del Storage
    const filePath = `${user.id}/skins/${Date.now()}-${skinFile.name}`;
    
    const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, skinFile);
    if (uploadError) { 
      console.error("Error subiendo skin:", uploadError);
      alert("Error subiendo imagen: " + uploadError.message); 
      setUploadingSkin(false); 
      return; 
    }
    
    const { data: publicData } = supabase.storage.from('shots').getPublicUrl(filePath);
    const newUrl = publicData.publicUrl;

    const { error: updateError } = await supabase.from('app_settings').upsert({ key: 'skin_url', value_text: newUrl }, { onConflict: 'key' });
    if (updateError) { 
      alert("Error guardando Skin en BD."); 
    } else { 
      setSkinUrl(newUrl); 
      setSkinFile(null); 
    }
    setUploadingSkin(false);
  };

  const handleRemoveSkin = async () => {
    setUploadingSkin(true);
    const { error } = await supabase.from('app_settings').update({ value_text: null }).eq('key', 'skin_url');
    if (!error) setSkinUrl(null);
    setUploadingSkin(false);
  };

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando configuración...</div>;

  return (
    <div className="space-y-8">
      {/* CONFIGURACIÓN DE CURADURÍA */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-2">Modo Curaduría Estricta</h3>
        <p className="text-sm text-gray-400 mb-6">Cuando está activado, los usuarios <strong className="text-white">deben</strong> seleccionar una categoría obligatoriamente.</p>
        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-600">
          <div>
            <h4 className="font-semibold text-white text-sm">Exigir Categoría al Subir</h4>
            <p className="text-xs text-gray-400 mt-1">Estado: <span className={`font-bold ${categoryFilterEnabled ? 'text-green-400' : 'text-red-400'}`}>{categoryFilterEnabled ? 'ACTIVADO' : 'DESACTIVADO'}</span></p>
          </div>
          <button onClick={toggleCategoryFilter} disabled={saving} className={`relative w-14 h-7 rounded-full transition-colors disabled:opacity-50 ${categoryFilterEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${categoryFilterEnabled ? 'translate-x-7' : 'translate-x-0'}`}></span>
          </button>
        </div>
      </div>

      {/* APARIENCIA DEL ATENEO */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-2">🎨 Apariencia del Ateneo</h3>
        <p className="text-sm text-gray-400 mb-6">Viste el Ateneo para una ocasión especial. La imagen se mostrará fija en el fondo, y la interfaz se volverá translúcida.</p>
        
        {skinUrl ? (
          <div className="space-y-4">
            <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-600">
              <img src={skinUrl} alt="Skin actual" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-bold">Skin Activo</span>
              </div>
            </div>
            <button onClick={handleRemoveSkin} disabled={uploadingSkin} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded text-sm transition disabled:opacity-50">
              {uploadingSkin ? "Quitando..." : "Quitar Skin (Volver a la normalidad)"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full h-40 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-600 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              <span className="text-gray-600 text-sm italic">Sin Skin</span>
            </div>
            <div className="flex gap-3">
              <input id="skin-upload" type="file" accept="image/*" className="hidden" onChange={e => setSkinFile(e.target.files?.[0] || null)} />
              <button type="button" onClick={() => document.getElementById('skin-upload')?.click()} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-bold transition">
                {skinFile ? `✓ ${skinFile.name}` : "Seleccionar Imagen"}
              </button>
              {skinFile && (
                <button onClick={handleSkinUpload} disabled={uploadingSkin} className="px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded text-sm transition disabled:opacity-50">
                  {uploadingSkin ? "..." : "Aplicar"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}