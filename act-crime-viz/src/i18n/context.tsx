import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { districtLabel, metricLabel } from "./metricLabels";
import type { Locale } from "./uiMessages";
import { uiMessages } from "./uiMessages";

const STORAGE_KEY = "act-crime-viz-locale";

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function interpolate(
  template: string,
  vars: Record<string, string> | undefined,
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string>) => string;
  tMetric: (key: string) => string;
  tDistrict: (key: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof localStorage === "undefined") return "zh";
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "en" ? "en" : "zh";
  });

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
    const tr = locale === "zh" ? uiMessages.zh : uiMessages.en;
    document.title = tr.documentTitle;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "zh" ? "zh-Hans" : "en";
    }
  }, []);

  const tree = locale === "zh" ? uiMessages.zh : uiMessages.en;

  const t = useCallback(
    (path: string, vars?: Record<string, string>) => {
      const raw = getByPath(tree, path);
      const s = typeof raw === "string" ? raw : path;
      return interpolate(s, vars);
    },
    [tree],
  );

  const tMetric = useCallback(
    (key: string) => metricLabel(locale, key),
    [locale],
  );

  const tDistrict = useCallback(
    (key: string) => districtLabel(locale, key),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tMetric, tDistrict }),
    [locale, setLocale, t, tMetric, tDistrict],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n must be used within I18nProvider");
  return v;
}
