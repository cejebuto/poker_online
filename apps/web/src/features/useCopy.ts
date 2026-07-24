import { useCallback, useState } from 'react';

/**
 * Copy-to-clipboard with a transient "done" flag, keyed so a screen can have
 * several copy buttons (code, link, …) and only the one just pressed lights up.
 *
 * Extracted from the Lobby so the felt menu shares the exact same behavior
 * instead of re-implementing the try/catch/timeout dance.
 */
export function useCopy<K extends string = string>(resetMs = 1600): {
  copied: K | null;
  copy: (key: K, value: string) => Promise<void>;
} {
  const [copied, setCopied] = useState<K | null>(null);

  const copy = useCallback(
    async (key: K, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        window.setTimeout(() => setCopied((c) => (c === key ? null : c)), resetMs);
      } catch {
        /* clipboard may be blocked (insecure context / permissions); ignore. */
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
