import api from "./api";

const usersService = {
  list: (params) => api.get("/users", { params }).then((r) => r.data),
  show: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (data) => api.post("/users", data).then((r) => r.data),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data),
  restore: (id) => api.patch(`/users/${id}/restore`).then((r) => r.data),
  changeRole: (id, data) => api.patch(`/users/${id}/role`, data).then((r) => r.data),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`).then((r) => r.data),
  setVaultBalance: (id, data) => api.patch(`/users/${id}/vault-balance`, data).then((r) => r.data),
};

export default usersService;