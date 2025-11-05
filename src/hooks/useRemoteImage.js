import { useEffect, useState } from "react";
import { useLoading } from "../../context/LoadingContext";

export function useRemoteImage(localFirstKey, remoteFetcher, fallback = "", deps = []) {
  const { startLoading, stopLoading } = useLoading();
  const [url, setUrl] = useState(() => localStorage.getItem(localFirstKey) || fallback);

  useEffect(() => {
    let alive = true;
    (async () => {
      startLoading();
      try {
        const fresh = await remoteFetcher();
        if (alive && fresh) {
          setUrl(fresh);
          localStorage.setItem(localFirstKey, fresh);
        }
      } finally {
        stopLoading();
      }
    })();
    return () => { alive = false; };
    // important: NU punem remoteFetcher aici ca dependență
  }, [localFirstKey, startLoading, stopLoading, ...deps]);

  return url;
}
