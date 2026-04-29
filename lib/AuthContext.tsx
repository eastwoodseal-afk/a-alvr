"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { UserWithRole } from "./roleUtils";
import { User } from "@supabase/supabase-js";

// Añadimos followingOnly al tipo del contexto
const AuthContext = createContext<{ 
  user: UserWithRole | null, 
  loading: boolean,
  followingOnly: boolean, // NUEVO
  toggleFollowingFilter: () => void // NUEVO
}>({ 
  user: null, 
  loading: true,
  followingOnly: false,
  toggleFollowingFilter: () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- NUEVO: ESTADO DEL FILTRO ---
  const [followingOnly, setFollowingOnly] = useState(false);

  const toggleFollowingFilter = () => {
    setFollowingOnly(prev => !prev);
  };
  // -------------------------------

  useEffect(() => {
    const fetchProfileAndSetAdmin = async (supabaseUser: User) => {
      const userId = supabaseUser.id;
      const userEmail = supabaseUser.email;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const googleAvatar = supabaseUser.user_metadata?.avatar_url;
      let avatarUrl = profile?.avatar_url || googleAvatar || null;

      if (profile && !profile.avatar_url && googleAvatar) {
         await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId);
         avatarUrl = googleAvatar; 
      }

      if (profile) {
        if (userEmail === 'eastwood.seal@gmail.com') {
          await supabase.from('profiles').update({ role: 'superadmin', promoted_by: userId, promoted_at: new Date().toISOString() }).eq('id', userId);
          try {
            await supabase.from('role_promotions').insert({ user_id: userId, promoted_by: userId, old_role: profile.role || 'subscriber', new_role: 'superadmin', notes: 'Auto-verified by AuthContext', created_at: new Date().toISOString() });
          } catch (err) { console.warn("Log de promoción omitido."); }
          profile.role = 'superadmin';
        }

        setUser({ id: profile.id, email: userEmail ?? "", username: profile.username, role: profile.role, created_at: profile.created_at, promoted_by: profile.promoted_by, promoted_at: profile.promoted_at, avatar_url: avatarUrl });
      }
    };

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { await fetchProfileAndSetAdmin(session.user); } 
      else { setUser(null); }
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) { await fetchProfileAndSetAdmin(session.user); } 
      else { setUser(null); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, followingOnly, toggleFollowingFilter }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);