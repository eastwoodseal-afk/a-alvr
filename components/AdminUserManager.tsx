"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface Props { currentUserId: string; }

export default function AdminUserManager({ currentUserId }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 🆕 CIRUGÍA: Estado de confirmación estilizada
  const [confirmDemoteId, setConfirmDemoteId] = useState<string | null>(null);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    const { data } = await supabase.from('profiles').select('id, username, role').in('role', ['admin', 'superadmin']);
    if (data) setAdmins(data);
    setLoadingAdmins(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('profiles').select('id, username, role').ilike('username', `%${query}%`).limit(5);
    if (data) setSearchResults(data);
    setSearching(false);
  };

   const handlePromote = async (userId: string, newRole: string) => {
    setProcessingId(userId);
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, title: '🎉 ¡Nuevo Rol!', message: `Has sido promovido a ${newRole}.`, type: 'role_promotion', read: false
    });
    setSearchResults(prev => prev.filter(u => u.id !== userId));
    await fetchAdmins();
    setProcessingId(null);
  };

  // 🆕 CIRUGÍA: Degradación directa, sin confirm() del sistema
  const handleDemote = async (userId: string) => {
    if (userId === currentUserId) return;
    setProcessingId(userId);
    await supabase.from('profiles').update({ role: 'member' }).eq('id', userId);
    setAdmins(prev => prev.filter(u => u.id !== userId));
    setConfirmDemoteId(null); // Resetear
    setProcessingId(null);
  };

  return (
    <div className="space-y-8">
      {/* PROMOVER */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-4">Promover Usuarios</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Buscar por username..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500" />
          <button onClick={handleSearch} disabled={searching} className="px-4 bg-yellow-500 text-black font-bold rounded-lg text-sm disabled:opacity-50">{searching ? "..." : "Buscar"}</button>
        </div>
        <div className="space-y-2">
          {searchResults.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div>
                <span className="text-white font-semibold">@{u.username}</span>
                <span className="text-xs text-gray-500 ml-2">({u.role})</span>
              </div>
              <div className="flex gap-2">
                {u.role === 'subscriber' && <button onClick={() => handlePromote(u.id, 'member')} disabled={processingId === u.id} className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded transition disabled:opacity-50">Hacer Miembro</button>}
                {u.role === 'member' && <button onClick={() => handlePromote(u.id, 'admin')} disabled={processingId === u.id} className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded transition disabled:opacity-50">Hacer Admin</button>}
                {(u.role === 'admin' || u.role === 'superadmin') && <span className="text-xs text-gray-500 italic">Ya es {u.role}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEGRADAR */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-400 mb-4">Admins Actuales</h3>
        {loadingAdmins ? <div className="text-gray-500 text-sm">Cargando...</div> : admins.length === 0 ? <div className="text-gray-600 text-sm">Sin admins.</div> : (
          <div className="space-y-2">
            {admins.map(admin => (
              <div key={admin.id} className={`flex items-center justify-between bg-gray-800 p-3 rounded-lg ${admin.id === currentUserId ? 'opacity-60' : ''}`}>
                <div>
                  <span className="text-white font-semibold">@{admin.username}</span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${admin.role === 'superadmin' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200'}`}>{admin.role}</span>
                </div>
                
                {admin.id !== currentUserId && admin.role !== 'superadmin' && (
                  // 🆕 CIRUGÍA: Botón de degradar con confirmación inline
                  confirmDemoteId === admin.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-red-400 font-bold">¿Seguro?</span>
                      <button onClick={() => handleDemote(admin.id)} disabled={processingId === admin.id} className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-0.5 rounded transition disabled:opacity-50">Sí</button>
                      <button onClick={() => setConfirmDemoteId(null)} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold px-2 py-0.5 rounded transition">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDemoteId(admin.id)} disabled={processingId === admin.id} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded transition disabled:opacity-50">Degradar</button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}