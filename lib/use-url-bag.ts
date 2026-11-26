import { useCallback, useEffect, useRef } from "react";

/** Creates object URLs and releases all of them on clear() or when the component goes away. */
export function useUrlBag() {
  const urls = useRef<string[]>([]);

  const add = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  }, []);

  const clear = useCallback(() => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  return { add, clear };
}