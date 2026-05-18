"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { UserRole } from "./roleUtils"; // NUEVO: Importamos el tipo estricto

interface LabUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole; // ACTUALIZADO: De 'string' a UserRole
  avatar_url: string | null;
}

const AuthContext = createContext<{ 
  session: Session | null, 
  user: LabUser | null,
  loading: boolean,
  updateUsername: (newUsername: string) => void
}>({ 
  session: null, 
  user: null,
  loading: true,
  updateUsername: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<LabUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (supabaseUser: User) => {
    const { data } = await supabase.from('profiles').select('username, role, avatar_url').eq('id', supabaseUser.id).single();
    
    const googleAvatar = supabaseUser.user_metadata?.avatar_url;
    let avatarUrl = data?.avatar_url || googleAvatar || null;

    if (data && !data.avatar_url && googleAvatar) {
       await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', supabaseUser.id);
       avatarUrl = googleAvatar; 
    }

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      username: data?.username || null,
      role: (data?.role as UserRole) || 'subscriber', // CASTEO SEGURO
      avatar_url: avatarUrl
    });
  };

  const updateUsername = (newUsername: string) => {
    setUser(prev => prev ? { ...prev, username: newUsername } : null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(prev => {
        if (prev?.access_token === session?.access_token) return prev;
        return session;
      });

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);