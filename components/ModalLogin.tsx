"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ModalLogin({ open, onClose }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Limpiar estados al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError("");
      setSuccessMsg("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        // REGISTRO
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccessMsg("¡Registro exitoso! Revisa tu email para confirmar tu cuenta (si está habilitado) o ya puedes iniciar sesión.");
        setIsRegister(false); // Cambiamos a vista de login
      } else {
        // LOGIN
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onClose(); // Cerrar modal al éxito
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] px-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-900 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-200 border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <div className="flex w-full justify-end mb-4">
          <button 
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow transition"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Tabs Login / Registro */}
        <div className="mb-8 flex w-full justify-center gap-2">
          <button
            className={`flex-1 py-2 rounded-l-xl font-semibold text-base transition ${!isRegister ? 'bg-yellow-500 text-black shadow' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            onClick={() => { setIsRegister(false); setError(""); setSuccessMsg(""); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`flex-1 py-2 rounded-r-xl font-semibold text-base transition ${isRegister ? 'bg-yellow-500 text-black shadow' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            onClick={() => { setIsRegister(true); setError(""); setSuccessMsg(""); }}
          >
            Registrarse
          </button>
        </div>

        {/* Formulario Email/Password */}
        <form className="w-full space-y-5" onSubmit={handleEmailAuth}>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-400">Contraseña</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && <div className="text-red-400 text-sm font-medium text-center">{error}</div>}
          {successMsg && <div className="text-green-400 text-sm font-medium text-center">{successMsg}</div>}

          <button 
            type="submit" 
            className="w-full bg-yellow-500 text-black py-2 rounded-lg font-bold hover:bg-yellow-600 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Procesando..." : (isRegister ? "Crear cuenta" : "Iniciar sesión")}
          </button>
        </form>

        {/* Separador */}
        <div className="w-full flex items-center my-6">
          <div className="flex-grow h-px bg-gray-700" />
          <span className="mx-3 text-gray-500 text-sm">o</span>
          <div className="flex-grow h-px bg-gray-700" />
        </div>

        {/* Botón Google */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.22l6.9-6.9C35.64 2.36 30.13 0 24 0 14.61 0 6.27 5.48 1.98 13.44l8.06 6.27C12.18 13.13 17.61 9.5 24 9.5z"/>
            <path fill="#34A853" d="M46.1 24.5c0-1.54-.14-3.02-.41-4.45H24v8.43h12.45c-.54 2.9-2.18 5.36-4.64 7.02l7.18 5.59C43.73 37.36 46.1 31.44 46.1 24.5z"/>
            <path fill="#FBBC05" d="M9.98 28.73c-1.13-3.36-1.13-6.97 0-10.33l-8.06-6.27C-1.32 17.61-1.32 30.39 1.92 37.16l8.06-6.27z"/>
            <path fill="#EA4335" d="M24 46c6.13 0 11.64-2.02 15.63-5.49l-7.18-5.59c-2.01 1.35-4.59 2.14-7.45 2.14-6.39 0-11.82-3.63-14.06-8.91l-8.06 6.27C6.27 42.52 14.61 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {isRegister ? "Registrarse con Google" : "Iniciar sesión con Google"}
        </button>

      </div>
    </div>
  );
}