'use client';

import { useCallback, useEffect, useState } from 'react';
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

function writeStore(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

export function useSearchHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial hydration from localStorage on client
    setEntries(readStore());
     
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = readStore();
        setEntries((prev) => (sameEntries(prev, next) ? prev : next));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) => {
      const id = `${entry.query}-${Date.now()}`;
      const next: HistoryEntry = {
        id,
        timestamp: Date.now(),
        ...entry,
      };
      const deduped = prev.filter(
        (p) => !(p.query.toLowerCase() === next.query.toLowerCase() && !p.pinned)
      );
      const merged = [next, ...deduped].slice(0, MAX_ENTRIES);
      writeStore(merged);
      return merged;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeStore(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries((prev) => {
      const next = prev.filter((p) => p.pinned);
      writeStore(next);
      return next;
    });
  }, []);

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

  return { entries, hydrated, add, remove, clear, togglePin, attachProducts };
}
