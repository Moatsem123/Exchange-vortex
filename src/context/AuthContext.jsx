import { createContext, useContext, useEffect, useState, useCallback } from "react";
import authService, { doLogout } from "../services/auth";
import { setAuthToken } from "../services/api";
import usersPermissionsService from "../services/usersPermissions";

const AuthContext = createContext(null);

function getRoleKeys(user) {
  const keys = [];

  function collectRole(role) {
    if (!role) return;

    if (typeof role === "string") {
      keys.push(role);
      return;
    }

    if (typeof role === "object") {
      keys.push(role.name, role.slug, role.key, role.code, role.label);
    }
  }

  collectRole(user?.role);

  if (Array.isArray(user?.roles)) {
    user.roles.forEach(collectRole);
  }

  return keys.filter(Boolean).map((value) => String(value).toLowerCase());
}

function getPermissionKeys(user) {
  const keys = [];

  function collect(value) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === "string") {
      keys.push(value);
      return;
    }

    if (typeof value === "object") {
      keys.push(value.name, value.slug, value.key, value.code);

      if (Array.isArray(value.permissions)) {
        collect(value.permissions);
      }
    }
  }

  collect(user?.permissions);
  collect(user?.role?.permissions);
  collect(user?.roles);

  return keys.filter(Boolean).map((value) => String(value));
}

function unwrapData(res) {
  return res?.data || res;
}

async function loadFullUser() {
  const meRes = await authService.me();
  const me = unwrapData(meRes);

  if (!me?.id) return me;

  try {
    const fullUserRes = await usersPermissionsService.users.show(me.id);
    const fullUser = unwrapData(fullUserRes);

    return {
      ...me,
      ...fullUser,
      roles: fullUser?.roles || me?.roles || [],
      permissions: fullUser?.permissions || me?.permissions || [],
      vault: fullUser?.vault || me?.vault || null,
    };
  } catch {
    return me;
  }
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
      const fullUser = await loadFullUser();

      setUser(fullUser);
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
  const permissions = getPermissionKeys(user);

  const isAdmin =
    user?.is_admin === true ||
    user?.is_owner === true ||
    user?.email === "owner@exchange.com" ||
    roleKeys.includes("owner") ||
    roleKeys.includes("admin") ||
    roleKeys.includes("super-admin") ||
    roleKeys.includes("super_admin") ||
    roleKeys.includes("مالك");

  function hasPermission(required = []) {
    if (isAdmin) return true;
    if (!required || required.length === 0) return true;
    return required.some((permission) => permissions.includes(permission));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        bootstrapping,
        isAdmin,
        permissions,
        roleKeys,
        hasPermission,
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