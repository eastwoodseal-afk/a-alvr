"use client";
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

export default function ModalUsername() {
  const { user, updateUsername } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // LÓGICA AUTO-CONSCIENTE: Si hay usuario PERO no hay username, el modal SE ABRE SOLO.
  const isOpen = !!user && !user.username;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Sanitización: minúsculas, sin espacios, guiones bajos
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    if (cleanUsername.length < 3) {
      setError("Mínimo 3 caracteres.");
      setLoading(false);
      return;
    }

    // Guardar en Supabase
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: cleanUsername })
      .eq("id", user!.id);

    setLoading(false);

    if (updateError) {
      // Escudo contra nombres duplicados (Código 23505 de Postgres)
      if (updateError.code === '23505') {
        setError("Ese nombre ya está en uso. Elige otro.");
      } else {
        setError("Error al guardar. Intenta de nuevo.");
      }
    } else {
      // ¡ÉXITO! Actualizamos el cerebro local (AuthContext) instantáneamente.
      // Esto hace que la condición `!user.username` sea falsa, y el modal SE CIERRA SOLO.
      updateUsername(cleanUsername);
    }
  };

  // Escudo de seguridad: Si intenta cerrar sin guardar, lo mandamos a login.
  // No permitimos usuarios "fantasmas" sin identidad en el Ateneo.
  const handleForceClose = async () => {
    await supabase.auth.signOut();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] px-4">
      <div 
        className="relative bg-gray-900 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-200 border border-gray-700"
        onClick={e => e.stopPropagation()} // Prevenir cierre accidental
      >
        {/* Botón de cierre forzado (Rojo = Peligro) */}
        <div className="flex w-full justify-end mb-4">
          <button
            className="bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow transition"
            onClick={handleForceClose}
            aria-label="Cerrar y salir"
          >
            &times;
          </button>
        </div>

        <form className="w-full space-y-5" onSubmit={handleSave}>
          <div className="text-xl font-bold text-white mb-2 text-center">Define tu identidad</div>
          
          <div className="text-sm text-center text-gray-400 mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
            Para pertenecer al Ateneo, necesitas un nombre de registro. Si cierras esta ventana, se cerrará tu sesión.
          </div>

          <input
            type="text"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 text-lg"
            placeholder="Tu nombre de usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={loading}
            autoFocus
          />
          
          <p className="text-[10px] text-gray-500 text-center">Solo minúsculas, números y guiones bajos. Mínimo 3 caracteres.</p>

          {error && <div className="text-red-400 text-sm font-semibold text-center">{error}</div>}
          
          <button 
            type="submit" 
            className="w-full bg-yellow-500 text-black py-3 rounded-lg font-bold hover:bg-yellow-600 transition disabled:opacity-50 text-base"
            disabled={loading || username.trim().length < 3}
          >
            {loading ? "Registrando..." : "Tomar nombre"}
          </button>
        </form>
      </div>
    </div>
  );
}