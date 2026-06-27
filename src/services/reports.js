import api from "./api";

function unwrap(res) {
  return res?.data || res || {};
}

function unwrapPayload(res) {
  const data = unwrap(res);
  return data?.data || data || {};
}

function getExportJobId(res) {
  const data = unwrapPayload(res);

  return (
    data?.job_id ||
    data?.id ||
    data?.export_id ||
    data?.uuid ||
    null
  );
}

function getExportStatus(res) {
  const data = unwrapPayload(res);

  return (
    data?.status ||
    data?.state ||
    "queued"
  );
}

function getExportFileName(res, fallback = "report") {
  const data = unwrapPayload(res);

  return (
    data?.filename ||
    data?.file_name ||
    data?.name ||
    fallback
  );
}

const reportsService = {
  daily: (params = {}) =>
    api.get("/reports/daily", { params }).then((r) => r.data),

  monthly: (params = {}) =>
    api.get("/reports/monthly", { params }).then((r) => r.data),

  dailyProfit: (params = {}) =>
    api.get("/reports/daily-profit", { params }).then((r) => r.data),

  monthlyProfit: (params = {}) =>
    api.get("/reports/monthly-profit", { params }).then((r) => r.data),

  profitSummary: (params = {}) =>
    api.get("/reports/profit-summary", { params }).then((r) => r.data),

  profitByUser: (params = {}) =>
    api.get("/reports/profit-by-user", { params }).then((r) => r.data),

  profitBySupplier: (params = {}) =>
    api.get("/reports/profit-by-supplier", { params }).then((r) => r.data),

  usersComparison: (params = {}) =>
    api.get("/reports/users-comparison", { params }).then((r) => r.data),

  customerStatement: (customerId, params = {}) =>
    api.get(`/reports/customer/${customerId}/statement`, { params }).then((r) => r.data),

  capitalReport: (params = {}) =>
    api.get("/reports/capital-report", { params }).then((r) => r.data),

  expenseReport: (params = {}) =>
    api.get("/reports/expense-report", { params }).then((r) => r.data),

  netWorthReport: (params = {}) =>
    api.get("/reports/net-worth-report", { params }).then((r) => r.data),

  queueExport: (data) =>
    api.post("/reports/export", data).then((r) => r.data),

  exportStatus: (jobId) =>
    api.get(`/reports/export/${jobId}/status`).then((r) => r.data),

  exportDownload: (jobId) =>
    api.get(`/reports/export/${jobId}/download`, {
      responseType: "blob",
    }),

  queueDailyPdfExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "daily",
        format: "pdf",
        params,
      })
      .then((r) => r.data),

  queueDailyExcelExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "daily",
        format: "excel",
        params,
      })
      .then((r) => r.data),

  queueMonthlyPdfExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "monthly",
        format: "pdf",
        params,
      })
      .then((r) => r.data),

  queueMonthlyExcelExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "monthly",
        format: "excel",
        params,
      })
      .then((r) => r.data),

  queueStatementPdfExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "statement",
        format: "pdf",
        params,
      })
      .then((r) => r.data),

  queueStatementExcelExport: (params = {}) =>
    api
      .post("/reports/export", {
        type: "statement",
        format: "excel",
        params,
      })
      .then((r) => r.data),

  queueGenericExport: ({ type, format = "pdf", params = {} }) =>
    api
      .post("/reports/export", {
        type,
        format,
        params,
      })
      .then((r) => r.data),

  unwrap,
  unwrapPayload,
  getExportJobId,
  getExportStatus,
  getExportFileName,
};

export default reportsService;