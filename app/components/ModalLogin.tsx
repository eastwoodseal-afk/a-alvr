
"use client";
import React, { useState } from "react";
import ModalUsername from "./ModalUsername";
import { supabase } from "../../lib/supabaseClient";

export default function ModalLogin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Limpiar campos al cerrar el modal o al abrirlo
  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError("");
      setIsRegister(false);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
        <div className="relative bg-gray-400 rounded-2xl shadow-2xl p-8 pt-4 w-full max-w-md text-gray-800 flex flex-col items-center" style={{ fontFamily: 'inherit' }}>
        <div className="flex w-full justify-end mt-2 mb-4">
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow"
            onClick={onClose}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <div className="mb-8 flex w-full justify-center gap-2">
          <button
            className={`flex-1 py-2 rounded-l-xl font-semibold text-base transition ${!isRegister ? 'bg-yellow-500 text-white shadow' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setIsRegister(false)}
          >
            Iniciar sesión
          </button>
          <button
            className={`flex-1 py-2 rounded-r-xl font-semibold text-base transition ${isRegister ? 'bg-yellow-500 text-white shadow' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setIsRegister(true)}
          >
            Registrarse
          </button>
        </div>
        {!isRegister ? (
          <>
            <form className="w-full space-y-5" onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              const { data, error } = await supabase.auth.signInWithPassword({ email, password });
              setLoading(false);
              if (error) {
                setError(error.message);
              } else {
                // Consultar perfil tras login
                if (data?.user?.id) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', data.user.id)
                    .single();
                  if (!profile?.username) {
                    setUserId(data.user.id);
                    setShowUsernameModal(true);
                    return;
                  }
                }
                onClose();
              }
            }}>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900">Contraseña</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <div className="text-red-600 text-sm font-medium mb-2">{error}</div>}
              <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition" disabled={loading}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>
            <div className="w-full flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300" />
              <span className="mx-2 text-gray-500 text-sm">o</span>
              <div className="flex-grow h-px bg-gray-300" />
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              onClick={async () => {
                setLoading(true);
                setError("");
                const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
                setLoading(false);
                if (error) setError(error.message);
                // Tras login con Google, obtener usuario actual
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user?.id) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', userData.user.id)
                    .single();
                  if (!profile?.username) {
                    setUserId(userData.user.id);
                    setShowUsernameModal(true);
                    return;
                  }
                }
                onClose();
              }}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.22l6.9-6.9C35.64 2.36 30.13 0 24 0 14.61 0 6.27 5.48 1.98 13.44l8.06 6.27C12.18 13.13 17.61 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.54-.14-3.02-.41-4.45H24v8.43h12.45c-.54 2.9-2.18 5.36-4.64 7.02l7.18 5.59C43.73 37.36 46.1 31.44 46.1 24.5z"/><path fill="#FBBC05" d="M9.98 28.73c-1.13-3.36-1.13-6.97 0-10.33l-8.06-6.27C-1.32 17.61-1.32 30.39 1.92 37.16l8.06-6.27z"/><path fill="#EA4335" d="M24 46c6.13 0 11.64-2.02 15.63-5.49l-7.18-5.59c-2.01 1.35-4.59 2.14-7.45 2.14-6.39 0-11.82-3.63-14.06-8.91l-8.06 6.27C6.27 42.52 14.61 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              Iniciar sesión con Google
            </button>
          </>
        ) : (
          <form className="w-full space-y-5" onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            const form = e.target as HTMLFormElement;
            const emailValue = form.email.value;
            const passwordValue = form.password.value;
            const usernameValue = form.username.value;
            const { data, error } = await supabase.auth.signUp({
              email: emailValue,
              password: passwordValue,
              options: { data: { username: usernameValue } }
            });
            // Si el email es el del superadmin, actualiza el perfil y registra la promoción
            if (data?.user && emailValue === 'eastwood.seal@gmail.com') {
              setTimeout(async () => {
                if (data.user) {
                  await supabase
                    .from('profiles')
                    .update({ 
                      role: 'superadmin',
                      promoted_by: data.user.id,
                      promoted_at: new Date().toISOString()
                    })
                    .eq('id', data.user.id);
                  await supabase
                    .from('role_promotions')
                    .insert({
                      user_id: data.user.id,
                      promoted_by: data.user.id,
                      old_role: 'subscriber',
                      new_role: 'superadmin',
                      notes: 'Initial superadmin setup',
                      created_at: new Date().toISOString(),
                    });
                }
              }, 2000);
            }
            setLoading(false);
            if (error) {
              setError(error.message);
            } else {
              onClose();
            }
          }}>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">Email</label>
              <input name="email" type="email" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500" required disabled={loading} />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">Nombre de usuario</label>
              <input name="username" type="text" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500" required disabled={loading} />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900">Contraseña</label>
              <input name="password" type="password" className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500" required disabled={loading} />
            </div>
            {error && <div className="text-red-600 text-sm font-medium mb-2">{error}</div>}
            <button type="submit" className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition" disabled={loading}>
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </form>
        )}
        </div>
      </div>
      {/* Modal de username forzado */}
      <ModalUsername open={showUsernameModal} userId={userId} onClose={() => {
        setShowUsernameModal(false);
        setUserId("");
        onClose();
      }} />
    </>
  );
}
