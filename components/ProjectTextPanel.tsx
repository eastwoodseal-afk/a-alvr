"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { FACET_SLUGS } from "../lib/facetConstants";

interface Props {
  obraTag: {
    id?: number;
    name: string;
    slug: string;
    project_file_url?: string;
  };
  onUpdated?: (newUrl: string) => void;
}

export default function ProjectTextPanel({ obraTag, onUpdated }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");

 

  // 🆕 Si no hay ID, no renderizar
  if (!obraTag.id) return null; 
    
  // Cargar el texto cuando se expande
  useEffect(() => {
    if (isExpanded && obraTag.project_file_url) {
      fetchText();
    }
  }, [isExpanded, obraTag.project_file_url]);

  const fetchText = async () => {
    if (!obraTag.project_file_url) return;
    setLoading(true);
    try {
      const response = await fetch(obraTag.project_file_url);
      if (response.ok) {
        const text = await response.text();
        setRawText(text);
      }
    } catch (err) {
      console.error("Error cargando texto:", err);
      setError("No se pudo cargar el texto.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rawText.trim()) return;
    setSaving(true);
    setError("");
    
    try {
      // 1. Crear el archivo Markdown
      const fileName = `projects/${obraTag.slug}.md`;
      const blob = new Blob([rawText], { type: 'text/markdown' });
      const file = new File([blob], `${obraTag.slug}.md`, { type: 'text/markdown' });

      // 2. Subir al Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Obtener URL pública
      const { data: publicData } = supabase
        .storage
        .from('documents')
        .getPublicUrl(fileName);

      const publicUrl = publicData.publicUrl;

      // 4. Actualizar el tag con la URL
      const { error: updateError } = await supabase
        .from('tags')
        .update({ project_file_url: publicUrl })
        .eq('id', obraTag.id);

      if (updateError) throw updateError;

      // 5. Notificar al padre
      if (onUpdated) onUpdated(publicUrl);
      
      setIsEditing(false);
      
    } catch (err: any) {
      console.error("Error guardando:", err);
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Renderizar Markdown básico (simple)
  const renderMarkdown = (text: string) => {
    return text
      // Títulos
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-yellow-400 mt-4 mb-2">$1</h1>')
      // Negritas
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
      // Cursivas
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-300">$1</em>')
      // Listas
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-gray-300">$1</li>')
      // Párrafos (líneas en blanco)
      .split('\n\n').join('</p><p class="mb-3 text-gray-300 text-xs leading-relaxed">');
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full py-2 px-3 bg-gray-800/50 hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Texto del proyecto
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-full bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden animate-fade-in">
      {/* HEADER */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70 transition"
        onClick={() => { setIsExpanded(false); setIsEditing(false); }}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-yellow-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          Texto del proyecto
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </div>

      {/* CONTENIDO */}
      <div className="p-3" onClick={e => e.stopPropagation()}>
        
        {loading ? (
          <div className="text-center py-4 text-gray-500 text-xs animate-pulse">Cargando...</div>
        ) : isEditing ? (
          /* MODO EDICIÓN */
          <div className="space-y-3">
            <div className="text-[10px] text-gray-500 bg-gray-900/50 p-2 rounded border border-gray-700">
              <p className="font-bold mb-1">💡 Tips de formato:</p>
              <p className="text-gray-400"># Título grande</p>
              <p className="text-gray-400">## Subtítulo</p>
              <p className="text-gray-400">**texto en negrita**</p>
              <p className="text-gray-400">- lista con punto</p>
            </div>
            
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Escribe o pega el texto del proyecto aquí..."
              className="w-full h-64 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none font-mono"
              disabled={saving}
            />
            
            {error && <p className="text-red-400 text-[10px]">{error}</p>}
            
            <div className="flex gap-2">
              <button
                onClick={() => { setIsEditing(false); setError(""); }}
                disabled={saving}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !rawText.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          /* MODO VISUALIZACIÓN */
          <div className="space-y-3">
            {rawText ? (
              <div 
                className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: `<p class="mb-3 text-gray-300 text-xs leading-relaxed">${renderMarkdown(rawText)}</p>` 
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="font-medium">Sin texto para esta obra</p>
                <p className="text-gray-600 mt-1">Haz clic en "Editar" para añadir el texto del proyecto</p>
              </div>
            )}
            
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-lg border border-blue-600/30 transition"
            >
              {rawText ? "Editar texto" : "Añadir texto"}
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}