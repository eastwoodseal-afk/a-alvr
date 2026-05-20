"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShotShareClient({ shotId }: { shotId: string }) {
  const router = useRouter();

  useEffect(() => {
    // 🚀 REDIRECT INSTANTÁNEO: Lleva directo al muro y abre el modal
    router.replace(`/?open_shot=${shotId}`);
  }, [shotId, router]);

  // Pantalla de carga ultra rápida (apenas la verá un milisegundo)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Abriendo pieza en el Ateneo...</p>
      </div>
    </div>
  );
}