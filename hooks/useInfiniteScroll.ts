import { useEffect, useRef } from 'react';

export function useInfiniteScroll(callback: () => void, isFetching: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) {
          callback();
        }
      },
      { threshold: 0.1 } // Cambiado a 0.1 para que dispare más fácil
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [callback, isFetching]);

  return sentinelRef;
}