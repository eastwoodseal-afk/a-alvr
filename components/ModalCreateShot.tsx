"use client";
import React, { useState, useRef } from "react";
import axios from "axios";
import { supabase } from '../lib/supabaseClient';
import { useAuth } from "../lib/AuthContext";
import TagInput from "./TagInput";
import { saveShotTags, autoTagAuthor, Tag } from "../lib/tagUtils";

interface ModalCreateShotProps {
  open: boolean;
  section: number | null;
  onClose: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function ModalCreateShot({ open, section, onClose }: ModalCreateShotProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [architect, setArchitect] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);

  const [directImageUrl, setDirectImageUrl] = useState("");
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [ingestPreviewUrl, setIngestPreviewUrl] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  if (!open || section == null || !user) return null;

  const handleClose = () => {
    onClose();
    setError(null); setSuccess(null);
    setFile(null); setTitle(""); setArchitect(""); setDescription(""); setPreviewUrl(null);
    setSelectedTags([]);
    setMultiFiles([]); setMultiLoading(false);
    setDirectImageUrl(""); setPastedFile(null); setSourceUrl(""); setIngestPreviewUrl(null);
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) { setFile(null); setPreviewUrl(null); return; }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) { setError(`El archivo supera el límite de 5MB.`); setFile(null); setPreviewUrl(null); return; }
    setError(null); setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!file || !title.trim()) { setError("Falta archivo o título."); return; }
    setLoading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('shots').getPublicUrl(filePath);
      
      const shotData = { user_id: user.id, title, description, image_url: publicData.publicUrl, author: architect.trim() || null };
      const { data: newShot, error: insertError } = await supabase.from('shots').insert(shotData).select('id, title, description, image_url, author, user_id, is_approved, is_rejected, likes_count, views_count').single();
      if (insertError) throw insertError;
      
      if (newShot) {
        await saveShotTags(newShot.id.toString(), selectedTags);
        if (architect.trim()) await autoTagAuthor(architect.trim(), newShot.id.toString());
      }
      setSuccess("Shot subido correctamente.");
      
      // 🛠️ MODIFICACIÓN: Enviar el objeto completo en el evento
      if (newShot) {
        const shotForOverlay = {
          ...newShot,
          id: String(newShot.id), // Asegurar string
          username: user.username, // Añadir username local
        };
        window.dispatchEvent(new CustomEvent('navigate-to-my-shots', { detail: shotForOverlay }));
      }
      
      setTimeout(() => handleClose(), 1500);
    } catch (err: any) { setError(err.message || "Error al subir."); } finally { setLoading(false); }
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!multiFiles.length) { setError("Selecciona archivos."); return; }
    setMultiLoading(true);
    let successCount = 0, errorCount = 0;
    for (const fileItem of multiFiles) {
      try {
        if (fileItem.size > MAX_FILE_SIZE_BYTES) { errorCount++; continue; }
        const filePath = `${user.id}/${Date.now()}-${fileItem.name}`;
        const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, fileItem);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('shots').getPublicUrl(filePath);
        
        const shotData = { user_id: user.id, title: fileItem.name, description: '', image_url: data.publicUrl, author: architect.trim() || null };
        const { data: newShot } = await supabase.from('shots').insert(shotData).select('id, title, description, image_url, author, user_id, is_approved, is_rejected, likes_count, views_count').single();
        
        if (newShot) {
          await saveShotTags(newShot.id.toString(), selectedTags);
          if (architect.trim()) await autoTagAuthor(architect.trim(), newShot.id.toString());
          successCount++;
        }
      } catch { errorCount++; }
    }
    if (successCount) setSuccess(`${successCount} subidos.`);
    if (errorCount) setError(`Error en ${errorCount}.`);
    setMultiFiles([]); 
    if (successCount > 0) {
      // Nota: En multi-upload no disparamos evento individual para no spamear, 
      // pero el usuario ya tendrá los shots en su estudio.
      setTimeout(() => handleClose(), 1500);
    }
    setMultiLoading(false);
  };

  const handleDirectImageUrlChange = (url: string) => {
    setDirectImageUrl(url);
    setPastedFile(null); 
    if (url.trim()) {
      setIngestPreviewUrl(url);
      if (!sourceUrl.trim()) { setSourceUrl(url.trim()); }
    } else { setIngestPreviewUrl(null); }
  };

    const handlePasteOrDrop = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) { setError("La imagen supera 5MB."); return; }
    setPastedFile(file);
    setDirectImageUrl(""); 
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setIngestPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handlePasteOrDrop(file); 
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (dropZoneRef.current) dropZoneRef.current.classList.add('border-yellow-500', 'bg-gray-700/50'); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (dropZoneRef.current) dropZoneRef.current.classList.remove('border-yellow-500', 'bg-gray-700/50'); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (dropZoneRef.current) dropZoneRef.current.classList.remove('border-yellow-500', 'bg-gray-700/50'); handlePasteOrDrop(e.dataTransfer.files[0]); }; 
  
  const handleDirectIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!sourceUrl.trim()) { setError("La URL de origen es obligatoria para dar crédito."); return; }
    if (!pastedFile && !directImageUrl.trim()) { setError("Proporciona una imagen (URL o pégala)."); return; }
    setLoading(true);
    let finalImageUrl = '';
    try {
      if (pastedFile) {
        const filePath = `${user.id}/${Date.now()}-${pastedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, pastedFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('shots').getPublicUrl(filePath);
        finalImageUrl = data.publicUrl;
      } else {
        const res = await axios.post("/api/import-images", { urls: [directImageUrl.trim()], userId: user.id }, { timeout: 15000 });
        const importedImages = res.data.results || [];
        if (importedImages.length === 0) throw new Error("No se pudo descargar la imagen desde la URL.");
        finalImageUrl = importedImages[0].publicUrl;
      }
      if (finalImageUrl) {
        const shotData = { user_id: user.id, title: title.trim() || "Sin título", description, image_url: finalImageUrl, author: architect.trim() || null, source_url: sourceUrl.trim() };
        const { data: newShot, error: insertError } = await supabase.from('shots').insert(shotData).select('id, title, description, image_url, author, user_id, is_approved, is_rejected, likes_count, views_count').single();
        if (insertError) throw insertError;
        if (newShot) {
          await saveShotTags(newShot.id.toString(), selectedTags);
          if (architect.trim()) await autoTagAuthor(architect.trim(), newShot.id.toString());
        }
        setSuccess("Shot preservado con crédito.");
        
        // 🛠️ MODIFICACIÓN: Enviar el objeto completo
        if (newShot) {
          const shotForOverlay = {
            ...newShot,
            id: String(newShot.id),
            username: user.username,
          };
          window.dispatchEvent(new CustomEvent('navigate-to-my-shots', { detail: shotForOverlay }));
        }
        
        setTimeout(() => handleClose(), 1500);
      }
    } catch (err: any) { setError(err.response?.data?.error || err.message || "Error al importar la imagen."); } finally { setLoading(false); }
  };

  const hasSourceUrl = sourceUrl.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] px-4">
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-200 flex flex-col items-center max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex w-full justify-end mb-4">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow" onClick={handleClose}>&times;</button>
        </div>

        {(section === 1 || section === 4) && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            <div className="text-lg font-bold text-white mb-2">{section === 4 ? "Capturar con cámara" : "Subir shot por archivo"}</div>
            <div className="w-full space-y-3">
              <input id={section === 4 ? "camera-upload" : "file-upload"} type="file" accept="image/*" {...(section === 4 ? { capture: "environment" } : {})} className="hidden" required onChange={e => handleFileChange(e.target.files?.[0] || null)} />
              <label htmlFor={section === 4 ? "camera-upload" : "file-upload"} className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 cursor-pointer flex items-center justify-center hover:bg-gray-700 transition min-h-[40px]">
                <span className={file ? 'font-semibold text-white truncate' : 'text-gray-400'}>{file ? file.name : (section === 4 ? 'Tomar foto (Max 5MB)' : 'Selecciona imagen (Max 5MB)')}</span>
              </label>
              {previewUrl && (<div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-600"><img src={previewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" /></div>)}
            </div>
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Título (Obligatorio)" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio" value={architect} onChange={e => setArchitect(e.target.value)} />
            <textarea className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50" disabled={loading}>{loading ? "Subiendo..." : "Subir archivo"}</button>
            {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-400 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}

        {section === 2 && (
          <form className="w-full space-y-5" onSubmit={handleMultiSubmit}>
            <div className="text-lg font-bold text-white mb-2">Subir múltiples archivos</div>
            <input type="file" multiple accept="image/*" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-300" required onChange={e => setMultiFiles(Array.from(e.target.files || []))} />
            {multiFiles.length > 0 && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                <div className="text-xs font-bold text-gray-400 mb-2">{multiFiles.length} archivos:</div>
                {multiFiles.map((f, idx) => (<div key={idx} className="text-xs text-gray-300 flex justify-between"><span className="truncate mr-2">{f.name}</span><span className="text-gray-500 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span></div>))}
              </div>
            )}
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio (Se aplica a todos)" value={architect} onChange={e => setArchitect(e.target.value)} />
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-500 transition disabled:opacity-50" disabled={multiLoading}>{multiLoading ? `Subiendo... (${multiFiles.length})` : `Subir ${multiFiles.length || ''} archivos`}</button>
            {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-400 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}

        {section === 3 && (
          <form className="w-full space-y-5" onSubmit={handleDirectIngestSubmit}>
            <div className="text-lg font-bold text-white mb-2">Importar Imagen Directa</div>
            <p className="text-xs text-gray-400">Pega el enlace de la imagen, o simplemente cópiala y pégala aquí (Ctrl+V).</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">1. URL directa de la imagen</label>
              <input type="url" placeholder="https://cdn.sitio.com/imagen.jpg" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" value={directImageUrl} onChange={e => handleDirectImageUrlChange(e.target.value)} disabled={loading || !!pastedFile} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">2. O pega / arrastra la imagen aquí</label>
              <div ref={dropZoneRef} className={`w-full min-h-[100px] rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center cursor-pointer p-4 outline-none ${pastedFile ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-yellow-500 bg-gray-800/50 focus:border-yellow-500'}`} onPaste={handlePasteEvent} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} tabIndex={0}>
                {pastedFile ? (<div className="text-center"><span className="text-green-400 text-sm font-bold">✓ Imagen lista: {pastedFile.name || 'imagen.png'}</span><button type="button" onClick={() => { setPastedFile(null); setIngestPreviewUrl(directImageUrl || null); }} className="text-xs text-red-400 hover:underline ml-2">Quitar</button></div>) : (<><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500 mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v12" /></svg><p className="text-xs text-gray-400 text-center">Haz clic y pega (Ctrl+V)<br/>o arrastra un archivo</p></>)}
              </div>
            </div>
            {ingestPreviewUrl && (<div className="w-full h-40 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-600"><img src={ingestPreviewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" onError={() => setIngestPreviewUrl(null)} /></div>)}
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} disabled={loading} />
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio" value={architect} onChange={e => setArchitect(e.target.value)} disabled={loading} />
            <textarea className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} disabled={loading} />
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
            <div className="border-t border-gray-700 pt-4">
              <label className={`block text-xs font-bold mb-1 transition-colors ${hasSourceUrl ? 'text-green-400' : 'text-red-400'}`}>3. URL de Origen {hasSourceUrl ? '(✓ Crédito otorgado)' : '(Obligatorio)'}</label>
              <input type="url" placeholder="https://sitio-del-estudio.com/proyecto" className={`w-full px-4 py-2 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-1 transition-colors ${hasSourceUrl ? 'border-green-500 focus:ring-green-500' : 'border-red-900/50 focus:ring-red-500'}`} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} required disabled={loading} />
              {!hasSourceUrl && <p className="text-[9px] text-gray-600 mt-1">El shot no se guardará sin indicar de dónde proviene.</p>}
            </div>
            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-500 transition disabled:opacity-50" disabled={loading}>{loading ? "Preservando..." : "Preservar en el Ateneo"}</button>
            {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-400 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}
      </div>
    </div>
  );
}