import api from "./api";

const operationsService = {
  list: (params = {}) => api.get("/operations", { params }).then((r) => r.data),
  show: (id) => api.get(`/operations/${id}`).then((r) => r.data),
  create: (data) => api.post("/operations", data).then((r) => r.data),
  update: (id, data) => api.put(`/operations/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/operations/${id}`).then((r) => r.data),
  complete: (id, data = {}) => api.post(`/operations/${id}/complete`, data).then((r) => r.data),
  cancel: (id, data = {}) => api.post(`/operations/${id}/cancel`, data).then((r) => r.data),
  receipt: (id) => api.get(`/operations/${id}/receipt`).then((r) => r.data),
};

export default operationsService;