"use client";
import React, { useState } from "react";
import axios from "axios";
import { supabase } from '../../lib/supabaseClient';
import { hasPermission, UserWithRole } from '../../lib/roleUtils';

interface ModalCreateShotProps {
  open: boolean;
  section: number | null;
  onClose: () => void;
  user: UserWithRole | null;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function ModalCreateShot({ open, section, onClose, user }: ModalCreateShotProps) {
  // Generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sección 1 y 4 (Archivo único y Cámara comparten estos estados)
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Sección 2: Múltiples archivos
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiError, setMultiError] = useState<string | null>(null);
  const [multiSuccess, setMultiSuccess] = useState<string | null>(null);

  // Sección 3: Por URL
  const [siteUrl, setSiteUrl] = useState("");
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [showImagesOverlay, setShowImagesOverlay] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  if (!open || section == null) return null;

  const canCreate = user ? hasPermission(user.role, 'canCreateShots') : false;

  const handleClose = () => {
    onClose();
    setError(null); setSuccess(null);
    setFile(null); setTitle(""); setDescription(""); setPreviewUrl(null);
    setMultiFiles([]); setMultiError(null); setMultiSuccess(null);
    setSiteUrl(""); setSiteImages([]); setSelectedImages([]); setSiteError(null); setShowImagesOverlay(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) { setFile(null); setPreviewUrl(null); return; }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null); setPreviewUrl(null); return;
    }
    setError(null); setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  // Usado por Sección 1 (Subir archivo) y Sección 4 (Cámara)
  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null);
    if (!file || !user || !canCreate) { setError("Falta archivo o permisos."); return; }
    if (!title.trim()) { setError("El título es obligatorio."); return; }
    setLoading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('shots').getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;
      const shotData = { user_id: user.id, title, description, image_url: publicUrl, author: user.username };
      const { error: insertError } = await supabase.from('shots').insert(shotData);
      if (insertError) throw insertError;
      setSuccess("Shot subido correctamente.");
      setTimeout(() => handleClose(), 1500);
    } catch (err: any) { setError(err.message || "Error al subir."); } finally { setLoading(false); }
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMultiError(null); setMultiSuccess(null);
    if (!multiFiles.length || !user || !canCreate) { setMultiError("Selecciona archivos."); return; }
    const oversized = multiFiles.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) { setMultiError(`"${oversized.name}" supera ${MAX_FILE_SIZE_MB}MB.`); return; }
    setMultiLoading(true);
    let successCount = 0, errorCount = 0;
    for (const fileItem of multiFiles) {
      try {
        const filePath = `${user.id}/${Date.now()}-${fileItem.name}`;
        const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, fileItem);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('shots').getPublicUrl(filePath);
        const publicUrl = data.publicUrl;
        const shotData = { user_id: user.id, title: fileItem.name, description: '', image_url: publicUrl, author: user.username };
        const { error: insertError } = await supabase.from('shots').insert(shotData);
        if (insertError) throw insertError;
        successCount++;
      } catch { errorCount++; }
    }
    if (successCount) setMultiSuccess(`${successCount} subidos.`);
    if (errorCount) setMultiError(`Error en ${errorCount}.`);
    setMultiFiles([]); setMultiLoading(false);
    if (successCount > 0) setTimeout(() => handleClose(), 1500);
  };

  const handleSiteUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSiteError(null); setSiteLoading(true); setSiteImages([]); setSelectedImages([]);
    try {
      const res = await axios.post("/api/extract-images", { url: siteUrl });
      setSiteImages(res.data.images || []);
      setShowImagesOverlay(true);
    } catch { setSiteError("No se pudieron extraer imágenes."); } 
    finally { setSiteLoading(false); }
  };

  const handleSaveSelectedImages = async () => {
    if (!user || selectedImages.length === 0) return;
    setSiteLoading(true); setSiteError(null);
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
          const shotData = { user_id: user.id, title: img.originalUrl.split("/").pop() || "Imagen web", description: '', image_url: img.publicUrl, source_url: img.originalUrl, author: user.username };
          const { error: insertError } = await supabase.from('shots').insert(shotData);
          if (insertError) throw insertError;
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
      <div className="relative bg-gray-400 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-800 flex flex-col items-center max-h-[90vh] overflow-y-auto">
        
        <div className="flex w-full justify-end mb-4">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow" onClick={handleClose}>&times;</button>
        </div>

        {/* SECCIÓN 1: ARCHIVO ÚNICO */}
        {section === 1 && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            <div className="text-lg font-bold text-gray-900 mb-2">Subir shot por archivo</div>
            <div className="w-full space-y-3">
              <input id="file-upload" type="file" accept="image/*" className="hidden" required onChange={e => handleFileChange(e.target.files?.[0] || null)} />
              <label htmlFor="file-upload" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 cursor-pointer flex items-center justify-center hover:bg-gray-200 transition min-h-[40px]">
                <span className={file ? 'font-semibold text-gray-800 truncate' : 'text-gray-500'}>{file ? file.name : 'Selecciona imagen (Max 5MB)'}</span>
              </label>
              {previewUrl && (
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300">
                  <img src={previewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
            <input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" placeholder="Título (Obligatorio)" value={title} onChange={e => setTitle(e.target.value)} required />
            <textarea className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition disabled:opacity-50" disabled={loading || !canCreate}>
              {loading ? "Subiendo al Ateneo..." : "Subir archivo"}
            </button>
            {error && <div className="text-red-600 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-600 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}

        {/* SECCIÓN 2: MÚLTIPLES ARCHIVOS */}
        {section === 2 && (
          <form className="w-full space-y-5" onSubmit={handleMultiSubmit}>
            <div className="text-lg font-bold text-gray-900 mb-2">Subir múltiples archivos</div>
            <input type="file" multiple accept="image/*" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" required onChange={e => setMultiFiles(Array.from(e.target.files || []))} />
            {multiFiles.length > 0 && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                <div className="text-xs font-bold text-gray-500 mb-2">{multiFiles.length} archivos:</div>
                {multiFiles.map((f, idx) => (
                  <div key={idx} className="text-xs text-gray-700 flex justify-between">
                    <span className="truncate mr-2">{f.name}</span>
                    <span className="text-gray-400 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}
            <button type="submit" className="w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50" disabled={multiLoading || !canCreate}>
              {multiLoading ? `Subiendo... (${multiFiles.length})` : `Subir ${multiFiles.length || ''} archivos`}
            </button>
            {multiError && <div className="text-red-600 text-sm font-semibold mt-2">{multiError}</div>}
            {multiSuccess && <div className="text-green-600 text-sm font-semibold mt-2">{multiSuccess}</div>}
          </form>
        )}

        {/* SECCIÓN 3: EXTRAER DE URL */}
        {section === 3 && (
          <>
            <form className="w-full space-y-5" onSubmit={handleSiteUrlSubmit}>
              <div className="text-lg font-bold text-gray-900 mb-2">Importar desde la web</div>
              <p className="text-xs text-gray-500">Las imágenes se preservarán en el Ateneo (Cortesía forzada con crédito).</p>
              <input type="url" placeholder="https://sitioweb.com/articulo" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} required disabled={siteLoading} />
              <button type="submit" className="w-full bg-purple-500 text-white py-2 rounded-lg font-bold hover:bg-purple-600 transition disabled:opacity-50" disabled={siteLoading || !canCreate}>
                {siteLoading ? "Buscando..." : "Extraer imágenes"}
              </button>
              {siteError && <div className="text-red-600 text-sm font-semibold mt-2">{siteError}</div>}
            </form>

            {showImagesOverlay && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl text-gray-800 flex flex-col items-center max-h-[80vh]">
                  <div className="flex w-full justify-between mb-4">
                    <div className="text-lg font-bold">Selecciona imágenes para preservar</div>
                    <button className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow" onClick={() => !siteLoading && setShowImagesOverlay(false)} disabled={siteLoading}>&times;</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-4 overflow-y-auto">
                    {siteImages.map((img, idx) => (
                      <label key={img + '-' + idx} className={`relative cursor-pointer group ${siteLoading ? 'pointer-events-none opacity-50' : ''}`}>
                        <img src={img} alt={`img-${idx}`} className="w-full h-32 object-cover rounded-lg border border-gray-300 group-hover:border-purple-500" />
                        <input type="checkbox" className="absolute top-2 right-2 w-5 h-5 accent-purple-500" checked={selectedImages.includes(img)} onChange={e => setSelectedImages(prev => e.target.checked ? [...prev, img] : prev.filter(i => i !== img))} disabled={siteLoading} />
                      </label>
                    ))}
                  </div>
                  <button className="w-full bg-purple-500 text-white py-2 rounded-lg font-bold hover:bg-purple-600 transition disabled:opacity-50" disabled={selectedImages.length === 0 || siteLoading} onClick={handleSaveSelectedImages}>
                    {siteLoading ? `Preservando ${importProgress.current} de ${importProgress.total}...` : `Preservar ${selectedImages.length} en el Ateneo`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* SECCIÓN 4: CÁMARA (LÓGICA COMPLETA) */}
        {section === 4 && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            <div className="text-lg font-bold text-gray-900 mb-2">Capturar con cámara</div>
            <div className="w-full space-y-3">
              <input 
                id="camera-upload" 
                type="file" 
                accept="image/*" 
                capture="environment" // Abre la cámara trasera en móviles
                className="hidden" 
                required 
                onChange={e => handleFileChange(e.target.files?.[0] || null)} 
              />
              <label htmlFor="camera-upload" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 cursor-pointer flex items-center justify-center hover:bg-gray-200 transition min-h-[40px]">
                <span className={file ? 'font-semibold text-gray-800 truncate' : 'text-gray-500'}>
                  {file ? file.name : 'Tomar foto (Max 5MB)'}
                </span>
              </label>
              {previewUrl && (
                <div className="w-full h-48 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center border border-gray-300">
                  <img src={previewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
            <input 
              type="text" 
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" 
              placeholder="Título (Obligatorio)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
            />
            <textarea 
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" 
              placeholder="Descripción (opcional)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={2} 
            />
            <button 
              type="submit" 
              className="w-full bg-pink-500 text-white py-2 rounded-lg font-bold hover:bg-pink-600 transition disabled:opacity-50" 
              disabled={loading || !canCreate}
            >
              {loading ? "Subiendo al Ateneo..." : "Subir captura"}
            </button>
            {error && <div className="text-red-600 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-600 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}
      </div>
    </div>
  );
}