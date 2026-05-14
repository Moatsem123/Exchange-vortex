
import api from "./api";

export const transactionsService = {

  list: (params) =>
    api.get("/transactions", { params }).then((r) => r.data),


  show: (id) => api.get(`/transactions/${id}`).then((r) => r.data),


  create: (data) => api.post("/transactions", data).then((r) => r.data),


  update: (id, data) =>
    api.patch(`/transactions/${id}`, data).then((r) => r.data),


  remove: (id) => api.delete(`/transactions/${id}`).then((r) => r.data),
};

export default transactionsService;