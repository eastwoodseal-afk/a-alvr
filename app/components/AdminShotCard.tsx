"use client";
import React from "react";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  author?: string;
  username?: string;
  created_at: string;
}

interface Props {
  shot: Shot;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onPreview: (shot: Shot) => void;
}

export default function AdminShotCard({ shot, isSelected, onToggle, onPreview }: Props) {
  return (
    <div 
      className={`rounded-lg overflow-hidden transition-all ${
        isSelected 
          ? 'ring-2 ring-yellow-500 bg-gray-700' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
    >
      <div className="flex gap-3 p-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(shot.id)}
          className="w-5 h-5 accent-yellow-500 cursor-pointer flex-shrink-0 mt-1"
        />

        {/* Imagen */}
        <div 
          className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => onPreview(shot)}
        >
          <img 
            src={shot.image_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Usuario */}
              <div className="text-yellow-400 font-bold text-sm truncate">
                @{shot.username || "sin_username"}
              </div>
              
              {/* Título */}
              <div className="text-white font-semibold text-sm truncate">
                {shot.title || "Sin título"}
              </div>
            </div>
            
            {/* Fecha */}
            <div className="text-xs text-gray-500 flex-shrink-0">
              {new Date(shot.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
              })}
            </div>
          </div>

          {/* Descripción */}
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
            {shot.description || "Sin descripción"}
          </p>

          {/* Autor */}
          {shot.author && (
            <div className="text-xs text-gray-500 mt-1">
              Por: {shot.author}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}