import api from "./api";

const reportsService = {
  daily: (params = {}) =>
    api.get("/reports/daily", { params }).then((r) => r.data),

  monthly: (params = {}) =>
    api.get("/reports/monthly", { params }).then((r) => r.data),

  usersComparison: (params = {}) =>
    api.get("/reports/users-comparison", { params }).then((r) => r.data),

  customerStatement: (id, params = {}) =>
    api.get(`/reports/customer-statement/${id}`, { params }).then((r) => r.data),

  queueExport: (data) =>
    api.post("/reports/export", data).then((r) => r.data),

  exportStatus: (id) =>
    api.get(`/reports/export/${id}/status`).then((r) => r.data),

  exportDownload: (id) =>
    api.get(`/reports/export/${id}/download`, {
      responseType: "blob",
    }),

  queueDailyPdfExport: (data) =>
    api.post("/reports/export", {
      type: "daily",
      format: "pdf",
      params: data,
    }).then((r) => r.data),

  queueStatementExcelExport: (data) =>
    api.post("/reports/export", {
      type: "statement",
      format: "excel",
      params: data,
    }).then((r) => r.data),
};

export default reportsService;