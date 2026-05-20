"use client";
import React, { useState } from "react";
import axios from "axios";
import { supabase } from '../lib/supabaseClient';
import { useAuth } from "../lib/AuthContext";
import TagInput from "./TagInput";
import { Tag, saveShotTags } from "../lib/tagUtils"; // 🆕 IMPORT

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
  
  // 🆕 ESTADO DE TAGS
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);

  const [siteUrl, setSiteUrl] = useState("");
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [showImagesOverlay, setShowImagesOverlay] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  if (!open || section == null || !user) return null;

  const handleClose = () => {
    onClose();
    setError(null); setSuccess(null);
    setFile(null); setTitle(""); setArchitect(""); setDescription(""); setPreviewUrl(null);
    setSelectedTags([]); // 🆕 Limpiar tags
    setMultiFiles([]); setMultiLoading(false);
    setSiteUrl(""); setSiteImages([]); setSelectedImages([]); setShowImagesOverlay(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) { setFile(null); setPreviewUrl(null); return; }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`El archivo supera el límite de 5MB.`);
      setFile(null); setPreviewUrl(null); return;
    }
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
      
      // 🆕 AÑADIDO .select('id').single() para obtener el ID del shot recién creado
      const { data: newShot, error: insertError } = await supabase.from('shots').insert(shotData).select('id').single();
      if (insertError) throw insertError;
      
      // 🆕 GUARDAR TAGS
      if (newShot) await saveShotTags(newShot.id.toString(), selectedTags);

      setSuccess("Shot subido correctamente.");
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
        const { data: newShot } = await supabase.from('shots').insert(shotData).select('id').single();
        
        // 🆕 GUARDAR TAGS (Se aplican a todos los del lote)
        if (newShot) await saveShotTags(newShot.id.toString(), selectedTags);
        
        successCount++;
      } catch { errorCount++; }
    }
    if (successCount) setSuccess(`${successCount} subidos.`);
    if (errorCount) setError(`Error en ${errorCount}.`);
    setMultiFiles([]); 
    if (successCount > 0) setTimeout(() => handleClose(), 1500);
    setMultiLoading(false);
  };

  const handleSiteUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSiteLoading(true); setSiteImages([]); setSelectedImages([]);
    try {
      const res = await axios.post("/api/extract-images", { url: siteUrl });
      setSiteImages(res.data.images || []);
      setShowImagesOverlay(true);
    } catch { setError("No se pudieron extraer imágenes."); } 
    finally { setSiteLoading(false); }
  };

  const handleSaveSelectedImages = async () => {
    if (selectedImages.length === 0) return;
    setSiteLoading(true); setError(null);
    setImportProgress({ current: 0, total: selectedImages.length });
    let successCount = 0, errorCount = 0;
    for (let i = 0; i < selectedImages.length; i++) {
      const imgUrl = selectedImages[i];
      setImportProgress({ current: i + 1, total: selectedImages.length });
      try {
        const res = await axios.post("/api/import-images", { urls: [imgUrl], userId: user.id }, { timeout: 15000 });
        const importedImages = res.data.results || [];
        if (importedImages.length > 0) {
          const img = importedImages[0];
          const shotData = { user_id: user.id, title: img.originalUrl.split("/").pop() || "Imagen web", description: '', image_url: img.publicUrl, source_url: img.originalUrl, author: architect.trim() || null };
          const { data: newShot } = await supabase.from('shots').insert(shotData).select('id').single();
          
          // 🆕 GUARDAR TAGS
          if (newShot) await saveShotTags(newShot.id.toString(), selectedTags);
          
          successCount++;
        } else { errorCount++; }
      } catch { errorCount++; }
      if (i < selectedImages.length - 1) { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    setSiteLoading(false); setShowImagesOverlay(false); setSiteImages([]); setSelectedImages([]); setSiteUrl("");
    setImportProgress({ current: 0, total: 0 });
    if (successCount > 0) { setSuccess(`Se preservaron ${successCount} imágenes.`); setTimeout(() => handleClose(), 1500); }
    if (errorCount > 0) { setError(`Error al guardar ${errorCount} registros.`); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] px-4">
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-200 flex flex-col items-center max-h-[90vh] overflow-y-auto">
        
        <div className="flex w-full justify-end mb-4">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow" onClick={handleClose}>&times;</button>
        </div>

        {section === 1 && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            <div className="text-lg font-bold text-white mb-2">Subir shot por archivo</div>
            <div className="w-full space-y-3">
              <input id="file-upload" type="file" accept="image/*" className="hidden" required onChange={e => handleFileChange(e.target.files?.[0] || null)} />
              <label htmlFor="file-upload" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 cursor-pointer flex items-center justify-center hover:bg-gray-700 transition min-h-[40px]">
                <span className={file ? 'font-semibold text-white truncate' : 'text-gray-400'}>{file ? file.name : 'Selecciona imagen (Max 5MB)'}</span>
              </label>
              {previewUrl && (
                <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-600">
                  <img src={previewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Título (Obligatorio)" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio" value={architect} onChange={e => setArchitect(e.target.value)} />
            <textarea className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            
            {/* 🆕 INPUT DE ETIQUETAS */}
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />

            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-50" disabled={loading}>
              {loading ? "Subiendo..." : "Subir archivo"}
            </button>
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
                {multiFiles.map((f, idx) => (
                  <div key={idx} className="text-xs text-gray-300 flex justify-between">
                    <span className="truncate mr-2">{f.name}</span>
                    <span className="text-gray-500 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio (Se aplica a todos)" value={architect} onChange={e => setArchitect(e.target.value)} />
            
            {/* 🆕 INPUT DE ETIQUETAS (Se aplica a todos) */}
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />

            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-500 transition disabled:opacity-50" disabled={multiLoading}>
              {multiLoading ? `Subiendo... (${multiFiles.length})` : `Subir ${multiFiles.length || ''} archivos`}
            </button>
            {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-400 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}

        {section === 3 && (
          <>
            <form className="w-full space-y-5" onSubmit={handleSiteUrlSubmit}>
              <div className="text-lg font-bold text-white mb-2">Importar desde la web</div>
              <p className="text-xs text-gray-400">Cortesía forzada con crédito.</p>
              <input type="url" placeholder="https://sitioweb.com/articulo" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} required disabled={siteLoading} />
              <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-500 transition disabled:opacity-50" disabled={siteLoading}>
                {siteLoading ? "Buscando..." : "Extraer imágenes"}
              </button>
              {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            </form>

            {showImagesOverlay && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] px-4">
                <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-2xl text-gray-200 flex flex-col items-center max-h-[80vh]">
                  <div className="flex w-full justify-between mb-4">
                    <div className="text-lg font-bold">Selecciona imágenes para preservar</div>
                    <button className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow" onClick={() => !siteLoading && setShowImagesOverlay(false)} disabled={siteLoading}>&times;</button>
                  </div>
                  
                  <input type="text" className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm mb-4" placeholder="Arquitecto / Estudio (Se aplica a todos)" value={architect} onChange={e => setArchitect(e.target.value)} />
                  
                  {/* 🆕 INPUT DE ETIQUETAS (Se aplica a todos) */}
                  <div className="w-full mb-4">
                    <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-4 overflow-y-auto">
                    {siteImages.map((img, idx) => (
                      <label key={img + '-' + idx} className={`relative cursor-pointer group ${siteLoading ? 'pointer-events-none opacity-50' : ''}`}>
                        <img src={img} alt={`img-${idx}`} className="w-full h-32 object-cover rounded-lg border border-gray-600 group-hover:border-purple-500" />
                        <input type="checkbox" className="absolute top-2 right-2 w-5 h-5 accent-purple-500" checked={selectedImages.includes(img)} onChange={e => setSelectedImages(prev => e.target.checked ? [...prev, img] : prev.filter(i => i !== img))} disabled={siteLoading} />
                      </label>
                    ))}
                  </div>
                  <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-500 transition disabled:opacity-50" disabled={selectedImages.length === 0 || siteLoading} onClick={handleSaveSelectedImages}>
                    {siteLoading ? `Preservando ${importProgress.current} de ${importProgress.total}...` : `Preservar ${selectedImages.length} en el Ateneo`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {section === 4 && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            <div className="text-lg font-bold text-white mb-2">Capturar con cámara</div>
            <div className="w-full space-y-3">
              <input id="camera-upload" type="file" accept="image/*" capture="environment" className="hidden" required onChange={e => handleFileChange(e.target.files?.[0] || null)} />
              <label htmlFor="camera-upload" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 cursor-pointer flex items-center justify-center hover:bg-gray-700 transition min-h-[40px]">
                <span className={file ? 'font-semibold text-white truncate' : 'text-gray-500'}>{file ? file.name : 'Tomar foto (Max 5MB)'}</span>
              </label>
              {previewUrl && (
                <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-600">
                  <img src={previewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Título (Obligatorio)" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Arquitecto / Estudio" value={architect} onChange={e => setArchitect(e.target.value)} />
            <textarea className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            
            {/* 🆕 INPUT DE ETIQUETAS */}
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />

            <button type="submit" className="w-full bg-pink-600 text-white py-2 rounded-lg font-bold hover:bg-pink-500 transition disabled:opacity-50" disabled={loading}>
              {loading ? "Subiendo..." : "Subir captura"}
            </button>
            {error && <div className="text-red-400 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-400 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}

      </div>
    </div>
  );
}