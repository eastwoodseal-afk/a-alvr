"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { DEFAULT_FACETS } from './facetConstants'; // Respaldo de emergencia

// Estructura de una Faceta
export interface FacetConfig {
  name: string; // Slug (clave interna)
  label: string; // Título visible
  icon: string; // Emoji
  sort_order: number;
}

// Forma del Contexto
interface FacetContextType {
  facets: FacetConfig[];
  loading: boolean;
  refreshFacets: () => Promise<void>; // Para recargar tras cambios en Admin
}

const FacetContext = createContext<FacetContextType>({
  facets: DEFAULT_FACETS,
  loading: true,
  refreshFacets: async () => {},
});

export function FacetProvider({ children }: { children: ReactNode }) {
  const [facets, setFacets] = useState<FacetConfig[]>(DEFAULT_FACETS);
  const [loading, setLoading] = useState(true);

  const fetchFacets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facets')
        .select('name, label, icon, sort_order')
        .order('sort_order');

      if (error) throw error;

      if (data && data.length > 0) {
        setFacets(data);
      } else {
        // Si la BD está vacía (ej: recién limpiada), usamos el respaldo
        setFacets(DEFAULT_FACETS);
      }
    } catch (err) {
      console.error("Error cargando facetas, usando respaldo estático:", err);
      setFacets(DEFAULT_FACETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacets();
  }, []);

  return (
    <FacetContext.Provider value={{ facets, loading, refreshFacets: fetchFacets }}>
      {children}
    </FacetContext.Provider>
  );
}

export const useFacets = () => useContext(FacetContext);