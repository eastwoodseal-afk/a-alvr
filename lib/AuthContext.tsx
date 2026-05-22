"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { UserRole } from "./roleUtils";

interface LabUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole; // El rol efectivo
  actualRole: UserRole; // 🆕 El rol real
  avatar_url: string | null;
}

const AuthContext = createContext<{ 
  session: Session | null, 
  user: LabUser | null,
  loading: boolean,
  updateUsername: (newUsername: string) => void,
  isAdminMode: boolean, // 🆕
  toggleAdminMode: () => void // 🆕
}>({ 
  session: null, 
  user: null,
  loading: true,
  updateUsername: () => {},
  isAdminMode: true,
  toggleAdminMode: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<LabUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🆕 Leemos del localStorage de forma síncrona al iniciar
  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aal-admin-mode') !== 'false';
    }
    return true;
  });

  const fetchProfile = async (supabaseUser: User, adminMode: boolean) => {
    const { data } = await supabase.from('profiles').select('username, role, avatar_url').eq('id', supabaseUser.id).single();
    
    const googleAvatar = supabaseUser.user_metadata?.avatar_url;
    let avatarUrl = data?.avatar_url || googleAvatar || null;

    if (data && !data.avatar_url && googleAvatar) {
       await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', supabaseUser.id);
       avatarUrl = googleAvatar; 
    }

    const rawRole = (data?.role as UserRole) || 'subscriber';
    // 🆕 Lógica de enmascaramiento
    const effectiveRole = (rawRole === 'admin' || rawRole === 'superadmin') && !adminMode 
                         ? 'member' 
                         : rawRole;

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      username: data?.username || null,
      role: effectiveRole,
      actualRole: rawRole, // 🆕 Guardamos el real
      avatar_url: avatarUrl
    });
  };

  const updateUsername = (newUsername: string) => {
    setUser(prev => prev ? { ...prev, username: newUsername } : null);
  };

  // 🆕 EL SWITCH
  const toggleAdminMode = () => {
    setIsAdminMode(prev => {
      const next = !prev;
      localStorage.setItem('aal-admin-mode', String(next));
      
      // Actualizar el rol en tiempo real al hacer clic
      if (user) {
        const rawRole = user.actualRole;
        const effectiveRole = (rawRole === 'admin' || rawRole === 'superadmin') && !next 
                             ? 'member' 
                             : rawRole;
        setUser(prevUser => prevUser ? { ...prevUser, role: effectiveRole } : null);
      }
      
      return next;
    });
  };

  useEffect(() => {
    // Carga inicial (Como el original)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user, isAdminMode);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listener (Como el original, sin romper TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(prev => {
        if (prev?.access_token === session?.access_token) return prev; // Cortafuegos
        return session;
      });

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user, isAdminMode);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Array vacío intencional, como el original

  return (
    <AuthContext.Provider value={{ session, user, loading, updateUsername, isAdminMode, toggleAdminMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);