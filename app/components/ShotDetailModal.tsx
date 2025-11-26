import React from "react";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
}

export default function ShotDetailModal({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  if (!shot) return null;
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col items-center pt-[40px] pb-[80px] overflow-auto custom-scrollbar" style={{ top: '64px', maxHeight: 'calc(100vh - 64px)', background: 'rgba(10, 24, 51, 0.85)' }}>
      <div
        className="relative bg-gray-900 rounded-2xl shadow-2xl text-gray-100 flex flex-col items-center overflow-auto custom-scrollbar w-full sm:w-fit px-4 sm:px-8 p-6"
        style={{
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
        }}
      >
        <button
          className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-[28px] h-[28px] flex items-center justify-center text-xl font-bold shadow"
          onClick={onClose}
          aria-label="Cerrar"
        >
          &times;
        </button>
        <img
          src={shot.image_url}
          alt={shot.title || "Shot"}
          className="object-contain rounded-lg mb-4"
          style={{
            width: '100%',
            maxWidth: '100vw',
            height: 'auto',
            maxHeight: '80vh',
            display: 'block',
          }}
          onLoad={e => {
            const img = e.currentTarget;
            if (img.parentElement) {
              if (window.innerWidth >= 640) {
                const naturalWidth = Math.min(img.naturalWidth, 1600);
                img.parentElement.style.width = naturalWidth + 'px';
              } else {
                img.parentElement.style.width = '100%';
              }
            }
          }}
        />
        <div className="w-full text-left">
          <div className="text-lg text-yellow-400 font-bold mb-2">
            {shot.author || "sin autor"}
          </div>
          {shot.title && <div className="text-lg font-bold text-yellow-400 mb-2">{shot.title}</div>}
          {shot.description && <div className="text-base text-gray-200 mb-2">{shot.description}</div>}
          <div className="text-xs text-gray-400 mt-2">Usuario: {shot.username || "sin username"}</div>
        </div>
      </div>
    </div>
  );
}
