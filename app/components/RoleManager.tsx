"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Props {
  currentUserId: string;
}

interface Admin {
  id: string;
  username: string;
  role: string;
  promoted_at: string | null;
}

export default function RoleManager({ currentUserId }: Props) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, role, promoted_at')
      .in('role', ['admin', 'superadmin'])
      .order('promoted_at', { ascending: false });
    
    if (data) setAdmins(data);
    setLoading(false);
  };

  const handleDemote = async (admin: Admin) => {
    // Protección: no degradarse a sí mismo
    if (admin.id === currentUserId) return;

    // Confirmación clara
    const confirmed = confirm(
      `¿Degradar a @${admin.username} de ${admin.role === 'superadmin' ? 'Superadmin' : 'Administrador'} a Miembro?\n\nEsta acción se puede revertir promoviendo al usuario nuevamente.`
    );
    
    if (!confirmed) return;

    setProcessingId(admin.id);

    try {
      // 1. Degradar
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: 'member',
          promoted_by: null,
          promoted_at: null
        })
        .eq('id', admin.id);

      if (error) throw error;

      // 2. Notificar
      await supabase.from('notifications').insert({
        user_id: admin.id,
        title: 'Rol Actualizado',
        message: 'Tu rol ha cambiado a Miembro.',
        type: 'role_change',
        read: false
      });

      // 3. Actualizar lista
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      
      setSuccessMsg(`@${admin.username} degradado a Miembro.`);
      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (err: any) {
      console.error("Error al degradar:", err);
      alert("Error al degradar. Intenta de nuevo.");
    }

    setProcessingId(null);
  };

  if (loading) {
    return <div className="text-gray-400 text-center py-8">Cargando administradores...</div>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-bold text-yellow-400 mb-2">Gestión de Administradores</h3>
      <p className="text-sm text-gray-400 mb-6">
        Degrada administradores a miembros individualmente. Esta acción requiere confirmación.
      </p>

      {admins.length === 0 ? (
        <div className="text-gray-500 text-center py-4">No hay administradores registrados.</div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => {
            const isSelf = admin.id === currentUserId;
            const isProcessing = processingId === admin.id;

            return (
              <div 
                key={admin.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isSelf ? 'bg-gray-600 opacity-60' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar/Icono */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    admin.role === 'superadmin' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                  }`}>
                    {(admin.username || '?').charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      @{admin.username || "sin_username"}
                      {isSelf && <span className="text-xs text-gray-400">(Tú)</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {admin.role === 'superadmin' ? '👑 Superadmin' : 'Administrador'}
                      {admin.promoted_at && (
                        <span className="ml-2">
                          • desde {new Date(admin.promoted_at).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón degradar */}
                {isSelf ? (
                  <span className="text-xs text-gray-500 italic px-3">Protegido</span>
                ) : (
                  <button
                    onClick={() => handleDemote(admin)}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isProcessing
                        ? 'bg-gray-500 text-gray-300 cursor-wait'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isProcessing ? "Degradando..." : "Degradar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-lg z-[70]">
          {successMsg}
        </div>
      )}
    </div>
  );
}