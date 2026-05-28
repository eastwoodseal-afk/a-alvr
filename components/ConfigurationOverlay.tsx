"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

export default function ConfigurationOverlay({ onClose }: Props) {
  const { user, updateUsername } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
  }, [user]);

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    if (!user) { setSaving(false); setError("No hay usuario."); return; }
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    if (cleanUsername.length < 3) { setError("Mínimo 3 caracteres."); setSaving(false); return; }
    try {
      const { error: updateError } = await supabase.from("profiles").update({ username: cleanUsername }).eq("id", user.id);
      if (updateError) {
        if (updateError.code === '23505') setError("Ese nombre ya está en uso.");
        else throw updateError;
      } else { updateUsername(cleanUsername); setSuccess("Guardado correctamente."); }
    } catch (err) { setError("No se pudo guardar."); } finally { setSaving(false); }
  }

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPasswordError(""); setPasswordLoading(true);
    if (!newPassword || newPassword.length < 6) { setPasswordError("Mínimo 6 caracteres."); setPasswordLoading(false); return; }
    supabase.auth.updateUser({ password: newPassword })
      .then(({ error }) => {
        setPasswordLoading(false);
        if (error) { setPasswordError(error.message || "Error."); }
        else { setTimeout(() => { supabase.auth.signOut(); onClose(); window.location.href = "/"; }, 1500); }
      })
      .catch(() => { setPasswordLoading(false); setPasswordError("Error crítico."); });
  }

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setDeleteError("Error de autenticación."); setDeleting(false); return; }

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await supabase.auth.signOut();
        onClose();
        router.push('/');
      } else {
        setDeleteError(data.error || "No se pudo eliminar la cuenta.");
      }
    } catch (err) {
      setDeleteError("Error de conexión.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[60] bg-gray-950 flex flex-col overflow-y-auto custom-scrollbar">
      
      <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-gray-800 bg-gray-900/50 h-10">
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-200">Configuración del Perfil</h2>
      </div>

      <div className="w-full max-w-lg mx-auto p-4 pt-6 flex-1">

        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg p-5 mb-6">
          <div className="mb-4">
            <label className="block text-xs mb-1 text-gray-400">Usuario</label>
            <input type="text" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" value={username} onChange={e => setUsername(e.target.value)} disabled={saving} />
          </div>
          <div className="mb-4">
            <label className="block text-xs mb-1 text-gray-400">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-500 text-sm cursor-not-allowed" value={email} disabled />
          </div>
          {success && <div className="text-green-400 mb-2 text-xs text-center">{success}</div>}
          {error && <div className="text-red-400 mb-2 text-xs text-center">{error}</div>}
          <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded text-sm transition disabled:opacity-50" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4 text-white">Seguridad</h3>
          {!showPasswordForm ? (
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-xs transition" onClick={() => { setShowPasswordForm(true); setPasswordError(""); }}>
              Cambiar contraseña
            </button>
          ) : (
            <form className="space-y-3" onSubmit={handleChangePassword}>
              <input type="password" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" placeholder="Nueva contraseña" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} disabled={passwordLoading} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded text-xs transition disabled:opacity-50" disabled={passwordLoading}>
                  {passwordLoading ? "Guardando..." : "Actualizar"}
                </button>
                <button type="button" className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 rounded text-xs transition" onClick={() => setShowPasswordForm(false)} disabled={passwordLoading}>
                  Cancelar
                </button>
              </div>
              {passwordError && <div className="text-red-400 text-xs text-center">{passwordError}</div>}
            </form>
          )}
        </div>

        <div className="bg-red-950/20 rounded-xl border border-red-900/50 shadow-lg p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Eliminar cuenta</h3>
          
          {deleteError && <div className="text-red-400 text-xs text-center mb-3">{deleteError}</div>}

          {!confirmDelete ? (
            <button 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm transition"
              onClick={() => setConfirmDelete(true)}
            >
              Quiero eliminar mi cuenta
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="w-full text-[11px] text-red-300 bg-red-900/40 border border-red-800/60 rounded px-3 py-2 text-center">
                ⚠️ Acción irreversible. Perderás el acceso a esta cuenta permanentemente. ¿Continuar?
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm transition disabled:opacity-50 animate-pulse"
                >
                  {deleting ? "Eliminando..." : "Sí, eliminar cuenta"}
                </button>
                <button 
                  onClick={() => { setConfirmDelete(false); setDeleteError(""); }}
                  disabled={deleting}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded text-sm transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}