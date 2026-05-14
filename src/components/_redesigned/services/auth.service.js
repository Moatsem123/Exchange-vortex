import http, { setAuthToken } from "./http";

/**
 * POST /auth/login
 * Returns the raw payload: { data: { token, user, ... } }
 * Also stores the token in localStorage so subsequent calls are authenticated.
 */
export async function login({ email, password }) {
  const { data } = await http.post("/auth/login", { email, password });

  const token = data?.data?.token;
  if (token) {
    setAuthToken(token);
  }

  return data?.data ?? data;
}

/**
 * GET /auth/me — returns the currently authenticated user.
 */
export async function me() {
  const { data } = await http.get("/auth/me");
  return data?.data ?? data;
}

/**
 * PUT /auth/change-password
 */
export async function changePassword({
  current_password,
  password,
  password_confirmation,
}) {
  const { data } = await http.put("/auth/change-password", {
    current_password,
    password,
    password_confirmation,
  });
  return data?.data ?? data;
}

/**
 * POST /auth/logout — revokes the current token on the server, then
 * wipes it locally. Always clears the local token, even if the network call fails.
 */
export async function logout() {
  try {
    await http.post("/auth/logout");
  } catch (e) {
    // ignore — we still want to drop the local token
  } finally {
    setAuthToken(null);
  }
}
