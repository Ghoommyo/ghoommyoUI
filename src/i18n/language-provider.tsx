import { getLocales } from 'expo-localization';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { storage } from '@/auth/storage';

import { isLanguage, pickLanguage, type Language } from './languages';
import { setCurrentLanguage, translate, type Translate } from './translate';

/** The device's choice (guests, and before login). The account's choice is applied at sign-in. */
export const LANGUAGE_KEY = 'ghoomyo.language';

interface LanguageContextValue {
  language: Language;
  t: Translate;
  /** Switches the screens at once and remembers the choice on this device (not on the account). */
  setLanguage(language: Language): void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** The stored choice, else the phone's language (Hindi or Marathi if it's one of them), else English. */
export async function readLanguage(): Promise<Language> {
  const stored = await storage.get(LANGUAGE_KEY).catch(() => null);
  return isLanguage(stored) ? stored : pickLanguage(getLocales().map((locale) => locale.languageCode ?? ''));
}

/** Renders nothing until the language is known (the splash screen is still up), so nothing flashes in English. */
export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setState] = useState<Language | null>(null);

  useEffect(() => {
    readLanguage().then((initial) => {
      setCurrentLanguage(initial);
      setState(initial);
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setCurrentLanguage(next);
    setState(next);
    storage.set(LANGUAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue | null>(
    () =>
      language && {
        language,
        setLanguage,
        t: (key, vars) => translate(language, key, vars),
      },
    [language, setLanguage],
  );
  if (!value) return null;
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

/** `t('key', vars)` in the chosen language, plus the language itself. */
export function useT() {
  const value = use(LanguageContext);
  if (!value) throw new Error('useT must be used inside <LanguageProvider>');
  return value;
}
