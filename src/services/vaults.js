import api from "./api";

const vaultsService = {
  list: (params) => api.get("/vaults", { params }).then((r) => r.data),
  show: (id) => api.get(`/vaults/${id}`).then((r) => r.data),
  update: (id, data) => api.patch(`/vaults/${id}`, data).then((r) => r.data),
  setBalance: (id, data) => api.patch(`/vaults/${id}/balance`, data).then((r) => r.data),
  summary: () => api.get("/vaults/summary").then((r) => r.data),
  transactions: (id, params) => api.get(`/vaults/${id}/transactions`, { params }).then((r) => r.data),
};

export default vaultsService;