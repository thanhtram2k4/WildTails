'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken, refreshAccessToken, authFetch } from '@/lib/api';

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** expiresAt epoch in ms, or null if unknown */
  expiresAt: number | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

interface AuthContextValue extends AuthState {
  signIn: (accessToken: string, expiresIn: number, user: AuthUser) => void;
  signOut: () => Promise<void>;
  /** Trigger a silent refresh — returns the new token or null. */
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    expiresAt: null,
    status: 'loading',
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresAt: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const msUntilExpiry = expiresAt - Date.now();
    // Refresh 60 seconds before expiry, minimum 5 seconds from now.
    const delay = Math.max(msUntilExpiry - 60_000, 5_000);
    refreshTimerRef.current = setTimeout(() => {
      void refreshAccessToken().then((token) => {
        if (!token) {
          setState({
            user: null,
            accessToken: null,
            expiresAt: null,
            status: 'unauthenticated',
          });
        }
      });
    }, delay);
  }, []);

  const signIn = useCallback(
    (token: string, expiresIn: number, user: AuthUser) => {
      setAccessToken(token);
      const expiresAt = Date.now() + expiresIn * 1_000;
      setState({ user, accessToken: token, expiresAt, status: 'authenticated' });
      scheduleRefresh(expiresAt);
    },
    [scheduleRefresh],
  );

  const signOut = useCallback(async () => {
    const currentToken = state.accessToken;
    setState({
      user: null,
      accessToken: null,
      expiresAt: null,
      status: 'unauthenticated',
    });
    setAccessToken(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Best-effort backend logout.
    try {
      await authFetch('/api/auth/logout', {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      });
    } catch {
      // Ignore — cookie was already cleared.
    }
  }, [state.accessToken]);

  const refresh = useCallback(async (): Promise<string | null> => {
    const token = await refreshAccessToken();
    if (token) {
      const payload = parseJwtPayload(token);
      const exp = typeof payload?.['exp'] === 'number' ? payload['exp'] : null;
      const expiresAt = exp ? exp * 1_000 : Date.now() + 900_000;
      setState((prev) => ({
        ...prev,
        accessToken: token,
        expiresAt,
        status: 'authenticated',
      }));
      scheduleRefresh(expiresAt);
    } else {
      setState({
        user: null,
        accessToken: null,
        expiresAt: null,
        status: 'unauthenticated',
      });
    }
    return token;
  }, [scheduleRefresh]);

  // On mount: attempt a silent refresh to restore session from the HttpOnly cookie.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (token) {
        const payload = parseJwtPayload(token);
        const exp = typeof payload?.['exp'] === 'number' ? payload['exp'] : null;
        const expiresAt = exp ? exp * 1_000 : Date.now() + 900_000;
        const userId = typeof payload?.['sub'] === 'string' ? payload['sub'] : '';
        const email = typeof payload?.['email'] === 'string' ? payload['email'] : '';
        const displayName =
          typeof payload?.['displayName'] === 'string' ? payload['displayName'] : '';
        signIn(token, (expiresAt - Date.now()) / 1_000, {
          userId,
          email,
          displayName,
        });
      } else {
        setState({
          user: null,
          accessToken: null,
          expiresAt: null,
          status: 'unauthenticated',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signIn]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
