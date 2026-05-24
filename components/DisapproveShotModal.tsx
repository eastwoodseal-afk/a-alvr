"use client";
import React, { useState } from "react";

interface Props {
  shotId: string;
  shotTitle?: string;
  onConfirm: (shotId: string, reason: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function DisapproveShotModal({ shotId, shotTitle, onConfirm, onClose, loading }: Props) {
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(shotId, reason.trim() || "No cumple con los criterios del Ateneo.");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800">
          {/* 🛠️ CURA: Terminología correcta para el muro público */}
          <h3 className="font-bold text-orange-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            Desaprobar Shot
          </h3>
          {shotTitle && <p className="text-xs text-gray-500 mt-1 truncate">"{shotTitle}"</p>}
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            {/* 🛠️ CURA: Terminología correcta */}
            <label className="text-xs text-gray-400 block mb-1">Razón de la desaprobación (opcional):</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Calidad baja, fuera de tema..." className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" autoFocus />
            <p className="text-[9px] text-gray-500 mt-1">El shot será retirado del muro público y volverá a la cola de revisión.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition">Cancelar</button>
            {/* 🛠️ CURA: Terminología correcta */}
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition disabled:opacity-50">{loading ? "Desaprobando..." : "Desaprobar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}