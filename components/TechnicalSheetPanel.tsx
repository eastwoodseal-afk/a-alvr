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

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full py-2 px-3 bg-gray-800/50 hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          Ficha técnica
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-full bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden animate-fade-in">
      {/* HEADER */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70 transition"
        onClick={() => setIsExpanded(false)}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-yellow-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          Ficha técnica
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </div>

      {/* CONTENIDO */}
      <div className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
        
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
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-2 mt-2">
            <span className="text-[10px] text-yellow-400 font-bold block mb-1">🏆 Premios y Reconocimientos</span>
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
    </div>
  );
}