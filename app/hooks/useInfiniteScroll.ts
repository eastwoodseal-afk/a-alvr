import { useEffect, useRef } from 'react';

export function useInfiniteScroll(callback: () => void, isFetching: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // El observador: Cuando el div centinela entra en pantalla, dispara el callback
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) {
          callback();
        }
      },
      { threshold: 1.0 } // Se ejecuta solo cuando el div es 100% visible
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [callback, isFetching]);

  // Devolvemos la ref para que el componente lo coloque al final de su lista
  return sentinelRef;
}