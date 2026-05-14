import axios from "axios";

/**
 * Base URL.
 * - In dev/prod set VITE_API_URL in your .env file:
 *     VITE_API_URL=http://cleargate-fx.test/api
 * - Falls back to "/api" so a Vite dev proxy can be used instead.
 */
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const TOKEN_KEY = "cleargate_token";

const http = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  // Sanctum (token mode) doesn't need credentials. If you switch to Sanctum
  // SPA / cookie mode, set this to true and configure CORS accordingly.
  withCredentials: false,
});

/* ---------------- Request interceptor ----------------
 * Attach the Bearer token automatically to every request.
 */
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------------- Response interceptor ----------------
 * Normalize errors so callers can show clean messages, and handle 401
 * (expired/invalid token) by clearing the local token + redirecting.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Build a friendly error object the UI can rely on
    const normalized = {
      status: status || 0,
      message:
        data?.message ||
        error.message ||
        "حدث خطأ في الاتصال بالخادم، تحقق من الإنترنت ثم حاول مجددًا.",
      // Laravel returns { errors: { field: ["msg", ...] } } for 422
      errors: data?.errors || null,
      raw: data || null,
    };

    if (status === 401) {
      // Token invalid/expired -> wipe it
      localStorage.removeItem(TOKEN_KEY);

      // Only redirect if we're not already on /login (avoid loops)
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(normalized);
  }
);

/* ---------------- Token helpers ---------------- */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export default http;
