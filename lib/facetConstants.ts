// lib/facetConstants.ts

// Definición de las claves internas (SLUGS) que usa la lógica del Ateneo.
// Estas claves NUNCA deben cambiar, son el "ADN" del sistema.
// Lo que cambia es la etiqueta visual (label) que definiremos en la BD.

export const FACET_SLUGS = {
  TYPOLOGY: 'typology',
  MATERIALITY: 'materiality',
  GEOGRAPHY: 'geography',
  CONCEPT: 'concept',
  AUTHOR: 'author',      // Usado por autoTagAuthor
  COLLECTION: 'collection', // Usado por autoTagBoard
  OBRA: 'obra',          // Usado por batchLinkObra y filtros
  FREE: 'free'           // Default para tags libres
} as const;

// Valores por defecto para la UI (Fallback)
// Se usan si la BD no responde o como base inicial.
export const DEFAULT_FACETS = [
  { name: FACET_SLUGS.TYPOLOGY, label: 'Tipología', icon: '🏛️', sort_order: 1 },
  { name: FACET_SLUGS.MATERIALITY, label: 'Materialidad', icon: '🧱', sort_order: 2 },
  { name: FACET_SLUGS.GEOGRAPHY, label: 'Geografía', icon: '🌎', sort_order: 3 },
  { name: FACET_SLUGS.CONCEPT, label: 'Concepto', icon: '💡', sort_order: 4 },
  { name: FACET_SLUGS.AUTHOR, label: 'Arquitecto/Estudio', icon: '👤', sort_order: 5 },
  { name: FACET_SLUGS.COLLECTION, label: 'Colección/Tablero', icon: '📁', sort_order: 6 },
  { name: FACET_SLUGS.OBRA, label: 'Obra / Proyecto', icon: '🏗️', sort_order: 7 },
  { name: FACET_SLUGS.FREE, label: 'Libre', icon: '🏷️', sort_order: 99 },
];