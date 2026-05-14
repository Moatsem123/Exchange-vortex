// =====================================================
// customers.js — كل عمليات العملاء
// المكان المفروض: src/services/customers.js
// =====================================================
import api from "./api";

export const customersService = {
  // GET /customers?search=&per_page=&with_trashed=
  list: (params) => api.get("/customers", { params }).then((r) => r.data),

  // GET /customers/:id
  show: (id) => api.get(`/customers/${id}`).then((r) => r.data),

  // POST /customers
  // body: { name, phone, note, category, country }
  create: (data) => api.post("/customers", data).then((r) => r.data),

  // PATCH /customers/:id  (ملاحظة: PATCH مش PUT)
  update: (id, data) => api.patch(`/customers/${id}`, data).then((r) => r.data),

  // DELETE /customers/:id — soft delete
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data),

  // PATCH /customers/:id/restore
  restore: (id) => api.patch(`/customers/${id}/restore`).then((r) => r.data),

  // DELETE /customers/:id/force — حذف نهائي
  forceDelete: (id) =>
    api.delete(`/customers/${id}/force`).then((r) => r.data),

  // GET /customers/:id/balance
  balance: (id) => api.get(`/customers/${id}/balance`).then((r) => r.data),

  // GET /customers/:id/transactions?per_page=
  transactions: (id, params) =>
    api.get(`/customers/${id}/transactions`, { params }).then((r) => r.data),
};

export default customersService;
