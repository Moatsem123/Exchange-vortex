import api, { setAuthToken } from "./api";

const authService = {
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  changePassword: (data) => api.put("/auth/change-password", data).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
};

export async function doLogout() {
  try {
    await authService.logout();
  } catch {}

  setAuthToken(null);
}

export default authService;