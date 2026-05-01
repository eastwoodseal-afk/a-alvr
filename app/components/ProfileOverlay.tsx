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
  
  // NUEVO: Estado para contadores
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    
    // NUEVO: Cargar contadores reales
    if (user?.id) {
        supabase
            .from('profiles')
            .select('followers_count, following_count')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setFollowersCount(data.followers_count || 0);
                    setFollowingCount(data.following_count || 0);
                }
            });
    }
  }, [user]);

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
    
    // FIX: Forzar minúsculas antes de guardar
    const cleanUsername = username.toLowerCase();
    
    const { error } = await supabase.from("profiles").update({ username: cleanUsername }).eq("id", user.id);
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
    <div className="fixed inset-0 z-[60] flex justify-center items-start pt-16 bg-black bg-opacity-50" onClick={onClose}>
      <div className="max-w-lg w-full mx-auto mt-0 p-6 bg-gray-900 rounded-2xl shadow-xl text-gray-100 relative" onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold" onClick={onClose}>×</button>
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Mi Perfil</h2>
        
        {/* --- NUEVA SECCIÓN: ESTADÍSTICAS --- */}
        <div className="flex justify-around mb-6 p-4 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-white">{followersCount}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Seguidores</div>
            </div>
            <div className="h-10 w-px bg-gray-600"></div>
            <div className="text-center">
                <div className="text-2xl font-bold text-white">{followingCount}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Siguiendo</div>
            </div>
        </div>
        {/* ------------------------------------ */}

        <div className="mb-4">
          <label className="block text-sm mb-1">Usuario</label>
          <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100" value={username} onChange={e => setUsername(e.target.value)} disabled={saving} />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100" value={email} disabled />
        </div>
        <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded mb-4 w-full" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        
        {success && <div className="text-green-400 mb-2">{success}</div>}
        {error && <div className="text-red-400 mb-2">{error}</div>}

        <hr className="my-6 border-gray-700" />
        <h3 className="text-lg font-semibold mb-2">Seguridad</h3>
        {!showPasswordForm ? (
          <>
            <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded mb-4 w-full text-sm" onClick={() => { setShowPasswordForm(true); setPasswordSuccess(""); setPasswordError(""); }}>Cambiar contraseña</button>
            {passwordSuccess && <div className="text-green-400 mb-2">{passwordSuccess}</div>}
          </>
        ) : (
          <form className="mb-4" onSubmit={handleChangePassword}>
            <label className="block text-sm mb-1">Nueva contraseña</label>
            <input type="password" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} disabled={passwordLoading} />
            <div className="flex gap-2">
              <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded flex-1" disabled={passwordLoading}>{passwordLoading ? "Guardando..." : "Guardar"}</button>
              <button type="button" className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded flex-1" onClick={() => setShowPasswordForm(false)} disabled={passwordLoading}>Cancelar</button>
            </div>
            {passwordError && <div className="text-red-400 mt-2">{passwordError}</div>}
          </form>
        )}

        <hr className="my-6 border-gray-700" />
        <h3 className="text-lg font-semibold mb-2 text-red-400">Eliminar cuenta</h3>
        {!showDelete ? (
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full text-sm" onClick={() => setShowDelete(true)}>Quiero eliminar mi cuenta</button>
        ) : (
          <div className="mb-4">
            <label className="block text-sm mb-1">Escribe <span className="font-bold">ELIMINAR</span> para confirmar:</label>
            <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 mb-2" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full text-sm" onClick={handleDeleteAccount}>Eliminar cuenta</button>
          </div>
        )}
      </div>
    </div>
  );
}