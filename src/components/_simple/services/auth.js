import api from "./api";

export const authService = {
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  changePassword: (data) =>
    api.put("/auth/change-password", data).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
};

// # Full logout helper (call API + clear token + redirect)
export async function doLogout() {
  try {
    await authService.logout();
  } catch {
    // ignore network errors, we still want to log out locally
  }
  localStorage.removeItem("token");
  delete api.defaults.headers.common["Authorization"];
  window.location.href = "/login";
}

export default authService;
