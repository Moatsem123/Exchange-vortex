import { createContext, useContext, useEffect, useState, useCallback } from "react";
import authService, { doLogout } from "../services/auth";
import { setAuthToken } from "../services/api";

const AuthContext = createContext(null);

function getRoleKeys(user) {
  const keys = [];

  if (typeof user?.role === "string") keys.push(user.role);

  if (user?.role && typeof user.role === "object") {
    keys.push(user.role.name, user.role.slug, user.role.key, user.role.code);
  }

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === "string") keys.push(role);
      if (role && typeof role === "object") {
        keys.push(role.name, role.slug, role.key, role.code);
      }
    });
  }

  return keys.filter(Boolean).map((v) => String(v).toLowerCase());
}

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

  useEffect(() => {
    loadMe();
  }, [loadMe]);

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

  const roleKeys = getRoleKeys(user);

  const isAdmin =
    user?.is_admin === true ||
    user?.is_owner === true ||
    roleKeys.includes("admin") ||
    roleKeys.includes("owner") ||
    roleKeys.includes("super-admin") ||
    roleKeys.includes("super_admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        bootstrapping,
        isAdmin,
        login,
        logout,
        refreshMe: loadMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}