"use client";
import React from "react";

interface Props {
  obraTag: {
    name?: string;
    land_area?: string;
    construction_area?: string;
    awards?: string;
    info_source?: string;
    objective?: string;
    functionality?: string;
    challenges?: string;
    construction_method?: string;
    location_type?: string;
    designers?: string;
    client?: string;
    original_use?: string;
    year?: string;
    photographer?: string;
    locality?: string;
  } | null | undefined; // 🛠️ Añadido undefined
}

export default function TechnicalSheetPanel({ obraTag }: Props) {
  // Si no hay obra asignada, no mostramos nada
  if (!obraTag) return null;

  const hasData = obraTag.land_area || obraTag.year || obraTag.locality || obraTag.designers || obraTag.awards || obraTag.objective || obraTag.client || obraTag.construction_area || obraTag.info_source || obraTag.functionality || obraTag.challenges || obraTag.construction_method || obraTag.location_type || obraTag.original_use || obraTag.photographer;

  if (!hasData) return null;

  return (
    <div className="w-full animate-fade-in">
      {/* HEADER CON BARRA CENTRAL */}
      <div 
        className="flex items-center w-full cursor-pointer group py-2"
        onClick={() => {}} // Solo visual, la edición va por el CuratePanel
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-3 group-hover:text-white transition whitespace-nowrap">
          Ficha técnica
        </span>
        <div className="flex-1 flex justify-center">
          <div className="w-12 h-1 bg-gray-700 rounded-full group-hover:bg-gray-500 transition"></div>
        </div>
      </div>

      <div className="pt-2 space-y-2 animate-fade-in">
        
        {/* GRID DE DATOS */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          
          {obraTag.name && (
            <div className="col-span-2 flex justify-between border-b border-gray-800/50 pb-1">
              <span className="text-gray-500 font-medium">Obra:</span>
              <span className="text-white font-bold text-right">{obraTag.name}</span>
            </div>
          )}
          
          {obraTag.land_area && (
            <div className="flex justify-between">
              <span className="text-gray-500">Área Total:</span>
              <span className="text-white">{obraTag.land_area}</span>
            </div>
          )}
          
          {obraTag.construction_area && (
            <div className="flex justify-between">
              <span className="text-gray-500">Área Construcción:</span>
              <span className="text-white">{obraTag.construction_area}</span>
            </div>
          )}
          
          {obraTag.year && (
            <div className="flex justify-between">
              <span className="text-gray-500">Año:</span>
              <span className="text-white">{obraTag.year}</span>
            </div>
          )}
          
          {obraTag.locality && (
            <div className="flex justify-between">
              <span className="text-gray-500">Localidad:</span>
              <span className="text-white">{obraTag.locality}</span>
            </div>
          )}
          
          {obraTag.location_type && (
            <div className="flex justify-between">
              <span className="text-gray-500">Rural o Urbano:</span>
              <span className="text-white">{obraTag.location_type}</span>
            </div>
          )}
          
          {obraTag.original_use && (
            <div className="flex justify-between">
              <span className="text-gray-500">Uso Original:</span>
              <span className="text-white">{obraTag.original_use}</span>
            </div>
          )}
          
          {obraTag.client && (
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span className="text-white">{obraTag.client}</span>
            </div>
          )}
          
          {obraTag.designers && (
            <div className="flex justify-between">
              <span className="text-gray-500">Diseñadores:</span>
              <span className="text-white">{obraTag.designers}</span>
            </div>
          )}
          
          {obraTag.photographer && (
            <div className="col-span-2 flex justify-between border-t border-gray-800/50 pt-1">
              <span className="text-gray-500">Fotografía:</span>
              <span className="text-white italic">{obraTag.photographer}</span>
            </div>
          )}
        </div>

        {/* PREMIOS */}
        {obraTag.awards && (
          <div className="bg-yellow-500/5 border-l-2 border-yellow-500/40 pl-2 py-1 mt-2">
            <span className="text-[10px] text-yellow-400 font-bold block mb-0.5">🏆 Premios y Reconocimientos</span>
            <p className="text-[11px] text-gray-300 italic">{obraTag.awards}</p>
          </div>
        )}

        {/* TEXTO LARGO */}
        {obraTag.objective && (
          <div>
            <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Objetivo:</span>
            <p className="text-gray-300 text-[11px]">{obraTag.objective}</p>
          </div>
        )}

        {obraTag.functionality && (
          <div>
            <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Funcionalidad:</span>
            <p className="text-gray-300 text-[11px]">{obraTag.functionality}</p>
          </div>
        )}

        {obraTag.challenges && (
          <div>
            <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Retos:</span>
            <p className="text-gray-300 text-[11px]">{obraTag.challenges}</p>
          </div>
        )}

        {obraTag.construction_method && (
          <div>
            <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Método Constructivo:</span>
            <p className="text-gray-300 text-[11px]">{obraTag.construction_method}</p>
          </div>
        )}

        {/* FUENTE */}
        {obraTag.info_source && (
          <div className="pt-2 border-t border-gray-800/50">
            <span className="text-gray-600 text-[10px] italic block">Fuente: {obraTag.info_source}</span>
          </div>
        )}
        
      </div>
    </div>
  );
}