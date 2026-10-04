"use client";
import { useEffect, useState, useCallback } from "react";
export function useApi<T>(url: string | null, interval = 30000, initial?: T) {
  const [resource, setResource] = useState<{
      url: string | null;
      value: T | undefined;
    }>({ url, value: initial }),
    [loading, setLoading] = useState(!initial),
    [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((x) => x + 1), []);
  useEffect(() => {
    if (!url) return;
    let stopped = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout>;
    setLoading(true);
    setResource((previous) =>
      previous.url === url ? previous : { url, value: initial },
    );
    async function update() {
      if (document.hidden) {
        timer = setTimeout(update, interval);
        return;
      }
      controller = new AbortController();
      try {
        const r = await fetch(url!, { signal: controller.signal });
        if (!r.ok) throw new Error("API indisponível");
        const x = await r.json();
        if (!stopped) {
          setResource({ url, value: x });
          setError(false);
        }
      } catch (e) {
        if (!stopped && !(e instanceof DOMException && e.name === "AbortError"))
          setError(true);
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(update, interval);
        }
      }
    }
    void update();
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(timer);
    };
  }, [url, interval, tick, initial]);
  return {
    data: resource.url === url ? resource.value : initial,
    loading: resource.url === url ? loading : !initial,
    error: resource.url === url ? error : false,
    refresh,
  };
}
