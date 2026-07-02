import api from "./api";

const reconciliationService = {
  view: () =>
    api.get("/reconciliation").then((r) => r.data),

  run: () =>
    api.post("/reconciliation/run").then((r) => r.data),

  history: (params = {}) =>
    api.get("/reconciliation/history", { params }).then((r) => r.data),
};

export default reconciliationService;