"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ShareStudioModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // NUEVO: Estado para ver con quién ya compartimos
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Cargar usuarios con acceso al abrir el modal
  useEffect(() => {
    if (open && user?.id) fetchSharedUsers();
    if (!open) { setQuery(""); setSearchResults([]); setSuccessMsg(""); }
  }, [open, user?.id]);

  const fetchSharedUsers = async () => {
    if (!user) return;
    setLoadingShared(true);
    const { data, error } = await supabase
      .from('studio_shares')
      .select('viewer_id, profiles!studio_shares_viewer_id_fkey(id, username, avatar_url)')
      .eq('owner_id', user.id);
    
    if (!error && data) {
      // Mapeamos para extraer el perfil anidado
      const users = data.map((item: any) => item.profiles).filter(Boolean);
      setSharedUsers(users);
    }
    setLoadingShared(false);
  };

  const handleSearch = async () => {
    if (!query.trim() || !user) return;
    setSearching(true);
    setSuccessMsg("");

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .neq('id', user.id) // No buscarte a ti mismo
      .ilike('username', `%${query}%`)
      .limit(5);

    if (!error && data) setSearchResults(data);
    setSearching(false);
  };

  const handleShare = async (viewerId: string, viewerUsername: string) => {
    if (!user) return;
    const { error } = await supabase.from('studio_shares').insert({ 
      owner_id: user.id, 
      viewer_id: viewerId 
    });
    
    if (error) {
      if (error.code === '23505') alert("Ya has compartido tu estudio con este usuario.");
      else alert("Error al compartir.");
    } else {
      setSuccessMsg(`Estudio compartido con @${viewerUsername}`);
      setQuery(""); setSearchResults([]);
      // Notificación
      await supabase.from('notifications').insert({
        user_id: viewerId, title: '🏗️ Acceso al Estudio', message: 'Te han compartido su Estudio de trabajo.', type: 'studio_share', read: false
      });
      fetchSharedUsers(); // Actualizamos la lista de arriba
    }
  };

  // NUEVO: Función para descompartir
  const handleRevoke = async (viewerId: string, viewerUsername: string) => {
    if (!user || !confirm(`¿Quitarle el acceso a tu Estudio a @${viewerUsername}?`)) return;
    setRevokingId(viewerId);
    
    const { error } = await supabase
      .from('studio_shares')
      .delete()
      .match({ owner_id: user.id, viewer_id: viewerId });

    if (!error) {
      setSharedUsers(prev => prev.filter(u => u.id !== viewerId));
    } else {
      alert("Error al revocar acceso.");
    }
    setRevokingId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-white">Acceso al Estudio</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* SECCIÓN 1: QUIÉN TIENE ACCESO */}
          <div>
            <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase">Con acceso actualmente</h4>
            {loadingShared ? <p className="text-xs text-gray-500">Cargando...</p> :
             sharedUsers.length === 0 ? <p className="text-xs text-gray-600 italic">No has compartido tu estudio.</p> : (
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {sharedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white">@{u.username}</span>
                    </div>
                    <button 
                      onClick={() => handleRevoke(u.id, u.username)}
                      disabled={revokingId === u.id}
                      className="text-xs text-red-400 hover:text-red-300 font-bold disabled:opacity-50"
                    >
                      {revokingId === u.id ? "Quitando..." : "Quitar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-800"></div>

          {/* SECCIÓN 2: COMPARTIR CON NUEVOS */}
          <div>
            <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase">Compartir con alguien nuevo</h4>
            <p className="text-[10px] text-gray-500 mb-2">Podrán ver TODOS tus shots (aprobados y pendientes).</p>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" placeholder="Buscar usuario..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <button onClick={handleSearch} disabled={searching} className="px-4 bg-yellow-500 text-black font-bold rounded text-sm disabled:opacity-50">
                Buscar
              </button>
            </div>

            {successMsg && <div className="text-green-400 text-xs mb-2 text-center">{successMsg}</div>}

            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white">@{u.username}</span>
                  </div>
                  <button onClick={() => handleShare(u.id, u.username)} className="text-xs text-yellow-400 hover:underline font-bold">
                    Compartir
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}