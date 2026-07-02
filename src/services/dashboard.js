import api from "./api";

const dashboardService = {
  financial: (params = {}) =>
    api.get("/dashboard/financial", { params }).then((r) => r.data),

  suppliers: (params = {}) =>
    api.get("/dashboard/suppliers", { params }).then((r) => r.data),

  boxes: (params = {}) =>
    api.get("/dashboard/boxes", { params }).then((r) => r.data),

  commissions: (params = {}) =>
    api.get("/dashboard/commissions", { params }).then((r) => r.data),

  charts: (params = {}) =>
    api.get("/dashboard/charts", { params }).then((r) => r.data),

  summary: (period) =>
    api
      .get("/dashboard/summary", {
        params: period ? { period } : undefined,
      })
      .then((r) => r.data),

  chart: (period = "30d") =>
    api
      .get("/dashboard/chart", {
        params: { period },
      })
      .then((r) => r.data),
};

export default dashboardService;