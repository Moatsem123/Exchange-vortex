import api from "./api";

const expensesService = {
  list: (params = {}) =>
    api.get("/expenses", { params }).then((r) => r.data),

  create: (data) =>
    api.post("/expenses", data).then((r) => r.data),

  update: (id, data) =>
    api.put(`/expenses/${id}`, data).then((r) => r.data),

  remove: (id) =>
    api.delete(`/expenses/${id}`).then((r) => r.data),
};

export default expensesService;