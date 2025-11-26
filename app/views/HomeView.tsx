"use client";
import React, { useEffect, useState } from "react";
import MasonryGrid from "../components/MasonryGrid";
import ShotDetailModal from "../components/ShotDetailModal";
import { supabase } from "../../lib/supabaseClient";

export default function HomeView() {
  const [shots, setShots] = useState<Array<{ id: string; image_url: string; title?: string; description?: string; user_id: string; username: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShots() {
      setLoading(true);
      // Solo shots con is_approved=true, is_active indistinto
      const { data, error } = await supabase
        .from("shots")
        .select("id, image_url, title, description, user_id, author")
        .eq("is_approved", true);
      if (data && data.length) {
        // Obtener los user_id únicos
        const userIds = [...new Set(data.map((shot) => shot.user_id).filter(Boolean))];
        let profilesMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
          if (profiles) {
            profilesMap = profiles.reduce((acc: { [key: string]: string }, profile: any) => {
              acc[profile.id] = profile.username || "sin Creador";
              return acc;
            }, {});
          }
        }
        // Asignar username a cada shot
        setShots(data.map((shot) => ({
          ...shot,
          username: profilesMap[shot.user_id] || "sin Creador",
          author: shot.author || profilesMap[shot.user_id] || "sin autor"
        })));
      } else {
        setShots([]);
      }
      setLoading(false);
    }
    fetchShots();
  }, []);

  const [selectedShot, setSelectedShot] = useState(null);
  return (
    <section className="p-2">
      {loading ? (
        <div className="text-center text-gray-500 py-8">Cargando shots...</div>
      ) : (
        <>
          <MasonryGrid shots={shots} setSelectedShot={setSelectedShot} />
          {selectedShot && (
            <ShotDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} />
          )}
        </>
      )}
    </section>
  );
}