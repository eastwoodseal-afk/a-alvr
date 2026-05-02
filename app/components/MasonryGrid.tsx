import React from "react";
import ShotCard from "./ShotCard";

interface Shot { id: string; image_url: string; title?: string; description?: string; username?: string; user_id?: string; author?: string; likes_count?: number; views_count?: number; board_name?: string; }

interface MasonryGridProps {
  shots: Shot[];
  setSelectedShot?: (shot: Shot) => void;
  savedShots: string[];
  savingId: string | null;
  onSaveShot: (id: string) => void;
  user: any;
  likedShots?: string[]; 
  likingId?: string | null; 
  onLike?: (id: string) => void; 
  hideLikes?: boolean;
  hideViews?: boolean;
  isAdmin?: boolean;
  onDisapprove?: (id: string) => void;
  disapprovingId?: string | null;
  columnsClass?: string;
}

export default function MasonryGrid({ 
  shots, 
  setSelectedShot, 
  savedShots, 
  savingId, 
  onSaveShot, 
  user, 
  likedShots = [], 
  likingId = null, 
  onLike = () => {},
  hideLikes = false,
  hideViews = false,
  isAdmin,
  onDisapprove,
  disapprovingId,
  columnsClass = "columns-2 md:columns-3 lg:columns-4 xl:columns-6" // Default actualizado
}: MasonryGridProps) {
  return (
    // CORRECCIÓN: Eliminado xl:w-screen xl:max-w-none
    <div className={`${columnsClass} gap-2 w-full pt-20`}>
      {shots.map((shot) => (
        <ShotCard
          key={shot.id}
          shot={shot}
          user={user}
          isSaved={savedShots.includes(shot.id)}
          isSaving={savingId === shot.id}
          onSave={() => onSaveShot(shot.id)}
          onClick={() => { if (typeof setSelectedShot === 'function') setSelectedShot(shot); }}
          
          isLiked={likedShots.includes(shot.id)}
          likesCount={shot.likes_count || 0}
          isLiking={likingId === shot.id}
          onLike={() => onLike(shot.id)}
          boardName={shot.board_name}
          hideLikes={hideLikes}
          hideViews={hideViews}
          
          isAdmin={isAdmin}
          onDisapprove={onDisapprove}
          isDisapproving={disapprovingId === shot.id}
        />
      ))}
    </div>
  );
}