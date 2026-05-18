"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import AdminShotDetailModal from "./AdminShotDetailModal";

interface Shot {
  id: string; 
  image_url: string; 
  title?: string; 
  author?: string; 
  username?: string; 
  user_id?: string; // 🆕 AÑADIDO
  created_at: string;
}

export default function AdminPendingShots() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shots')
      .select('id, image_url, title, author, created_at, profiles!shots_user_id_fkey(username)')
      .eq('is_approved', false)
      .neq('is_rejected', true) // Excluir los archivados
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      const formatted = data.map((s: any) => ({ ...s, username: s.profiles?.username || "Anónimo" }));
      setShots(formatted);
    }
    setLoading(false);
  };

    const handleApprove = async (id: string, updatedData: any) => {
    // 1. Aprobar el shot
    const { error } = await supabase.from('shots').update({ ...updatedData, is_approved: true, is_rejected: false }).eq('id', id);
    
    if (!error) {
      // 2. 🆕 Crear notificación al usuario
      const shot = shots.find(s => s.id === id);
      if (shot?.user_id) {
        await supabase.from('notifications').insert({
          user_id: shot.user_id,
          title: '¡Aprobado!',
          message: `Tu shot "${shot.title || 'Sin título'}" ya es visible en el Ateneo.`,
          type: 'shot_approved',
          read: false
        });
      }
      
      // 3. Actualizar la lista visual
      setShots(prev => prev.filter(s => s.id !== id));
      setSelectedShot(null);
    } else {
      alert("Error al aprobar: " + error.message);
    }
  };

  // NUEVO: Lógica de Archivo fluida (Sin ventanas de sistema)
  const handleReject = async (id: string, reason: string) => {
    // Si el admin no escribió nada, ponemos un motivo por defecto
    const finalReason = reason.trim() || "No cumple con los criterios del Ateneo.";
    
    // Actualizamos la base de datos con el archivo y la razón
    const { error } = await supabase.from('shots').update({ is_rejected: true, disapproval_reason: finalReason }).eq('id', id);
    
    if (!error) {
      setShots(prev => prev.filter(s => s.id !== id)); // Quita de la cola
      setSelectedShot(null); // Cierra el modal
    } else {
      alert("Error al archivar.");
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-400 animate-pulse">Cargando pendientes...</div>;
  if (shots.length === 0) return <div className="text-center py-8 text-gray-600">¡Estás al día! No hay shots pendientes.</div>;

  return (
    <>
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 w-full">
        {shots.map(shot => (
          <div 
            key={shot.id} 
            className="mb-4 break-inside-avoid bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-lg cursor-pointer hover:border-yellow-500 transition group"
            onClick={() => setSelectedShot(shot)}
          >
            <img src={shot.image_url} alt="" className="w-full h-auto object-cover" />
            <div className="p-3">
              <div className="text-yellow-400 font-bold text-sm truncate">{shot.author || "Sin autor"}</div>
              <div className="text-white font-semibold text-sm truncate">{shot.title || "Sin título"}</div>
              <div className="text-gray-500 text-[10px] mt-1">Por: @{shot.username}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedShot && (
        <AdminShotDetailModal 
          shot={selectedShot} 
          onClose={() => setSelectedShot(null)} 
          onApprove={handleApprove} 
          onReject={handleReject} 
        />
      )}
    </>
  );
}