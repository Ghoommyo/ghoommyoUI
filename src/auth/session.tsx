import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { api } from '@/api';
import { setAuthToken } from '@/api/client';
import { storage } from '@/auth/storage';
import { useT } from '@/i18n/language-provider';
import type { Session } from '@/types/domain';

const SESSION_KEY = 'ghoomyo.session';
const INTRO_KEY = 'ghoomyo.introSeen';

interface SessionContextValue {
  session: Session | null;
  /** True until the stored session and intro flag have been read. */
  isLoading: boolean;
  hasSeenIntro: boolean;
  signIn(session: Session): Promise<void>;
  signOut(): Promise<void>;
  markIntroSeen(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { language, setLanguage } = useT();

  useEffect(() => {
    Promise.all([storage.get(SESSION_KEY), storage.get(INTRO_KEY)])
      .then(([stored, intro]) => {
        setHasSeenIntro(intro === '1');
        if (!stored) return;
        const restored = JSON.parse(stored) as Session;
        setAuthToken(restored.token);
        setSession(restored);
      })
      .catch(() => storage.remove(SESSION_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const value: SessionContextValue = {
    session,
    isLoading,
    hasSeenIntro,
    async signIn(next) {
      setAuthToken(next.token);
      setSession(next);
      // The account's language wins; an account without one takes the language in use now.
      if (next.language) setLanguage(next.language);
      else api.setLanguage(language).catch(() => {});
      await storage.set(SESSION_KEY, JSON.stringify(next));
    },
    async signOut() {
      setAuthToken(null);
      setSession(null);
      await storage.remove(SESSION_KEY);
    },
    async markIntroSeen() {
      setHasSeenIntro(true);
      await storage.set(INTRO_KEY, '1');
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
