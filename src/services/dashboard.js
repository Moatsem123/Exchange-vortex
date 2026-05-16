import api from "./api";

const dashboardService = {
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