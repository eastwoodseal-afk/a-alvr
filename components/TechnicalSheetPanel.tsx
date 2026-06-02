"use client";
import React, { useState } from "react";

interface Shot {
  work_name?: string;
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
}

interface Props {
  shot: Shot;
}

export default function TechnicalSheetPanel({ shot }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasTechnicalData = shot.work_name || shot.land_area || shot.construction_area || shot.awards || shot.objective || shot.functionality || shot.challenges || shot.construction_method || shot.location_type || shot.designers || shot.client || shot.original_use || shot.year || shot.photographer || shot.locality;

  if (!hasTechnicalData) return null;

  return (
    <div className="w-full animate-fade-in">
      {/* HEADER: Título Izquierda + Manija Centrada en espacio restante */}
      <div 
        className="flex items-center w-full cursor-pointer group py-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-3 group-hover:text-white transition whitespace-nowrap">
          Ficha técnica
        </span>
        <div className="flex-1 flex justify-center">
          <div className="w-12 h-1 bg-gray-700 rounded-full group-hover:bg-gray-500 transition"></div>
        </div>
      </div>

      {/* CONTENIDO */}
      {isExpanded && (
        <div className="pt-2 space-y-2 animate-fade-in" onClick={e => e.stopPropagation()}>
          
          {/* GRID DE DATOS BÁSICOS */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            
            {shot.work_name && (
              <div className="col-span-2 flex justify-between border-b border-gray-800/50 pb-1">
                <span className="text-gray-500 font-medium">Obra:</span>
                <span className="text-white font-bold text-right">{shot.work_name}</span>
              </div>
            )}
            
            {shot.land_area && (
              <div className="flex justify-between">
                <span className="text-gray-500">Área Total:</span>
                <span className="text-white">{shot.land_area}</span>
              </div>
            )}
            
            {shot.construction_area && (
              <div className="flex justify-between">
                <span className="text-gray-500">Área Construcción:</span>
                <span className="text-white">{shot.construction_area}</span>
              </div>
            )}
            
            {shot.year && (
              <div className="flex justify-between">
                <span className="text-gray-500">Año:</span>
                <span className="text-white">{shot.year}</span>
              </div>
            )}
            
            {shot.locality && (
              <div className="flex justify-between">
                <span className="text-gray-500">Localidad:</span>
                <span className="text-white">{shot.locality}</span>
              </div>
            )}
            
            {shot.location_type && (
              <div className="flex justify-between">
                <span className="text-gray-500">Rural o Urbano:</span>
                <span className="text-white">{shot.location_type}</span>
              </div>
            )}
            
            {shot.original_use && (
              <div className="flex justify-between">
                <span className="text-gray-500">Uso Original:</span>
                <span className="text-white">{shot.original_use}</span>
              </div>
            )}
            
            {shot.client && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="text-white">{shot.client}</span>
              </div>
            )}
            
            {shot.designers && (
              <div className="flex justify-between">
                <span className="text-gray-500">Diseñadores:</span>
                <span className="text-white">{shot.designers}</span>
              </div>
            )}
            
            {shot.photographer && (
              <div className="col-span-2 flex justify-between border-t border-gray-800/50 pt-1">
                <span className="text-gray-500">Fotografía:</span>
                <span className="text-white italic">{shot.photographer}</span>
              </div>
            )}
          </div>

          {/* PREMIOS */}
          {shot.awards && (
            <div className="bg-yellow-500/5 border-l-2 border-yellow-500/40 pl-2 py-1 mt-2">
              <span className="text-[10px] text-yellow-400 font-bold block mb-0.5">🏆 Premios y Reconocimientos</span>
              <p className="text-[11px] text-gray-300 italic">{shot.awards}</p>
            </div>
          )}

          {/* TEXTO LARGO */}
          {shot.objective && (
            <div>
              <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Objetivo:</span>
              <p className="text-gray-300 text-[11px]">{shot.objective}</p>
            </div>
          )}

          {shot.functionality && (
            <div>
              <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Funcionalidad:</span>
              <p className="text-gray-300 text-[11px]">{shot.functionality}</p>
            </div>
          )}

          {shot.challenges && (
            <div>
              <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Retos:</span>
              <p className="text-gray-300 text-[11px]">{shot.challenges}</p>
            </div>
          )}

          {shot.construction_method && (
            <div>
              <span className="text-gray-500 font-medium text-[10px] block mb-0.5">Método Constructivo:</span>
              <p className="text-gray-300 text-[11px]">{shot.construction_method}</p>
            </div>
          )}

          {/* FUENTE */}
          {shot.info_source && (
            <div className="pt-2 border-t border-gray-800/50">
              <span className="text-gray-600 text-[10px] italic block">Fuente: {shot.info_source}</span>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}