import api from "./api";

export const receiptsService = {
  show: (id) => api.get(`/receipts/${id}`).then((r) => r.data),
  download: (id) => api.get(`/receipts/${id}`, { responseType: "blob" }),
};

export const permissionsService = {
  list: () => api.get("/permissions").then((r) => r.data),
};

export const rolesService = {
  list: () => api.get("/roles").then((r) => r.data),
  show: (id) => api.get(`/roles/${id}`).then((r) => r.data),
  create: (data) => api.post("/roles", data).then((r) => r.data),
  update: (id, data) => api.patch(`/roles/${id}`, data).then((r) => r.data),
  assignPermissions: (id, data) => api.put(`/roles/${id}/permissions`, data).then((r) => r.data),
  remove: (id) => api.delete(`/roles/${id}`).then((r) => r.data),
};

export const settingsService = {
  publicSettings: () => api.get("/settings/public").then((r) => r.data),
  list: () => api.get("/settings").then((r) => r.data),
  group: (group) => api.get(`/settings/${group}`).then((r) => r.data),
  update: (data) => api.put("/settings", data).then((r) => r.data),
  resetGroup: (group) => api.post(`/settings/${group}/reset`).then((r) => r.data),
};