import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const savedToken = localStorage.getItem("token");

if (savedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
}

api.interceptors.response.use(
  (response) => response,
  (err) => {
    const isLoginPage = window.location.pathname.includes("/login");
    const isLogoutRequest = err.config?.url?.includes("/auth/logout");

    if (err.response?.status === 401 && !isLoginPage && !isLogoutRequest) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;
      window.location.replace("/login");
    }

    return Promise.reject(err);
  }
);

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  localStorage.removeItem("token");
  delete api.defaults.headers.common.Authorization;
}

export default api;