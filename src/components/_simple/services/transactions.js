// =====================================================
// transactions.js — Transactions API
// Target: src/services/transactions.js
// =====================================================
import api from "./api";

export const transactionsService = {
  // GET /transactions?search=&type=&per_page=
  list: (params) =>
    api.get("/transactions", { params }).then((r) => r.data),

  // GET /transactions/:id
  show: (id) => api.get(`/transactions/${id}`).then((r) => r.data),

  // POST /transactions
  create: (data) => api.post("/transactions", data).then((r) => r.data),

  // PATCH /transactions/:id
  update: (id, data) =>
    api.patch(`/transactions/${id}`, data).then((r) => r.data),

  // DELETE /transactions/:id
  remove: (id) => api.delete(`/transactions/${id}`).then((r) => r.data),
};

export default transactionsService;
