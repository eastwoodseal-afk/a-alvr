import React from "react";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
}

interface MasonryGridProps {
  shots: Array<{
    id: string;
    image_url: string;
    title?: string;
    description?: string;
    username?: string;
    user_id?: string;
  }>;
  setShots?: (shots: Array<any>) => void;
  setSelectedShot?: (shot: any) => void;
}

export default function MasonryGrid({ shots, setShots, setSelectedShot }: MasonryGridProps) {
  // ...existing code...
  // Declarar setSelectedShot como prop
  const [savedShots, setSavedShots] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { user } = useAuth();

  // Consultar shots guardados al cargar
  React.useEffect(() => {
    async function fetchSavedShots() {
      if (!user) return;
      const { data, error } = await supabase
        .from("saved_shots")
        .select("shot_id")
        .eq("user_id", user.id);
      if (data) {
        setSavedShots(data.map((row: { shot_id: string }) => row.shot_id));
      }
    }
    fetchSavedShots();
  }, [user]);

  // ...existing code...
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // ...existing code...
  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full xl:w-screen xl:max-w-none pt-20">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="mb-2 break-inside-avoid rounded-lg overflow-hidden shadow bg-gray-800 cursor-pointer hover:ring-2 hover:ring-yellow-500 transition relative"
            onClick={() => {
              if (typeof setSelectedShot === 'function') {
                setSelectedShot(shot);
              }
              setEditTitle(shot.title || "");
              setEditDescription(shot.description || "");
              setEditing(false);
              setEditError("");
            }}
          >
            <img src={shot.image_url} alt={shot.title || "Shot"} className="w-full object-cover" />
            {/* Autor debajo de la imagen */}
            <div className="px-2 pt-2 text-yellow-400 font-bold text-sm">{shot.author || "sin autor"}</div>
            {/* Mostrar botón de guardar solo si hay sesión iniciada */}
            {user && (
              <button
                className={`absolute top-2 right-2 rounded-full w-[32px] h-[32px] flex items-center justify-center shadow-lg z-0 transition-colors`}
                style={savedShots.includes(shot.id)
                  ? { background: '#facc15', color: '#fff', cursor: 'default', boxShadow: '0 2px 8px #facc15aa' }
                  : { background: 'rgba(236, 72, 153, 0.35)', backdropFilter: 'blur(8px)', color: '#fff' }
                }
                disabled={savedShots.includes(shot.id) || savingId === shot.id}
                tabIndex={-1}
                aria-label={savedShots.includes(shot.id) ? "Guardado" : "Guardar shot"}
                onClick={async e => {
                  e.stopPropagation();
                  setSavingId(shot.id);
                  // Guardar en la base de datos
                  const { error } = await supabase
                    .from("saved_shots")
                    .insert({ user_id: user.id, shot_id: shot.id });
                  if (!error) {
                    setSavedShots(prev => [...prev, shot.id]);
                  }
                  setSavingId(null);
                }}
              >
                {savedShots.includes(shot.id) ? (
                  // Paloma de confirmación
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  // Ícono de shot (Heroicons: Camera)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a3 3 0 100 6 3 3 0 000-6z" />
                  </svg>
                )}
              </button>
            )}
            {/* Username oculto, solo se muestra el autor */}
            {shot.title && <div className="px-2 py-2 font-semibold text-gray-200">{shot.title}</div>}
            {/* Descripción eliminada del card */}
          </div>
        ))}
      </div>
      {/* El modal se maneja desde UserShots usando MyShotDetailModal */}
    </>
  );
}
