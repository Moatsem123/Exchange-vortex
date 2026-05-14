import { createContext, useCallback, useContext, useEffect, useState } from "react";

import * as authService from "../services/auth.service";
import { getAuthToken } from "../services/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  /**
   * On first mount, if a token exists in storage, fetch the current user.
   * If the token is invalid the interceptor will clear it and redirect.
   */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getAuthToken();
      if (!token) {
        setBootstrapping(false);
        return;
      }

      try {
        const u = await authService.me();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const payload = await authService.login(credentials);
    // payload shape from Laravel: { token, user } (after our service unwrapping)
    const u = payload?.user ?? (await authService.me());
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isLoggedIn: !!user,
    bootstrapping,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
