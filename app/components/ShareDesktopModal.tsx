"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext"; // NUEVO: Necesitamos saber quién es el dueño

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ShareDesktopModal({ open, onClose }: Props) {
  const { user } = useAuth(); // NUEVO: Obtenemos el dueño
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSuccessMsg("");

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(5);

    if (!error && data) setResults(data);
    setSearching(false);
  };

  const handleShare = async (viewerId: string, viewerUsername: string) => {
    if (!user) return; // Seguro
    
    // CORRECCIÓN CRÍTICA: Añadimos owner_id
    const { error } = await supabase.from('studio_shares').insert({ 
      owner_id: user.id, // NUEVO: El dueño soy yo
      viewer_id: viewerId // La persona con quien comparto
    });
    
    if (error) {
        if (error.code === '23505') { // Error de duplicado
            alert("Ya has compartido tu estudio con este usuario.");
        } else {
            console.error(error);
            alert("Error al compartir el estudio.");
        }
    } else {
        setSuccessMsg(`Estudio compartido con @${viewerUsername}`);
        setResults([]);
        setQuery("");
        
        // Notificación
        await supabase.from('notifications').insert({
            user_id: viewerId,
            title: '🏗️ Acceso al Estudio',
            message: 'Te han compartido su Estudio de trabajo.',
            type: 'studio_share',
            read: false
        });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-white">Compartir mi Estudio</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-4">
            <p className="text-xs text-gray-400 mb-3">
                El usuario seleccionado podrá ver TODOS tus shots (aprobados y pendientes).
            </p>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    placeholder="Buscar usuario..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                />
                <button 
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-4 bg-yellow-500 text-black font-bold rounded text-sm disabled:opacity-50"
                >
                    Buscar
                </button>
            </div>

            {successMsg && <div className="text-green-400 text-xs mb-2 text-center">{successMsg}</div>}

            <div className="space-y-2">
                {results.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover"/> : u.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-white">@{u.username}</span>
                        </div>
                        <button 
                            onClick={() => handleShare(u.id, u.username)}
                            className="text-xs text-yellow-400 hover:underline font-bold"
                        >
                            Compartir
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}