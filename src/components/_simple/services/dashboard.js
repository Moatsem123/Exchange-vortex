// =====================================================
// dashboard.js — بيانات لوحة التحكم
// المكان المفروض: src/services/dashboard.js
// =====================================================
import api from "./api";

export const dashboardService = {
  // GET /dashboard/summary?period=7d
  // period: "1d" | "7d" | "30d"
  summary: (period) =>
    api
      .get("/dashboard/summary", { params: period ? { period } : undefined })
      .then((r) => r.data),

  // GET /dashboard/chart?period=30d
  chart: (period = "30d") =>
    api.get("/dashboard/chart", { params: { period } }).then((r) => r.data),
};

export default dashboardService;
