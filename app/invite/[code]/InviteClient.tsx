"use client";
import React, { useEffect, useState, use } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function InviteClient({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);
  const [status, setStatus] = useState("Verificando invitación...");

  useEffect(() => {
    const processInvite = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setStatus("Debes iniciar sesión para usar este enlace. Redirigiendo...");
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      try {
        const res = await fetch('/api/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, accessToken: session.access_token })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("¡Acceso concedido! Redirigiendo al Ateneo...");
          setTimeout(() => router.push('/'), 2000);
        } else {
          setStatus(`❌ ${data.error || 'Error al procesar la invitación.'}`);
        }
      } catch (err) {
        setStatus("❌ Error de conexión con el servidor.");
      }
    };

    processInvite();
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="text-center p-8 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-sm w-full">
        <div className="text-4xl mb-4">🎫</div>
        <p className="text-lg font-bold mb-2">{status}</p>
        <button onClick={() => router.push('/')} className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold transition">
          Ir al Inicio
        </button>
      </div>
    </div>
  );
}