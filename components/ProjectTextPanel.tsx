"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface Props {
  obraTag: {
    id?: number;
    name: string;
    slug: string;
    project_file_url?: string;
  };
  canEdit: boolean;
  onUpdated?: (newUrl: string) => void;
}

export default function ProjectTextPanel({ obraTag, canEdit, onUpdated }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");

  if (!obraTag.id) return null;

  useEffect(() => {
    if (obraTag.project_file_url) {
      fetchText();
    }
  }, [obraTag.project_file_url]);

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
      const fileName = `projects/${obraTag.slug}.md`;
      const blob = new Blob([rawText], { type: 'text/markdown' });
      const file = new File([blob], `${obraTag.slug}.md`, { type: 'text/markdown' });

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase
        .storage
        .from('documents')
        .getPublicUrl(fileName);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from('tags')
        .update({ project_file_url: publicUrl })
        .eq('id', obraTag.id);

      if (updateError) throw updateError;

      if (onUpdated) onUpdated(publicUrl);
      
      setIsEditing(false);
      
    } catch (err: any) {
      console.error("💥 Error guardando:", err);
      setError(`Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-yellow-400 mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-gray-300">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-gray-300">$1</li>')
      .split('\n\n').join('</p><p class="mb-3 text-gray-300 text-xs leading-relaxed">');
  };

  return (
    <div className="w-full animate-fade-in">
      
      {/* HEADER: Título Izquierda + Manija Centrada */}
      <div 
        className="flex items-center w-full cursor-pointer group py-2"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-3 group-hover:text-white transition whitespace-nowrap flex items-center gap-2">
          dEl  Proyecto
          {loading && <span className="text-gray-600 animate-pulse normal-case">(cargando...)</span>}
        </span>
        <div className="flex-1 flex justify-center">
          <div className="w-12 h-1 bg-gray-700 rounded-full group-hover:bg-gray-500 transition"></div>
        </div>
      </div>

      {/* CONTENIDO: EXPANDIDO O PREVIEW */}
      <div className="pt-2" onClick={e => e.stopPropagation()}>
        
        {isEditing ? (
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
        ) : isExpanded ? (
          /* MODO EXPANDIDO (LECTURA COMPLETA) */
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
                <p className="font-medium">Sin texto para esta obra</p>
                <p className="text-gray-600 mt-1">Solo el dueño o admins pueden añadir texto.</p>
              </div>
            )}
            
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-lg border border-blue-600/30 transition"
              >
                {rawText ? "Editar texto" : "Añadir texto"}
              </button>
            )}
          </div>
        ) : (
          /* MODO PREVIEW (COLAPSADO) */
          rawText && (
            <div 
              className="opacity-70 hover:opacity-100 transition cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              <p className="text-gray-400 text-[11px] line-clamp-2 whitespace-pre-wrap">
                {rawText.replace(/[#*`-]/g, '')}
              </p>
              <span className="text-[9px] text-gray-600 italic">Click para expandir...</span>
            </div>
          )
        )}
        
      </div>
    </div>
  );
}