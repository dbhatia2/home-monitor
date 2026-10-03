/**
 * Persisted search preferences and saved homes, backed by AsyncStorage and
 * shared across screens through React context.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PREFS, type Prefs } from "./types";

const PREFS_KEY = "home-monitor:prefs:v1";
const SAVED_KEY = "home-monitor:saved:v1";
const SEARCHES_KEY = "home-monitor:searches:v1";

export interface SavedSearch {
  id: string;
  name: string;
  prefs: Prefs;
  createdAt: string;
}

interface Store {
  /** Filters currently applied to the Deals list. */
  prefs: Prefs;
  setPrefs: (next: Prefs) => void;
  /** The user's saved default, restored on every launch. */
  savePrefsAsDefault: (next: Prefs) => Promise<void>;
  resetPrefs: () => void;

  savedIds: number[];
  toggleSaved: (id: number) => void;
  isSaved: (id: number) => boolean;

  savedSearches: SavedSearch[];
  saveSearch: (name: string, prefs: Prefs) => Promise<void>;
  loadSearch: (id: string) => void;
  deleteSearch: (id: string) => Promise<void>;

  /** False until AsyncStorage has been read, so screens can avoid flashing. */
  ready: boolean;
}

const StoreContext = createContext<Store | null>(null);

function mergePrefs(raw: unknown): Prefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  // Spread over the defaults so prefs saved by an older build still load when
  // new fields are added.
  return { ...DEFAULT_PREFS, ...(raw as Partial<Prefs>) };
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedPrefs, storedSaved, storedSearches] = await AsyncStorage.multiGet([
          PREFS_KEY,
          SAVED_KEY,
          SEARCHES_KEY,
        ]);
        if (cancelled) return;
        if (storedPrefs[1]) setPrefsState(mergePrefs(JSON.parse(storedPrefs[1])));
        if (storedSaved[1]) {
          const ids = JSON.parse(storedSaved[1]);
          if (Array.isArray(ids)) setSavedIds(ids.filter((n) => typeof n === "number"));
        }
        if (storedSearches[1]) {
          const searches = JSON.parse(storedSearches[1]);
          if (Array.isArray(searches)) setSavedSearches(searches);
        }
      } catch {
        // Corrupt or unreadable storage just falls back to defaults.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPrefs = useCallback((next: Prefs) => setPrefsState(next), []);

  const savePrefsAsDefault = useCallback(async (next: Prefs) => {
    setPrefsState(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }, []);

  const resetPrefs = useCallback(() => setPrefsState(DEFAULT_PREFS), []);

  const toggleSaved = useCallback((id: number) => {
    setSavedIds((current) => {
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [id, ...current];
      void AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSaved = useCallback((id: number) => savedIds.includes(id), [savedIds]);

  const saveSearch = useCallback(async (name: string, searchPrefs: Prefs) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      prefs: searchPrefs,
      createdAt: new Date().toISOString(),
    };
    setSavedSearches((current) => {
      const next = [...current, newSearch];
      void AsyncStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const loadSearch = useCallback((id: string) => {
    const search = savedSearches.find((s) => s.id === id);
    if (search) {
      setPrefsState(search.prefs);
    }
  }, [savedSearches]);

  const deleteSearch = useCallback(async (id: string) => {
    setSavedSearches((current) => {
      const next = current.filter((s) => s.id !== id);
      void AsyncStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      prefs,
      setPrefs,
      savePrefsAsDefault,
      resetPrefs,
      savedIds,
      toggleSaved,
      isSaved,
      savedSearches,
      saveSearch,
      loadSearch,
      deleteSearch,
      ready,
    }),
    [
      prefs,
      setPrefs,
      savePrefsAsDefault,
      resetPrefs,
      savedIds,
      toggleSaved,
      isSaved,
      savedSearches,
      saveSearch,
      loadSearch,
      deleteSearch,
      ready,
    ],
  );

  return createElement(StoreContext.Provider, { value }, children);
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <PrefsProvider>");
  return ctx;
}

/** Number of filters differing from the defaults, for the Filters button badge. */
export function activeFilterCount(prefs: Prefs): number {
  let n = 0;
  if (prefs.minBeds > 0) n++;
  if (prefs.minBaths > 0) n++;
  if (prefs.maxPrice) n++;
  if (prefs.minSqft) n++;
  if (prefs.builders.length) n++;
  if (!prefs.exclude55) n++;
  if (prefs.priceDropOnly) n++;
  if (prefs.mirOnly) n++;
  if (prefs.newOnly) n++;
  return n;
}
