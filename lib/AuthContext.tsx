"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { UserWithRole } from "./roleUtils";
import { User } from "@supabase/supabase-js";

const AuthContext = createContext<{ 
  user: UserWithRole | null, 
  loading: boolean,
  followingOnly: boolean,
  toggleFollowingFilter: () => void,
  updateUserContext: (updates: Partial<UserWithRole>) => void
}>({ 
  user: null, 
  loading: true,
  followingOnly: false,
  toggleFollowingFilter: () => {},
  updateUserContext: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingOnly, setFollowingOnly] = useState(false);

  const toggleFollowingFilter = () => setFollowingOnly(prev => !prev);

  const updateUserContext = (updates: Partial<UserWithRole>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const fetchProfileAndSetAdmin = async (supabaseUser: User) => {
    try {
      const userId = supabaseUser.id;
      const userEmail = supabaseUser.email;

      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;

      const googleAvatar = supabaseUser.user_metadata?.avatar_url;
      let avatarUrl = profile?.avatar_url || googleAvatar || null;
      if (profile && !profile.avatar_url && googleAvatar) {
           await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId);
           avatarUrl = googleAvatar; 
      }

      if (profile && userEmail === 'eastwood.seal@gmail.com' && profile.role !== 'superadmin') {
          await supabase.from('profiles').update({ role: 'superadmin', promoted_by: userId, promoted_at: new Date().toISOString() }).eq('id', userId);
          try { await supabase.from('role_promotions').insert({ user_id: userId, promoted_by: userId, old_role: profile.role || 'subscriber', new_role: 'superadmin', notes: 'Auto-verified' }); } catch (e) {}
          profile.role = 'superadmin';
      }

      if (profile) {
        const newUserData = { id: profile.id, email: userEmail ?? "", username: profile.username, role: profile.role, created_at: profile.created_at, promoted_by: profile.promoted_by, promoted_at: profile.promoted_at, avatar_url: avatarUrl };
        
        // CORTAFUEGOS: Solo actualiza si cambió el dato real
        setUser(prev => {
          if (prev && prev.id === newUserData.id && prev.username === newUserData.username && prev.role === newUserData.role && prev.avatar_url === newUserData.avatar_url) {
            return prev; 
          }
          return newUserData; 
        });

      } else { setUser(null); }

    } catch (err) {
      console.error("Error en fetchProfile:", err);
    }
  };

  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { await fetchProfileAndSetAdmin(session.user); } 
      else { setUser(null); }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };
  getSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) { 
          await fetchProfileAndSetAdmin(session.user); 
        } else { 
          setUser(null); 
        }
      } catch (err) { 
        console.error("Error en AuthStateChange:", err); 
      } finally { 
        setLoading(false); 
      }
  });

  return (
    <AuthContext.Provider value={{ user, loading, followingOnly, toggleFollowingFilter, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);