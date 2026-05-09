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
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    
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
    
    // VALIDACIÓN MEJORADA
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_'); // Sin espacios, minúsculas
    if (cleanUsername.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      setSaving(false);
      return;
    }

    try {
        const { error: updateError } = await supabase.from("profiles").update({ username: cleanUsername }).eq("id", user.id);
        
        if (updateError) {
            // CAPTURA DE ERROR: Nombre duplicado (Código 23505 de Postgres)
            if (updateError.code === '23505') {
              setError("Este nombre de usuario ya está en uso.");
            } else {
              throw updateError;
            }
        } else {
            // FUERZA LA ACTUALIZACIÓN DEL CONTEXTO: Dispara un evento para que AuthContext refresque el Header
            await supabase.auth.updateUser({ data: { updated_profile: true } });
            setSuccess("Guardado correctamente.");
        }
    } catch (err) {
        setError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
        setSaving(false);
    }
  }

  function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);

    if (!user?.id) { setPasswordError("Usuario no válido."); setPasswordLoading(false); return; }
    if (!newPassword || newPassword.length < 6) { setPasswordError("Mínimo 6 caracteres."); setPasswordLoading(false); return; }

    supabase.auth.updateUser({ password: newPassword })
      .then(({ error }) => {
        setPasswordLoading(false);
        if (error) {
            setPasswordError(error.message || "Error al cambiar la contraseña.");
        } else {
            setPasswordSuccess("¡Contraseña cambiada! Cerrando sesión...");
            setNewPassword("");
            setShowPasswordForm(false);
            // MANTENEMOS EL CIERRE DE SESIÓN SEGÚN INSTRUCCIÓN
            setTimeout(() => { 
              supabase.auth.signOut(); 
              onClose(); 
              window.location.href = "/"; 
            }, 2000);
        }
      })
      .catch(() => { 
        setPasswordLoading(false); 
        setPasswordError("Error crítico de conexión."); 
      });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-950 flex flex-col overflow-y-auto custom-scrollbar">
      
      <button 
        className="fixed top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold z-10 bg-gray-800 hover:bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center transition shadow-lg"
        onClick={onClose}
      >
        ×
      </button>

      <div className="w-full max-w-2xl mx-auto p-4 md:p-8 pt-16 pb-20 relative flex-1 flex flex-col justify-center">
        
        <h2 className="text-2xl font-bold mb-6 text-yellow-400 text-center md:text-left border-b border-gray-800 pb-4">
            Configuraciones del Perfil
        </h2>
        
        <div className="flex justify-around mb-6 p-4 bg-gray-900 rounded-xl border border-gray-700 shadow-sm">
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

        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg p-6 mb-6">
            <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-400">Usuario</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  disabled={saving} 
                />
                <p className="text-[10px] text-gray-500 mt-1">Minúsculas, sin espacios. Mínimo 3 caracteres.</p>
            </div>
            <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-400">Email</label>
                <input type="email" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed" value={email} disabled />
            </div>
            
            {success && <div className="text-green-400 mb-2 text-sm text-center">{success}</div>}
            {error && <div className="text-red-400 mb-2 text-sm text-center">{error}</div>}

            <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded w-full transition disabled:opacity-50" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
            </button>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Seguridad</h3>
            {!showPasswordForm ? (
            <>
                <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded w-full text-sm transition" onClick={() => { setShowPasswordForm(true); setPasswordSuccess(""); setPasswordError(""); }}>
                    Cambiar contraseña
                </button>
                {passwordSuccess && <div className="text-green-400 mt-2 text-sm text-center font-bold">{passwordSuccess}</div>}
            </>
            ) : (
            <form className="space-y-3" onSubmit={handleChangePassword}>
                <label className="block text-sm mb-1 text-gray-400">Nueva contraseña</label>
                <input type="password" className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} disabled={passwordLoading} />
                <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50" disabled={passwordLoading}>
                    {passwordLoading ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition" onClick={() => setShowPasswordForm(false)} disabled={passwordLoading}>
                    Cancelar
                </button>
                </div>
                {passwordError && <div className="text-red-400 text-sm text-center">{passwordError}</div>}
            </form>
            )}
        </div>

        <div className="bg-red-950/20 rounded-xl border border-red-900/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-red-400">Eliminar cuenta</h3>
            <p className="text-sm text-gray-400 mb-4">
                La eliminación completa de cuentas requiere verificación manual para proteger tu información. 
            </p>
            <button className="bg-gray-600 text-gray-400 py-2 px-4 rounded w-full text-sm cursor-not-allowed" disabled>
                Contactar al Administrador para eliminar cuenta
            </button>
        </div>

      </div>
    </div>
  );
}