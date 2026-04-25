"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { UserWithRole } from "./roleUtils";

const AuthContext = createContext<{ user: UserWithRole | null, loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Función auxiliar para obtener perfil y asignar rol admin si corresponde
    const fetchProfileAndSetAdmin = async (userId: string, userEmail: string | undefined) => {
      // 1. Obtener perfil actual
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        // 2. LÓGICA DEL SUPERADMIN (Añadida aquí)
        // Si el email es el del admin y el rol no es superadmin (o queremos asegurar que lo tenga)
        if (userEmail === 'eastwood.seal@gmail.com') {
          // Actualizamos el perfil silenciosamente si es necesario
          // Nota: Esto se ejecutará en cada carga de sesión, lo que asegura que nunca pierdas el rol
          await supabase
            .from('profiles')
            .update({ 
              role: 'superadmin',
              promoted_by: userId,
              promoted_at: new Date().toISOString()
            })
            .eq('id', userId);
            
            // También registramos en el historial (upsert para evitar duplicados)
            await supabase
              .from('role_promotions')
              .upsert({
                user_id: userId,
                promoted_by: userId,
                old_role: profile.role || 'subscriber',
                new_role: 'superadmin',
                notes: 'Auto-verified by AuthContext',
                created_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });
          
          // Actualizamos el objeto profile local para reflejar el cambio inmediato
          profile.role = 'superadmin';
        }

        setUser({
          id: profile.id,
          email: userEmail ?? "",
          username: profile.username,
          role: profile.role,
          created_at: profile.created_at,
          promoted_by: profile.promoted_by,
          promoted_at: profile.promoted_at,
        });
      }
    };

    // 1. Obtener la sesión actual al cargar
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfileAndSetAdmin(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    getSession();

    // 2. Escuchar los cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] Evento de autenticación: ${event}`);
        
        if (session?.user) {
          await fetchProfileAndSetAdmin(session.user.id, session.user.email);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // 3. Limpiar la suscripción cuando el componente se desmonta
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);