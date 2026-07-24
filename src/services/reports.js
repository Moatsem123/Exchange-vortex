import api from "./api";

function unwrap(res) {
  return res?.data || res || {};
}

function unwrapPayload(res) {
  const data = unwrap(res);
  return data?.data || data || {};
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.keys(params || {}).forEach((key) => {
    const value = params[key];

    if (value === undefined || value === null || value === "") return;

    cleaned[key] = value;
  });

  return cleaned;
}

function getExportJobId(res) {
  const data = unwrapPayload(res);

  return (
    data?.job_id ||
    data?.job?.id ||
    data?.export?.job_id ||
    data?.export?.id ||
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
    data?.job_status ||
    data?.export_status ||
    data?.job?.status ||
    data?.export?.status ||
    data?.export_job?.status ||
    "queued"
  );
}

function getExportFileName(res, fallback = "report.pdf") {
  const data = unwrapPayload(res);

  return (
    data?.filename ||
    data?.file_name ||
    data?.name ||
    data?.job?.filename ||
    data?.job?.file_name ||
    data?.export?.filename ||
    data?.export?.file_name ||
    fallback
  );
}

function queueExportRequest({ type, format = "pdf", params = {} }) {
  return api
    .post("/reports/export", {
      type,
      format,
      params: cleanParams(params),
    })
    .then((r) => r.data);
}

const reportsService = {
  operationsRaw: (params = {}) =>
    api
      .get("/operations", {
        params: cleanParams({
          per_page: 1000,
          ...params,
        }),
      })
      .then((r) => r.data),

  dashboardFinancial: (params = {}) =>
    api
      .get("/dashboard/financial", {
        params: cleanParams(params),
      })
      .then((r) => r.data),

  dashboardBoxes: (params = {}) =>
    api
      .get("/dashboard/boxes", {
        params: cleanParams(params),
      })
      .then((r) => r.data),

  operations: (params = {}) =>
    api.get("/reports/operations", { params: cleanParams(params) }).then((r) => r.data),

  commissions: (params = {}) =>
    api.get("/reports/commissions", { params: cleanParams(params) }).then((r) => r.data),

  profitSummary: (params = {}) =>
    api.get("/reports/profit-summary", { params: cleanParams(params) }).then((r) => r.data),

  suppliers: (params = {}) =>
    api.get("/reports/suppliers", { params: cleanParams(params) }).then((r) => r.data),

  customers: (params = {}) =>
    api.get("/reports/customers", { params: cleanParams(params) }).then((r) => r.data),

  boxes: (params = {}) =>
    api.get("/reports/boxes", { params: cleanParams(params) }).then((r) => r.data),

  operationsWorkflow: (params = {}) =>
    api.get("/reports/operations-workflow", { params: cleanParams(params) }).then((r) => r.data),

  obligations: (params = {}) =>
    api.get("/reports/obligations", { params: cleanParams(params) }).then((r) => r.data),

  pending: (params = {}) =>
    api.get("/reports/pending", { params: cleanParams(params) }).then((r) => r.data),

  customerStatement: (customerId, params = {}) =>
    api.get(`/reports/customer/${customerId}/statement`, { params: cleanParams(params) }).then((r) => r.data),

  cancelled: (params = {}) =>
    api.get("/reports/cancelled", { params: cleanParams(params) }).then((r) => r.data),

  queueExport: (data = {}) =>
    queueExportRequest({
      type: data.type,
      format: data.format || "pdf",
      params: data.params || {},
    }),

  exportStatus: (jobId) =>
    api.get(`/reports/export/${jobId}/status`).then((r) => r.data),

  exportDownload: (jobId) =>
    api.get(`/reports/export/${jobId}/download`, {
      responseType: "blob",
    }),

  queueGenericExport: ({ type, format = "pdf", params = {} }) =>
    queueExportRequest({
      type,
      format,
      params,
    }),

  unwrap,
  unwrapPayload,
  cleanParams,
  getExportJobId,
  getExportStatus,
  getExportFileName,
};

export default reportsService;
