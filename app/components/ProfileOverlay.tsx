"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabaseClient";

interface Props {
  onClose: () => void;
}

export default function ProfileOverlay({ onClose }: Props) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
  }, [user]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const handleClose = () => onClose();
    window.addEventListener('close-modals', handleClose);
    return () => window.removeEventListener('close-modals', handleClose);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    if (!user) { setSaving(false); setError("No hay usuario."); return; }
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
    setSaving(false);
    if (error) setError("No se pudo guardar.");
    else setSuccess("Guardado correctamente.");
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError("");
    setPasswordLoading(true);
    if (!user?.id) { setPasswordError("Usuario no válido."); setPasswordLoading(false); return; }
    if (!newPassword || newPassword.length < 6) { setPasswordError("La contraseña debe tener al menos 6 caracteres."); setPasswordLoading(false); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPasswordError(error.message || "No se pudo cambiar la contraseña."); setPasswordLoading(false); }
      else {
        setPasswordSuccess("Contraseña cambiada. Inicia sesión de nuevo.");
        setNewPassword(""); setShowPasswordForm(false); setPasswordLoading(false);
        await supabase.auth.signOut(); onClose(); window.location.href = "/";
      }
    } catch (err: any) { setPasswordError(err?.message || "Error inesperado."); setPasswordLoading(false); }
  }

  async function handleDeleteAccount() {
    setError("");
    if (deleteConfirm !== "ELIMINAR") { setError("Debes escribir 'ELIMINAR'."); return; }
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ active: false }).eq('id', user.id);
    if (!error) { await supabase.auth.signOut(); onClose(); window.location.href = "/"; }
  }

  return (
    // NIVEL 60: Por encima de todo (Shots guardados es 40, su sidebar es 50)
    <div className="fixed inset-0 z-[60] flex justify-center items-start pt-16 bg-black bg-opacity-50" onClick={onClose}>
      <div className="max-w-lg w-full mx-auto mt-0 p-6 bg-gray-900 rounded-2xl shadow-xl text-gray-100 relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold" onClick={onClose}>×</button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Configuración de Perfil</h2>
        
        <div className="mb-4">
          <label className="block text-sm mb-1">Usuario</label>
          <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100" value={username} onChange={e => setUsername(e.target.value)} disabled={saving} />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100" value={email} disabled />
        </div>
        <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded mb-4" onClick={handleSave} disabled={saving}>Guardar cambios</button>
        
        {success && <div className="text-green-400 mb-2">{success}</div>}
        {error && <div className="text-red-400 mb-2">{error}</div>}

        <hr className="my-6 border-gray-700" />
        <h3 className="text-lg font-semibold mb-2">Seguridad</h3>
        {!showPasswordForm ? (
          <>
            <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded mb-4" onClick={() => { setShowPasswordForm(true); setPasswordSuccess(""); setPasswordError(""); }}>Cambiar contraseña</button>
            {passwordSuccess && <div className="text-green-400 mb-2">{passwordSuccess}</div>}
          </>
        ) : (
          <form className="mb-4" onSubmit={handleChangePassword}>
            <label className="block text-sm mb-1">Nueva contraseña</label>
            <input type="password" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} disabled={passwordLoading} />
            <div className="flex gap-2">
              <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded" disabled={passwordLoading}>{passwordLoading ? "Guardando..." : "Guardar"}</button>
              <button type="button" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded" onClick={() => setShowPasswordForm(false)} disabled={passwordLoading}>Cancelar</button>
            </div>
            {passwordError && <div className="text-red-400 mt-2">{passwordError}</div>}
          </form>
        )}

        <hr className="my-6 border-gray-700" />
        <h3 className="text-lg font-semibold mb-2 text-red-400">Eliminar cuenta</h3>
        {!showDelete ? (
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => setShowDelete(true)}>Quiero eliminar mi cuenta</button>
        ) : (
          <div className="mb-4">
            <label className="block text-sm mb-1">Escribe <span className="font-bold">ELIMINAR</span> para confirmar:</label>
            <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={handleDeleteAccount}>Eliminar cuenta</button>
          </div>
        )}
      </div>
    </div>
  );
}