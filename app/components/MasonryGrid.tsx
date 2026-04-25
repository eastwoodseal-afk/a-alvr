import React from "react";
import ShotCard from "./ShotCard";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
  boardname?: string; // Añadimos board_name a la interfaz
}

interface MasonryGridProps {
  shots: Shot[];
  setSelectedShot?: (shot: Shot) => void;
  savedShots: string[];
  savingId: string | null;
  onSaveShot: (id: string) => void;
  user: any;
}

export default function MasonryGrid({ shots, setSelectedShot, savedShots, savingId, onSaveShot, user }: MasonryGridProps) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-6 gap-2 w-full xl:w-screen xl:max-w-none pt-20">
      {shots.map((shot) => (
        <ShotCard
          key={shot.id}
          shot={shot}
          user={user}
          isSaved={savedShots.includes(shot.id)}
          isSaving={savingId === shot.id}
          onSave={() => onSaveShot(shot.id)}
          onClick={() => {
            if (typeof setSelectedShot === 'function') {
              setSelectedShot(shot);
            }
          }}
          // Pasamos el nombre del tablero a la tarjeta
          boardName={shot.board_name}
        />
      ))}
    </div>
  );
}