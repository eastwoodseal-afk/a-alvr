"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface ModalUsernameProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

export default function ModalUsername({ open, userId, onClose }: ModalUsernameProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!username.trim()) {
      setError("El nombre de usuario es obligatorio.");
      setLoading(false);
      return;
    }
    // Actualizar el perfil en Supabase
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", userId);
    setLoading(false);
    if (updateError) {
      setError("No se pudo guardar el nombre.");
    } else {
      onClose();
    }
  };

  const handleForceClose = async () => {
    // Cerrar sesión si el usuario intenta cerrar el modal sin guardar
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="relative bg-gray-400 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-800 flex flex-col items-center">
        <div className="flex w-full justify-end mb-4">
          <button
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow"
            onClick={handleForceClose}
            aria-label="Cerrar y salir"
          >
            &times;
          </button>
        </div>
        <form className="w-full space-y-5" onSubmit={handleSave}>
          <div className="text-lg font-bold text-gray-900 mb-2 text-center">Define tu nombre de usuario para continuar</div>
          <div className="text-sm text-center text-gray-700 mb-2 bg-yellow-100 rounded px-2 py-1">
            Si cierras este formulario, se cerrará tu sesión y deberás iniciar sesión nuevamente.
          </div>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 text-center"
            placeholder="Nombre de usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          {error && <div className="text-red-600 text-sm font-medium mb-2 text-center">{error}</div>}
          <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition" disabled={loading}>
            {loading ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </div>
    </div>
  );
}
