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

export default function ModalCreateShot({ open, section, onClose, user }: ModalCreateShotProps) {
    // Sección 2: múltiples archivos
    const [multiFiles, setMultiFiles] = useState<File[]>([]);
    const [multiLoading, setMultiLoading] = useState(false);
    const [multiError, setMultiError] = useState<string | null>(null);
    const [multiSuccess, setMultiSuccess] = useState<string | null>(null);
    // Handler para múltiples archivos
    const handleMultiSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setMultiError(null);
      setMultiSuccess(null);
      if (!multiFiles.length || !user) {
        setMultiError("Selecciona al menos un archivo y asegúrate de estar autenticado.");
        return;
      }
      setMultiLoading(true);
      let successCount = 0;
      let errorCount = 0;
      for (const file of multiFiles) {
        try {
          const filePath = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('shots').getPublicUrl(filePath);
          const publicUrl = data.publicUrl;
          const shotData = {
            user_id: user.id,
            title: file.name,
            description: '',
            image_url: publicUrl,
            author: user.username,
          };
          const { error: insertError } = await supabase.from('shots').insert(shotData);
          if (insertError) throw insertError;
          successCount++;
        } catch (err: any) {
          errorCount++;
        }
      }
      setMultiSuccess(successCount ? `Se subieron ${successCount} archivos correctamente.` : null);
      setMultiError(errorCount ? `Hubo error en ${errorCount} archivos.` : null);
      setMultiFiles([]);
      setMultiLoading(false);
    };
  // Usar la instancia global de Supabase Client

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // For file input
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Sección 3: por URL de sitio
  const [siteUrl, setSiteUrl] = useState("");
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [showImagesOverlay, setShowImagesOverlay] = useState(false);

  const handleSiteUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteError(null);
    setSiteLoading(true);
    setSiteImages([]);
    setSelectedImages([]);
    try {
      const res = await axios.post("/api/extract-images", { url: siteUrl });
      setSiteImages(res.data.images || []);
      setShowImagesOverlay(true);
    } catch (err) {
      setSiteError("No se pudieron extraer imágenes del sitio.");
    } finally {
      setSiteLoading(false);
    }
  };

  const handleSaveSelectedImages = async () => {
    if (!user || selectedImages.length === 0) return;
    setSiteLoading(true);
    let successCount = 0;
    let errorCount = 0;
    for (const imgUrl of selectedImages) {
      try {
        const shotData = {
          user_id: user.id,
          title: imgUrl.split("/").pop() || "Imagen",
          description: '',
          image_url: imgUrl,
          author: user.username,
        };
        const { error: insertError } = await supabase.from('shots').insert(shotData);
        if (insertError) throw insertError;
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setSiteLoading(false);
    setShowImagesOverlay(false);
    setSiteImages([]);
    setSelectedImages([]);
    setSiteUrl("");
    // Opcional: mostrar mensaje de éxito/error
    if (successCount) setSuccess(`Se guardaron ${successCount} imágenes.`);
    if (errorCount) setError(`Error en ${errorCount} imágenes.`);
  };


  if (!open || section == null) return null;
  // ...eliminada la verificación de roles para mostrar el modal...

  // Handler for file upload (section 1)
  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file || !user) {
      setError("Selecciona un archivo y asegúrate de estar autenticado.");
      setLoading(false);
      return;
    }
    if (!title.trim()) {
      setError("El título es obligatorio.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Subir archivo a Supabase Storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('shots').upload(filePath, file);
      if (uploadError) {
        setError("Error al subir el archivo a Storage: " + uploadError.message);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage.from('shots').getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;

      // Insertar en la base de datos
      const shotData = {
        user_id: user.id,
        title: title,
        description: description,
        image_url: publicUrl,
        author: user.username,
      };
      const { error: insertError } = await supabase.from('shots').insert(shotData);
      if (insertError) {
        setError("Error al insertar en la base de datos: " + insertError.message);
        throw insertError;
      }
      setSuccess("Archivo subido correctamente.");
      setFile(null);
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setError(err.message || "Error al subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="relative bg-gray-400 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-800 flex flex-col items-center">
        <div className="flex w-full justify-end mb-4">
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow"
            onClick={onClose}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        {section === 1 && (
          <form className="w-full space-y-5" onSubmit={handleFileSubmit}>
            {user && (
              <div className="text-xs text-gray-500 mb-2">Usuario: <span className="font-mono">{user.id}</span> | Rol: <span className="font-semibold">{user.role}</span></div>
            )}
            <div className="text-lg font-bold text-gray-900 mb-2">Subir shot por archivo</div>
            {/* Archivo primero */}
            <div className="w-full relative">
              <input
                id="file-upload"
                type="file"
                className="hidden"
                required
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="file-upload"
                className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 cursor-pointer flex items-center"
                style={{ minHeight: '40px' }}
              >
                <span className={`truncate ${file ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                  {file ? file.name : 'Selecciona un archivo'}
                </span>
              </label>
            </div>
            {/* Título segundo */}
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900"
              placeholder="Título"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            {/* Descripción tercero */}
            <textarea
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900"
              placeholder="Descripción (opcional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
            <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition" disabled={loading}>
              {loading ? "Subiendo..." : "Subir archivo"}
            </button>
            {error && <div className="text-red-600 text-sm font-semibold mt-2">{error}</div>}
            {success && <div className="text-green-600 text-sm font-semibold mt-2">{success}</div>}
          </form>
        )}
        {/* ...existing code... */}
        {section === 2 && (
          <form className="w-full space-y-5" onSubmit={handleMultiSubmit}>
            <div className="text-lg font-bold text-gray-900 mb-2">Subir shot por carpeta o múltiples archivos</div>
            <input
              type="file"
              multiple
              className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900"
              required
              onChange={e => setMultiFiles(Array.from(e.target.files || []))}
            />
            <button type="submit" className="w-full bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition" disabled={multiLoading}>
              {multiLoading ? "Subiendo..." : "Subir archivos"}
            </button>
            {multiError && <div className="text-red-600 text-sm font-semibold mt-2">{multiError}</div>}
            {multiSuccess && <div className="text-green-600 text-sm font-semibold mt-2">{multiSuccess}</div>}
          </form>
        )}
        {section === 3 && (
          <>
            <form className="w-full space-y-5" onSubmit={handleSiteUrlSubmit}>
              <div className="text-lg font-bold text-gray-900 mb-2">Extraer imágenes de un sitio web</div>
              <input
                type="url"
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900"
                value={siteUrl}
                onChange={e => setSiteUrl(e.target.value)}
                required
                disabled={siteLoading}
              />
              <button type="submit" className="w-full bg-purple-500 text-white py-2 rounded-lg font-bold hover:bg-purple-600 transition" disabled={siteLoading}>
                {siteLoading ? "Buscando..." : "Extraer imágenes"}
              </button>
              {siteError && <div className="text-red-600 text-sm font-semibold mt-2">{siteError}</div>}
            </form>
            {/* Overlay de selección múltiple de imágenes */}
            {showImagesOverlay && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl text-gray-800 flex flex-col items-center">
                  <div className="flex w-full justify-between mb-4">
                    <div className="text-lg font-bold">Selecciona imágenes para guardar</div>
                    <button className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow" onClick={() => setShowImagesOverlay(false)}>&times;</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-4 max-h-[400px] overflow-y-auto">
                    {siteImages.map((img, idx) => (
                      <label key={img + '-' + idx} className="relative cursor-pointer group">
                        <img src={img} alt={`img-${idx}`} className="w-full h-32 object-cover rounded-lg border border-gray-300 group-hover:border-purple-500" />
                        <input
                          type="checkbox"
                          className="absolute top-2 right-2 w-5 h-5 accent-purple-500"
                          checked={selectedImages.includes(img)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedImages(prev => [...prev, img]);
                            } else {
                              setSelectedImages(prev => prev.filter(i => i !== img));
                            }
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="w-full bg-purple-500 text-white py-2 rounded-lg font-bold hover:bg-purple-600 transition"
                    disabled={selectedImages.length === 0 || siteLoading}
                    onClick={handleSaveSelectedImages}
                  >
                    Guardar {selectedImages.length} imágenes seleccionadas
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {section === 4 && (
          <form className="w-full space-y-5">
            <div className="text-lg font-bold text-gray-900 mb-2">Cargar shot por cámara del móvil</div>
            <input type="file" accept="image/*" capture="environment" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900" required />
            <button type="submit" className="w-full bg-pink-500 text-white py-2 rounded-lg font-bold hover:bg-pink-600 transition">Cargar foto</button>
          </form>
        )}
      </div>
    </div>
  );
}
