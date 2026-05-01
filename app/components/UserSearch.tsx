"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { UserRole } from "../../lib/roleUtils";

interface Props {
  searchRole: UserRole;
  targetRole: UserRole;
  title: string;
  description: string;
  onPromote: (userId: string, newRole: UserRole) => Promise<{ success: boolean }>;
}

export default function UserSearch({ searchRole, targetRole, title, description, onPromote }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setErrorMsg(null);
    
    try {
      // CORREGIDO: Solo buscamos por username, NO por email
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('role', searchRole)
        .ilike('username', `%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error en búsqueda:", error);
        setErrorMsg(`Error: ${error.message}`);
        setResults([]);
      } else {
        console.log("Resultados encontrados:", data);
        setResults(data || []);
      }
    } catch (err: any) {
      console.error("Excepción:", err);
      setErrorMsg(`Excepción: ${err.message}`);
      setResults([]);
    }
    
    setSearching(false);
  };

  const handlePromote = async (userId: string) => {
    setPromotingId(userId);
    const result = await onPromote(userId, targetRole);
    if (result.success) {
      setResults(prev => prev.filter(u => u.id !== userId));
    }
    setPromotingId(null);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-bold text-yellow-400 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre de usuario..."
          className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm rounded-lg transition disabled:opacity-50"
        >
          {searching ? "..." : "Buscar"}
        </button>
      </div>

      {errorMsg && (
        <div className="text-red-400 text-sm mb-4 p-2 bg-red-900/30 rounded">
          {errorMsg}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
              <div>
                <div className="font-semibold text-white">{user.username || "Sin username"}</div>
                <div className="text-xs text-gray-400">Rol: {user.role}</div>
              </div>
              <button
                onClick={() => handlePromote(user.id)}
                disabled={promotingId === user.id}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition disabled:opacity-50"
              >
                {promotingId === user.id ? "Promoviendo..." : "Promover"}
              </button>
            </div>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !searching && !errorMsg && (
        <div className="text-center text-gray-500 text-sm py-4">
          No se encontraron usuarios con rol "{searchRole}" que coincidan con "{query}".
        </div>
      )}
    </div>
  );
}