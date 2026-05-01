"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import UserProfileOverlay from "./UserProfileOverlay"; // Asegúrate de haberlo creado

interface Props {
  open: boolean;
  onClose: () => void;
  filterActive: boolean;
  onToggleFilter: () => void;
}

export default function FollowingSidebar({ open, onClose, filterActive, onToggleFilter }: Props) {
  const { user } = useAuth();
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) fetchFollowing();
  }, [open, user]);

  const fetchFollowing = async () => {
    if (!user) return;
    setLoading(true);
    
    // Traemos a quienes seguimos y sus perfiles
    const { data, error } = await supabase
      .from('follows')
      .select('created_at, profiles!follows_following_id_fkey(id, username, avatar_url)')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Limpiamos la estructura
      const users = data
        .map((f: any) => f.profiles)
        .filter((p: any) => p !== null); 
      setFollowing(users);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Fondo oscuro */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Mi Gente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Filtro Global */}
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Filtrar Muro</h3>
              <p className="text-xs text-gray-400">Ver solo sus shots</p>
            </div>
            <button 
              onClick={onToggleFilter}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${filterActive ? 'bg-yellow-500' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${filterActive ? 'translate-x-6' : 'translate-x-0'}`}></span>
            </button>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Cargando...</div>
          ) : following.length === 0 ? (
            <div className="text-center text-gray-600 py-8 px-4">
              Aún no sigues a nadie. ¡Explora el muro y encuentra talento!
            </div>
          ) : (
            <div className="space-y-1">
              {following.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold border border-gray-600">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(u.username || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">@{u.username || "usuario"}</div>
                    <div className="text-xs text-gray-500">Ver perfil</div>
                  </div>
                  {/* Flecha */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Perfil de Usuario (Si se selecciona) */}
      {selectedUserId && (
        <UserProfileOverlay 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </>
  );
}