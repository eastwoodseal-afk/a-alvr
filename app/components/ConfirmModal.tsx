"use client";
import React from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary'; // Rojo o Amarillo
}

export default function ConfirmModal({ 
  open, 
  title, 
  message, 
  onConfirm, 
  onClose, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = 'primary'
}: Props) {
  
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-sm p-6 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Título */}
        <h3 className="text-lg font-bold text-white mb-2">
          {title}
        </h3>
        
        {/* Mensaje */}
        <p className="text-sm text-gray-400 mb-6">
          {message}
        </p>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition shadow-lg ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-yellow-500 hover:bg-yellow-400 text-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}