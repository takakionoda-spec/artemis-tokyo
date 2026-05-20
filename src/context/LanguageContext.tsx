"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  ReactNode
} from "react";
import { dictionaries, isLang, type Dictionary, type Lang } from "@/lib/i18n";

type LanguageContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggle: () => void;
  dict: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "artemis-tokyo:lang";

/* =========================================================
   Lightweight external store for the language preference.
   This pattern lets us hydrate from localStorage / navigator
   on the client without setState-in-effect (React 19 rule).
   ========================================================= */
const listeners = new Set<() => void>();
let cachedLang: Lang | null = null;

const langStore = {
  getSnapshot(): Lang {
    if (cachedLang !== null) return cachedLang;
    if (typeof window === "undefined") return "en";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isLang(stored)) {
        cachedLang = stored;
        return stored;
      }
    } catch {
      // localStorage may be unavailable (private mode etc.)
    }
    const navLang = window.navigator?.language?.toLowerCase() ?? "";
    cachedLang = navLang.startsWith("ja") ? "ja" : "en";
    return cachedLang;
  },
  getServerSnapshot(): Lang {
    return "en";
  },
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
  set(next: Lang) {
    cachedLang = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
    listeners.forEach((l) => l());
  }
};

export function LanguageProvider({
  children,
  initialLang = "en"
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const lang = useSyncExternalStore(
    langStore.subscribe,
    langStore.getSnapshot,
    () => initialLang
  );

  // Sync <html lang> and body[data-lang] for CSS/A11y hooks
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.body.setAttribute("data-lang", lang);
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    langStore.set(next);
  }, []);

  const toggle = useCallback(() => {
    langStore.set(lang === "en" ? "ja" : "en");
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, dict: dictionaries[lang] }),
    [lang, setLang, toggle]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
