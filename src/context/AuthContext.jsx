import { createContext, useContext, useEffect, useState, useCallback } from "react";
import authService, { doLogout } from "../services/auth";
import { setAuthToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [bootstrapping, setBootstrapping] = useState(!!localStorage.getItem("token"));

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setBootstrapping(false);
      return;
    }
    try {
      const res = await authService.me();
      setUser(res?.data || res);
      setIsLoggedIn(true);
    } catch {
      setAuthToken(null);
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function login({ email, password }) {
    const res = await authService.login({ email, password });
    const token = res?.data?.token || res?.token;
    if (!token) throw new Error("لم يتم استلام التوكن من الخادم");
    setAuthToken(token);
    setIsLoggedIn(true);
    setBootstrapping(true);
    await loadMe();
    return res;
  }

  function logout() {
    setUser(null);
    setIsLoggedIn(false);
    doLogout();
  }

  const isAdmin = user?.role === "admin" || user?.is_admin === true ||
    (Array.isArray(user?.roles) && user.roles.some((r) => r === "admin" || r?.name === "admin"));

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, bootstrapping, isAdmin, login, logout, refreshMe: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}