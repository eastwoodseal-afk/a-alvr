"use client";
import React from "react";

interface ObraItem {
  slug: string;
  name: string;
  thumbnail: string;
}

interface Props {
  obras: Record<string, ObraItem[]>;
  onClose: () => void;
  onSelectObra: (slug: string) => void;
}

export default function ObrasIndexOverlay({ obras, onClose, onSelectObra }: Props) {
  const totalObras = Object.values(obras).flat().length;

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 z-[55] bg-gray-950/98 backdrop-blur-sm flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-500 bg-gray-950 flex-shrink-0">
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-yellow-500 flex items-center justify-center flex-shrink-0 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <h2 className="text-base font-bold text-yellow-400 uppercase tracking-wider">Obras Guardadas</h2>
        <span className="text-xs text-gray-500 ml-1">({totalObras})</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {totalObras === 0 ? (
          <div className="text-center py-12 text-gray-600">Aún no has guardado shots que pertenezcan a una obra.</div>
        ) : (
          Object.entries(obras).map(([category, obrasInCategory]) => (
            <div key={category} className="mb-8">
              <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-800 pb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-yellow-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {obrasInCategory.map(obra => (
                  <button 
                    key={obra.slug} 
                    onClick={() => onSelectObra(obra.slug)}
                    className="group text-left bg-gray-900 rounded-lg border border-gray-800 hover:border-yellow-500 transition overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-800 overflow-hidden">
                      <img src={obra.thumbnail} alt={obra.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-white font-semibold truncate group-hover:text-yellow-400 transition">{obra.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}