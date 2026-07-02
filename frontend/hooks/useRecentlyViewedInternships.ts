import { useCallback, useEffect, useState } from "react";

export interface RecentlyViewedInternship {
  _id: string;
  title: string;
  company?: string;
  location?: string;
  logo?: string;
  viewedAt: number;
}

const STORAGE_KEY = "recentlyViewedInternships";
const MAX_ITEMS = 10;

function readFromStorage(): RecentlyViewedInternship[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedInternship[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
    // Failing silently keeps this a non-critical, additive feature.
  }
}

/**
 * Hook that manages a "Recently Viewed Internships" list backed by
 * localStorage. Entirely client-side; no backend involvement.
 */
export function useRecentlyViewedInternships() {
  const [items, setItems] = useState<RecentlyViewedInternship[]>([]);

  // Load once on mount (client-only).
  useEffect(() => {
    setItems(readFromStorage());
  }, []);

  // Keep in sync across tabs / windows.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(readFromStorage());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addRecentlyViewed = useCallback(
    (job: Omit<RecentlyViewedInternship, "viewedAt">) => {
      if (!job || !job._id) return;

      setItems((prev) => {
        const withoutCurrent = prev.filter((j) => j._id !== job._id);
        const next = [
          { ...job, viewedAt: Date.now() },
          ...withoutCurrent,
        ].slice(0, MAX_ITEMS);
        writeToStorage(next);
        return next;
      });
    },
    []
  );

  const clearRecentlyViewed = useCallback(() => {
    setItems([]);
    writeToStorage([]);
  }, []);

  return { items, addRecentlyViewed, clearRecentlyViewed };
}

export default useRecentlyViewedInternships;
