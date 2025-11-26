"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { UserWithRole } from "./roleUtils";
const AuthContext = createContext<{ user: UserWithRole | null, loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserWithRole | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// 1. Obtener la sesión actual al cargar
		const getSession = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (session?.user) {
				// Fetch profile from Supabase
				const { data: profile } = await supabase
					.from('profiles')
					.select('*')
					.eq('id', session.user.id)
					.single();
				if (profile) {
					setUser({
						id: profile.id,
						email: session.user.email ?? "",
						username: profile.username,
						role: profile.role,
						created_at: profile.created_at,
						promoted_by: profile.promoted_by,
						promoted_at: profile.promoted_at,
					});
				}
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
					const { data: profile } = await supabase
						.from('profiles')
						.select('*')
						.eq('id', session.user.id)
						.single();
					if (profile) {
						setUser({
							id: profile.id,
							email: session.user.email ?? "",
							username: profile.username,
							role: profile.role,
							created_at: profile.created_at,
							promoted_by: profile.promoted_by,
							promoted_at: profile.promoted_at,
						});
					}
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
