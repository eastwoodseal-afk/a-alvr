import { useEffect } from 'react';

export function useInfiniteScroll(callback: () => void, isFetching: boolean) {
  useEffect(() => {
    const handleScroll = () => {
      if (isFetching) return;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;
      
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        callback();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, isFetching]);
}