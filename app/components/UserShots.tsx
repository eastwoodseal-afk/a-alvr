"use client";

import React, { useEffect, useState } from "react";
import MasonryGrid from "./MasonryGrid";
import MyShotDetailModal from "./MyShotDetailModal";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";

interface Shot {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  username?: string;
  user_id?: string;
  author?: string;
}

export default function UserShots({ userId }: { userId: string }) {
  const [shots, setShots] = useState<Array<{ id: string; image_url: string; title?: string; description?: string; user_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchUserShots() {
      setLoading(true);
      if (!userId) {
        setShots([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("shots")
        .select("id, image_url, title, description, user_id, author")
        .eq("user_id", userId)
        .order("id", { ascending: false });
      // Obtener el username del usuario
      let username = "sin username";
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single();
        if (profile && profile.username) {
          username = profile.username;
        }
      }
      // Asignar username a cada shot
      const shotsWithUsername = (data || []).map(shot => ({
        ...shot,
        user_id: shot.user_id || userId,
        username,
        author: shot.author || username || "sin autor"
      }));
      setShots(shotsWithUsername);
      setLoading(false);
    }
    fetchUserShots();
  }, [userId]);

  if (loading) return <div className="text-center text-gray-500 py-8">Cargando shots...</div>;
  if (!shots.length) return <div className="text-center text-gray-500 py-8">No tienes shots aún.</div>;
  return <>
    <MasonryGrid shots={shots} setShots={setShots} setSelectedShot={setSelectedShot} />
    {selectedShot && (
      <MyShotDetailModal
        shot={selectedShot}
        user={user}
        onClose={() => setSelectedShot(null)}
        setShots={setShots}
        shots={shots}
      />
    )}
  </>;
}