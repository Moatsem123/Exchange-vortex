import api from "./api";

const usersPermissionsService = {
  users: {
    list: (params = {}) =>
      api.get("/users", { params }).then((r) => r.data),

    create: (data) =>
      api.post("/users", data).then((r) => r.data),

    show: (id) =>
      api.get(`/users/${id}`).then((r) => r.data),

    update: (id, data) =>
      api.patch(`/users/${id}`, data).then((r) => r.data),

    remove: (id) =>
      api.delete(`/users/${id}`).then((r) => r.data),

    restore: (id) =>
      api.patch(`/users/${id}/restore`).then((r) => r.data),

    changeRole: (id, role) =>
      api.patch(`/users/${id}/role`, { role }).then((r) => r.data),

    toggleActive: (id) =>
      api.patch(`/users/${id}/toggle-active`).then((r) => r.data),

    setVaultBalance: (id, data) =>
      api.patch(`/users/${id}/vault-balance`, data).then((r) => r.data),
  },

  roles: {
    list: (params = {}) =>
      api.get("/roles", { params }).then((r) => r.data),

    create: (data) =>
      api.post("/roles", data).then((r) => r.data),

    show: (id) =>
      api.get(`/roles/${id}`).then((r) => r.data),

    update: (id, data) =>
      api.put(`/roles/${id}`, data).then((r) => r.data),

    remove: (id) =>
      api.delete(`/roles/${id}`).then((r) => r.data),

    assignPermissions: (id, permissions = []) =>
      api.put(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
  },

  permissions: {
    list: () =>
      api.get("/permissions").then((r) => r.data),
  },
};

export default usersPermissionsService;