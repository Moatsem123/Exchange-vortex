import api from "./api";

const reportsService = {
  daily: (date) => api.get("/reports/daily", { params: { date } }).then((r) => r.data),
  monthly: (params) => api.get("/reports/monthly", { params }).then((r) => r.data),
  usersComparison: (params) => api.get("/reports/users-comparison", { params }).then((r) => r.data),
  customerStatement: (id, params) =>
    api.get(`/reports/customer-statement/${id}`, { params }).then((r) => r.data),
  queueDailyPdfExport: (data) => api.post("/reports/exports/daily/pdf", data).then((r) => r.data),
  queueStatementExcelExport: (data) =>
    api.post("/reports/exports/statement/excel", data).then((r) => r.data),
  exportStatus: (id) => api.get(`/reports/exports/${id}/status`).then((r) => r.data),
  exportDownload: (id) => api.get(`/reports/exports/${id}/download`, { responseType: "blob" }),
};

export default reportsService;