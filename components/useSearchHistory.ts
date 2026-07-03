'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Product } from '@/components/useScraper';

export interface HistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  bestPrice?: number;
  bestSource?: string;
  pinned?: boolean;
  savedProducts?: Product[];
}

const STORAGE_KEY = 'qarinha.history';
const MERGED_FLAG_KEY = 'qarinha.merged';
const MAX_ENTRIES = 50;

function readStore(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

function sameSavedProducts(
  a: HistoryEntry['savedProducts'],
  b: HistoryEntry['savedProducts']
): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i].url !== bb[i].url) return false;
  }
  return true;
}

function sameEntries(a: HistoryEntry[], b: HistoryEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.query !== y.query ||
      x.timestamp !== y.timestamp ||
      x.resultCount !== y.resultCount ||
      x.bestPrice !== y.bestPrice ||
      x.bestSource !== y.bestSource ||
      !!x.pinned !== !!y.pinned ||
      !sameSavedProducts(x.savedProducts, y.savedProducts)
    ) {
      return false;
    }
  }
  return true;
}

export function useSearchHistory() {
  const { status } = useSession();
  const isAuthed = status === 'authenticated';
  const [entries, setEntries] = useState<HistoryEntry[]>(() => readStore());
  const [hydrated, setHydrated] = useState(true);
  const mergeInFlight = useRef(false);
  void setHydrated;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = readStore();
        setEntries((prev) => (sameEntries(prev, next) ? prev : next));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // When user signs in: pull server history and merge any guest local entries
  useEffect(() => {
    if (!isAuthed || !hydrated || mergeInFlight.current) return;
    mergeInFlight.current = true;

    (async () => {
      try {
        const local = readStore();
        const alreadyMerged =
          window.localStorage.getItem(MERGED_FLAG_KEY) === '1';

        if (local.length > 0 && !alreadyMerged) {
          await fetch('/api/history/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: local }),
          }).catch(() => null);
          window.localStorage.setItem(MERGED_FLAG_KEY, '1');
        }

        const res = await fetch('/api/history', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.entries)) {
            setEntries(data.entries);
            writeStore(data.entries);
          }
        }
      } finally {
        mergeInFlight.current = false;
      }
    })();
  }, [isAuthed, hydrated]);

  // On sign-out, clear the merged flag so re-signing-in merges again if needed
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.localStorage.removeItem(MERGED_FLAG_KEY);
    }
  }, [status]);

  const add = useCallback(
    async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
      const localId = `${entry.query}-${Date.now()}`;
      const ts = Date.now();
      const next: HistoryEntry = { id: localId, timestamp: ts, ...entry };

      setEntries((prev) => {
        const deduped = prev.filter(
          (p) => !(p.query.toLowerCase() === next.query.toLowerCase() && !p.pinned)
        );
        const merged = [next, ...deduped].slice(0, MAX_ENTRIES);
        writeStore(merged);
        return merged;
      });

      if (isAuthed) {
        try {
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
        } catch {
          /* best-effort sync */
        }
      }
    },
    [isAuthed]
  );

  const remove = useCallback(
    async (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((p) => p.id !== id);
        writeStore(next);
        return next;
      });
      // Server uses ObjectId for entries fetched via /api/history; skip remote delete
      // (the next GET refresh will reconcile). A dedicated DELETE-by-id route can be added later.
    },
    []
  );

  const clear = useCallback(async () => {
    setEntries((prev) => {
      const next = prev.filter((p) => p.pinned);
      writeStore(next);
      return next;
    });
    if (isAuthed) {
      await fetch('/api/history', { method: 'DELETE' }).catch(() => null);
    }
  }, [isAuthed]);

  const togglePin = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, pinned: !p.pinned } : p
      );
      writeStore(next);
      return next;
    });
  }, []);

  const attachProducts = useCallback((id: string, products: Product[]) => {
    setEntries((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, savedProducts: products } : p
      );
      writeStore(next);
      return next;
    });
  }, []);

  return {
    entries,
    hydrated,
    isAuthed,
    add,
    remove,
    clear,
    togglePin,
    attachProducts,
  };
}