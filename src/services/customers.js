import api from "./api";

const customersService = {
  list: (params = {}) => api.get("/customers", { params }).then((r) => r.data),
  show: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post("/customers", data).then((r) => r.data),
  update: (id, data) => api.patch(`/customers/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),
  restore: (id) => api.patch(`/customers/${id}/restore`).then((r) => r.data),
  forceDelete: (id) => api.delete(`/customers/${id}/force`).then((r) => r.data),
  balance: (id) => api.get(`/customers/${id}/balance`).then((r) => r.data),
  transactions: (id, params = {}) =>
    api.get(`/customers/${id}/transactions`, { params }).then((r) => r.data),
  operations: (id, params = {}) =>
    api.get(`/customers/${id}/operations`, { params }).then((r) => r.data),
  suppliers: (params = {}) =>
    api.get("/customers", { params: { ...params, type: "supplier" } }).then((r) => r.data),
  regularCustomers: (params = {}) =>
    api.get("/customers", { params: { ...params, type: "customer" } }).then((r) => r.data),
};

export default customersService;