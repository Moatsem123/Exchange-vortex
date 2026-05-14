// =====================================================
// currencies.js — كل عمليات العملات
// المكان المفروض: src/services/currencies.js
// =====================================================
// ملاحظة: العملات بتستخدم الـ code (USD/EUR) كمعرّف مش id
import api from "./api";

export const currenciesService = {
  // GET /currencies?search=&is_active=
  list: (params) => api.get("/currencies", { params }).then((r) => r.data),

  // GET /currencies/:code
  show: (code) => api.get(`/currencies/${code}`).then((r) => r.data),

  // POST /currencies
  // body: { code, name, name_ar, symbol, rate_to_usd, is_active }
  create: (data) => api.post("/currencies", data).then((r) => r.data),

  // PATCH /currencies/:code
  update: (code, data) =>
    api.patch(`/currencies/${code}`, data).then((r) => r.data),

  // DELETE /currencies/:code — disable (مش حذف فعلي)
  disable: (code) => api.delete(`/currencies/${code}`).then((r) => r.data),

  // PUT /currencies/:code/rate
  // body: { rate, date }
  updateRate: (code, data) =>
    api.put(`/currencies/${code}/rate`, data).then((r) => r.data),
};

export default currenciesService;
