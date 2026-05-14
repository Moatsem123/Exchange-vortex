// ===============================================================
// customersService.js — كل عمليات العملاء (استلم/سلم) بشكل بسيط
// ===============================================================
// نمط نفس الشي بنفع لأي API ثاني:
// - جيب الكل (GET)
// - جيب وحد (GET /:id)
// - أضف (POST)
// - عدّل (PUT/PATCH)
// - احذف (DELETE)
// ===============================================================

import http from "./http";

export const customersService = {
  // GET /api/customers  — يجيب لائحة العملاء
  async getAll(params) {
    const { data } = await http.get("/customers", { params });
    return data;
  },

  // GET /api/customers/:id — يجيب عميل واحد
  async getById(id) {
    const { data } = await http.get(`/customers/${id}`);
    return data;
  },

  // POST /api/customers — يضيف عميل جديد
  async create(payload) {
    const { data } = await http.post("/customers", payload);
    return data;
  },

  // PUT /api/customers/:id — يعدّل عميل
  async update(id, payload) {
    const { data } = await http.put(`/customers/${id}`, payload);
    return data;
  },

  // DELETE /api/customers/:id — يحذف عميل
  async remove(id) {
    const { data } = await http.delete(`/customers/${id}`);
    return data;
  },
};

export default customersService;
