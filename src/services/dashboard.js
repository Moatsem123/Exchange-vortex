import api from "./api";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.keys(params || {}).forEach((key) => {
    const value = params[key];

    if (value === undefined || value === null || value === "") return;

    cleaned[key] = value;
  });

  return cleaned;
}

const dashboardService = {
  summary: (params = {}) => {
    const finalParams =
      typeof params === "string"
        ? { period: params }
        : cleanParams(params);

    return api
      .get("/dashboard/summary", { params: finalParams })
      .then((r) => r.data);
  },

  financial: (params = {}) =>
    api
      .get("/dashboard/financial", { params: cleanParams(params) })
      .then((r) => r.data),

  suppliers: (params = {}) =>
    api
      .get("/dashboard/suppliers", { params: cleanParams(params) })
      .then((r) => r.data),

  boxes: (params = {}) =>
    api
      .get("/dashboard/boxes", { params: cleanParams(params) })
      .then((r) => r.data),

  commissions: (params = {}) =>
    api
      .get("/dashboard/commissions", { params: cleanParams(params) })
      .then((r) => r.data),

  charts: (params = {}) =>
    api
      .get("/dashboard/charts", { params: cleanParams(params) })
      .then((r) => r.data),

  chart: (period = "30d") =>
    api
      .get("/dashboard/charts", {
        params: { period },
      })
      .then((r) => r.data),
};

export default dashboardService;
