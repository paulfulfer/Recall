import { useEffect, useRef, useState } from 'react';

export interface PendingDelete<T> {
  item: T;
  message: string;
}

const DEFAULT_UNDO_WINDOW_MS = 5000;

// Shared swipe-to-delete + undo pattern (spec polish phase 3, app-wide): a delete is staged
// rather than applied immediately — the row disappears right away, but the actual commit to
// Firestore is deferred until the undo window elapses, so tapping Undo cancels it for free.
// One caller-visible "pending" slot at a time: swiping a second item while one is still
// pending commits the first immediately rather than queuing multiple undos.
export function usePendingDelete<T>(commit: (item: T) => void, windowMs = DEFAULT_UNDO_WINDOW_MS) {
  const [pending, setPending] = useState<PendingDelete<T> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror `pending`/`commit` in refs so the unmount effect below (which only runs once,
  // per its empty deps) reads the latest values instead of the ones from its first render.
  const pendingRef = useRef<PendingDelete<T> | null>(null);
  const commitRef = useRef(commit);
  pendingRef.current = pending;
  commitRef.current = commit;

  // A pending delete still waiting out its undo window when the screen unmounts should
  // still land — otherwise navigating away right after a swipe would silently keep the item.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingRef.current) commitRef.current(pendingRef.current.item);
    },
    [],
  );

  function requestDelete(item: T, message: string) {
    if (timer.current) clearTimeout(timer.current);
    if (pendingRef.current) commitRef.current(pendingRef.current.item);
    setPending({ item, message });
    timer.current = setTimeout(() => {
      commitRef.current(item);
      setPending(null);
      timer.current = null;
    }, windowMs);
  }

  function undo() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(null);
  }

  return { pending, requestDelete, undo };
}
