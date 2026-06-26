import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PublicUser } from '@ai-image/shared';
import { fetchMe, getAuthToken, loginUser, registerUser, setAuthToken } from '../lib/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the saved token.
  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((u) => {
        if (!u) setAuthToken(null);
        setUser(u);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await loginUser({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
  }

  async function register(email: string, password: string) {
    const res = await registerUser({ email, password });
    setAuthToken(res.token);
    setUser(res.user);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  // Re-fetch the profile (e.g. to refresh the token balance).
  async function refresh() {
    if (!getAuthToken()) return;
    setUser(await fetchMe());
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
