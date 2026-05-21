"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { UserRole } from "./roleUtils";

interface LabUser {
  id: string;
  email: string;
  username: string | null;
  role: UserRole; 
  actualRole: UserRole; // 🆕 El rol real
  avatar_url: string | null;
}

const AuthContext = createContext<{ 
  session: Session | null, 
  user: LabUser | null,
  loading: boolean,
  updateUsername: (newUsername: string) => void,
  isAdminMode: boolean, // 🆕 Estado del switch
  toggleAdminMode: () => void // 🆕 Función del switch
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
  const [rawProfile, setRawProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(true); // 🆕 Por defecto activado

  // 🆕 Cargar preferencia del localStorage al iniciar
  useEffect(() => {
    const savedMode = localStorage.getItem('aal-admin-mode');
    if (savedMode === 'false') setIsAdminMode(false);
  }, []);

  const fetchProfile = async (supabaseUser: User) => {
    const { data } = await supabase.from('profiles').select('username, role, avatar_url').eq('id', supabaseUser.id).single();
    setRawProfile(data); // Guardamos el perfil crudo
  };

  const updateUsername = (newUsername: string) => {
    setRawProfile((prev: any) => prev ? { ...prev, username: newUsername } : null);
  };

  // 🆕 EL SWITCH: Cambia el estado y lo guarda en localStorage
  const toggleAdminMode = () => {
    setIsAdminMode(prev => {
      const next = !prev;
      localStorage.setItem('aal-admin-mode', String(next));
      return next;
    });
  };

  // 🆕 DERIVACIÓN MÁGICA: Calcula el usuario en tiempo real según el switch
  const user = useMemo(() => {
    if (!session?.user) return null;
    
    const rawRole = (rawProfile?.role as UserRole) || 'subscriber';
    
    // Si es admin, pero el switch está apagado, se comporta como member
    const effectiveRole = (rawRole === 'admin' || rawRole === 'superadmin') && !isAdminMode 
                         ? 'member' 
                         : rawRole;

    const googleAvatar = session.user.user_metadata?.avatar_url;
    let avatarUrl = rawProfile?.avatar_url || googleAvatar || null;

    return {
      id: session.user.id,
      email: session.user.email || "",
      username: rawProfile?.username || null,
      role: effectiveRole, // La app ve este rol
      actualRole: rawRole, // El switch ve este rol
      avatar_url: avatarUrl
    };
  }, [session, rawProfile, isAdminMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setRawProfile(null);
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
        setRawProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, updateUsername, isAdminMode, toggleAdminMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);