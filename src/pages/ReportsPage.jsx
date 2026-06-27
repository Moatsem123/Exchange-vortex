import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  Calendar,
  ChartNoAxesColumnIncreasing,
  Database,
  DollarSign,
  Download,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import { useToast } from "../shared/Toast";
import reportsService from "../services/reports";
import { extractApiError, formatCompactNumber, formatMoney } from "../shared/helpers";

const REPORT_TYPES = [
  {
    key: "daily",
    label: "التقرير اليومي",
    subtitle: "حركة يوم محدد",
    icon: Activity,
    mode: "date",
    service: "daily",
    exportType: "daily",
  },
  {
    key: "monthly",
    label: "التقرير الشهري",
    subtitle: "حركة شهر كامل",
    icon: ChartNoAxesColumnIncreasing,
    mode: "month",
    service: "monthly",
    exportType: "monthly",
  },
  {
    key: "dailyProfit",
    label: "أرباح يومية",
    subtitle: "صافي ربح يوم محدد",
    icon: TrendingUp,
    mode: "date",
    service: "dailyProfit",
    exportType: "daily-profit",
  },
  {
    key: "monthlyProfit",
    label: "أرباح شهرية",
    subtitle: "صافي ربح شهر محدد",
    icon: TrendingUp,
    mode: "month",
    service: "monthlyProfit",
    exportType: "monthly-profit",
  },
  {
    key: "profitSummary",
    label: "ملخص الأرباح",
    subtitle: "أرباح الفترة المحددة",
    icon: DollarSign,
    mode: "range",
    service: "profitSummary",
    exportType: "profit-summary",
  },
  {
    key: "profitByUser",
    label: "الأرباح حسب المستخدم",
    subtitle: "تحليل الربح لكل مستخدم",
    icon: Users,
    mode: "range",
    service: "profitByUser",
    exportType: "profit-by-user",
  },
  {
    key: "profitBySupplier",
    label: "الأرباح حسب المورد",
    subtitle: "تحليل الربح حسب المورد",
    icon: UserRound,
    mode: "range",
    service: "profitBySupplier",
    exportType: "profit-by-supplier",
  },
  {
    key: "usersComparison",
    label: "مقارنة المستخدمين",
    subtitle: "مقارنة أداء المستخدمين",
    icon: Users,
    mode: "range",
    service: "usersComparison",
    exportType: "users-comparison",
  },
  {
    key: "customerStatement",
    label: "كشف حساب عميل",
    subtitle: "كشف حركة عميل محدد",
    icon: FileText,
    mode: "customerRange",
    service: "customerStatement",
    exportType: "statement",
  },
  {
    key: "capitalReport",
    label: "تقرير رأس المال",
    subtitle: "حركة رأس المال",
    icon: Wallet,
    mode: "range",
    service: "capitalReport",
    exportType: "capital-report",
  },
  {
    key: "expenseReport",
    label: "تقرير المصروفات",
    subtitle: "مصروفات الفترة",
    icon: ReceiptText,
    mode: "range",
    service: "expenseReport",
    exportType: "expense-report",
  },
  {
    key: "netWorthReport",
    label: "صافي الثروة",
    subtitle: "الوضع المالي الحالي",
    icon: Database,
    mode: "none",
    service: "netWorthReport",
    exportType: "net-worth-report",
  },
];

const READY_STATUSES = ["ready", "completed", "done", "success", "finished"];
const FAIL_STATUSES = ["failed", "error", "cancelled", "canceled"];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentMonth() {
  return getToday().slice(0, 7);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function unwrapPayload(res) {
  const response = res?.data || res || {};
  return response?.data || response || {};
}

function getExportId(res) {
  const data = unwrapPayload(res);
  return data?.job_id || data?.id || data?.export_id || data?.uuid || null;
}

function getExportStatus(res) {
  const data = unwrapPayload(res);
  return data?.status || data?.state || "queued";
}

function labelOf(key) {
  const labels = {
    id: "الرقم",
    type: "النوع",
    title: "العنوان",
    date: "التاريخ",
    date_from: "من تاريخ",
    date_to: "إلى تاريخ",
    generated_at: "وقت الإنشاء",
    month: "الشهر",
    year: "السنة",
    user: "المستخدم",
    user_name: "المستخدم",
    customer: "العميل",
    customer_name: "العميل",
    supplier: "المورد",
    supplier_name: "المورد",
    receive: "الداخل",
    send: "الخارج",
    net: "الصافي",
    count: "العدد",
    amount: "المبلغ",
    profit: "الربح",
    total_profit_usd: "إجمالي الربح",
    total_operations: "إجمالي العمليات",
    completed_operations: "مكتملة",
    pending_operations: "معلقة",
    cancelled_operations: "ملغاة",
    capital_balance: "رصيد رأس المال",
    free_capital: "رأس المال الحر",
    boxes_total_balance: "إجمالي الصناديق",
    net_worth: "صافي الثروة",
    currency: "العملة",
    currency_code: "العملة",
    status: "الحالة",
    reference_number: "الرقم المرجعي",
    created_at: "تاريخ الإنشاء",
  };

  return labels[key] || key.replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCell(value, key = "") {
  if (value === null || value === undefined || value === "") return "—";

  if (key.includes("_at")) return formatDateTime(value);
  if (key.includes("date")) return formatDate(value);

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (typeof value === "number") {
    if (
      key.includes("amount") ||
      key.includes("balance") ||
      key.includes("profit") ||
      key.includes("expense") ||
      key.includes("total") ||
      key.includes("net") ||
      key.includes("receive") ||
      key.includes("send")
    ) {
      return formatMoney(value);
    }

    return value.toLocaleString();
  }

  if (typeof value === "object") {
    return value?.name || value?.label || value?.title || value?.email || "—";
  }

  return String(value);
}

function getModeLabel(mode) {
  const labels = {
    date: "فلتر يوم",
    month: "فلتر شهر",
    range: "فلتر فترة",
    customerRange: "عميل وفترة",
    none: "بدون فلتر",
  };

  return labels[mode] || mode;
}

function getTableSections(payload) {
  const sections = [
    ["transactions", "المعاملات"],
    ["rows", "السجلات"],
    ["daily_totals", "الحركة اليومية"],
    ["by_currency", "حسب العملة"],
    ["by_type", "حسب النوع"],
    ["expenses", "المصروفات"],
    ["operations", "العمليات"],
  ];

  return sections
    .map(([key, title]) => ({
      key,
      title,
      rows: Array.isArray(payload?.[key]) ? payload[key] : [],
    }))
    .filter((section) => section.rows.length > 0);
}

function getColumns(rows = []) {
  const keys = [];

  rows.slice(0, 10).forEach((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;

    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
  });

  const priority = [
    "id",
    "date",
    "created_at",
    "name",
    "user_name",
    "customer_name",
    "supplier_name",
    "type",
    "currency",
    "currency_code",
    "amount",
    "receive",
    "send",
    "net",
    "profit",
    "total_profit_usd",
    "balance",
    "status",
    "reference_number",
  ];

  return keys
    .sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);

      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    })
    .slice(0, 9);
}

function makeCard(title, value, icon, color, kind = "money", note = "") {
  return { title, value, icon, color, kind, note };
}

function buildCards(reportKey, payload = {}) {
  const totals = payload?.totals || {};

  if (["daily", "monthly", "usersComparison"].includes(reportKey)) {
    return [
      makeCard("إجمالي الداخل", totals.receive ?? payload.receive ?? 0, DollarSign, "emerald"),
      makeCard("إجمالي الخارج", totals.send ?? payload.send ?? 0, ArrowDown, "rose"),
      makeCard("الصافي", totals.net ?? payload.net ?? 0, TrendingUp, "blue"),
      makeCard("عدد المعاملات", totals.count ?? payload.count ?? 0, Activity, "violet", "count"),
    ];
  }

  if (reportKey === "profitSummary") {
    return [
      makeCard("إجمالي الربح", payload.total_profit_usd ?? 0, DollarSign, "emerald"),
      makeCard("إجمالي العمليات", payload.total_operations ?? 0, Activity, "blue", "count"),
      makeCard("عمليات معلقة", payload.pending_operations ?? 0, Activity, "amber", "count"),
      makeCard("عمليات مكتملة", payload.completed_operations ?? 0, TrendingUp, "violet", "count"),
    ];
  }

  if (["dailyProfit", "monthlyProfit", "profitByUser", "profitBySupplier"].includes(reportKey)) {
    return [
      makeCard("إجمالي الربح", payload.total_profit_usd ?? 0, DollarSign, "emerald"),
      makeCard("عدد السجلات", Array.isArray(payload.rows) ? payload.rows.length : 0, Activity, "violet", "count"),
      makeCard("من تاريخ", payload.date_from || payload.date || "—", Calendar, "blue", "text"),
      makeCard("إلى تاريخ", payload.date_to || payload.date || "—", Calendar, "amber", "text"),
    ];
  }

  if (reportKey === "capitalReport") {
    return [
      makeCard("رصيد رأس المال", payload.capital_balance ?? 0, Wallet, "emerald"),
      makeCard("رأس المال الحر", payload.free_capital ?? 0, DollarSign, "blue"),
      makeCard("أنواع الحركة", Array.isArray(payload.by_type) ? payload.by_type.length : 0, Activity, "violet", "count"),
      makeCard("عدد السجلات", Array.isArray(payload.transactions) ? payload.transactions.length : 0, FileText, "amber", "count"),
    ];
  }

  if (reportKey === "expenseReport") {
    return [
      makeCard("إجمالي المصروفات", payload.total_expenses ?? payload.expenses_total ?? 0, ReceiptText, "rose"),
      makeCard("عدد المصروفات", Array.isArray(payload.expenses) ? payload.expenses.length : Array.isArray(payload.rows) ? payload.rows.length : payload.count ?? 0, Activity, "violet", "count"),
      makeCard("من تاريخ", payload.date_from || "—", Calendar, "blue", "text"),
      makeCard("إلى تاريخ", payload.date_to || "—", Calendar, "amber", "text"),
    ];
  }

  if (reportKey === "netWorthReport") {
    return [
      makeCard("صافي الثروة", payload.net_worth ?? 0, TrendingUp, "emerald"),
      makeCard("إجمالي الصناديق", payload.boxes_total_balance ?? 0, Wallet, "blue"),
      makeCard("رصيد رأس المال", payload.capital_balance ?? 0, DollarSign, "violet"),
      makeCard("رأس المال الحر", payload.free_capital ?? 0, Database, "amber"),
    ];
  }

  if (reportKey === "customerStatement") {
    return [
      makeCard("إجمالي الداخل", payload.total_receive ?? payload.receive ?? totals.receive ?? 0, DollarSign, "emerald"),
      makeCard("إجمالي الخارج", payload.total_send ?? payload.send ?? totals.send ?? 0, ArrowDown, "rose"),
      makeCard("الرصيد / الصافي", payload.balance ?? payload.net ?? totals.net ?? 0, TrendingUp, "blue"),
      makeCard("عدد السجلات", Array.isArray(payload.transactions) ? payload.transactions.length : Array.isArray(payload.rows) ? payload.rows.length : payload.count ?? 0, Activity, "violet", "count"),
    ];
  }

  return [
    makeCard("إجمالي الداخل", 0, DollarSign, "emerald"),
    makeCard("إجمالي الخارج", 0, ArrowDown, "rose"),
    makeCard("الصافي", 0, TrendingUp, "blue"),
    makeCard("عدد السجلات", 0, Activity, "violet", "count"),
  ];
}

function getInfoItems(payload = {}) {
  const keys = ["title", "type", "date", "date_from", "date_to", "month", "year", "generated_at"];

  return keys
    .filter((key) => payload?.[key] !== undefined && payload?.[key] !== null && payload?.[key] !== "")
    .map((key) => ({
      key,
      label: labelOf(key),
      value: payload[key],
    }));
}

function displayCardValue(card) {
  if (card.kind === "money") return formatMoney(toNumber(card.value));
  if (card.kind === "count") return formatCompactNumber(toNumber(card.value));
  if (card.kind === "text") {
    if (String(card.title).includes("تاريخ")) return formatDate(card.value);
    return String(card.value || "—");
  }

  return String(card.value || 0);
}

export default function ReportsPage() {
  const toast = useToast();
  const today = getToday();
  const currentMonth = getCurrentMonth();
  const pollTimerRef = useRef(null);

  const [activeReportKey, setActiveReportKey] = useState("daily");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentMonth);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [customerId, setCustomerId] = useState("");

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportJob, setExportJob] = useState(null);
  const [error, setError] = useState(null);

  const activeReport = useMemo(
    () => REPORT_TYPES.find((item) => item.key === activeReportKey) || REPORT_TYPES[0],
    [activeReportKey]
  );

  const cards = useMemo(() => buildCards(activeReportKey, payload || {}), [activeReportKey, payload]);
  const sections = useMemo(() => getTableSections(payload || {}), [payload]);
  const infoItems = useMemo(() => getInfoItems(payload || {}), [payload]);
  const ActiveIcon = activeReport.icon || FileText;

  function buildParams(report = activeReport) {
    if (report.mode === "date") return { date };

    if (report.mode === "month") {
      const [year, selectedMonth] = month.split("-");
      return { year, month: selectedMonth };
    }

    if (report.mode === "range" || report.mode === "customerRange") {
      return { date_from: dateFrom, date_to: dateTo };
    }

    return {};
  }

  async function load() {
    if (activeReport.mode === "customerRange" && !customerId.trim()) {
      setPayload(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = buildParams(activeReport);
      let res;

      if (activeReport.mode === "customerRange") {
        res = await reportsService.customerStatement(customerId.trim(), params);
      } else {
        res = await reportsService[activeReport.service](params);
      }

      setPayload(unwrapPayload(res));
    } catch (err) {
      setPayload(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [activeReportKey]);

  function handleReportChange(key) {
    setActiveReportKey(key);
    setPayload(null);
    setError(null);
    setExportJob(null);
  }

  function buildExportPayload() {
    const params = buildParams(activeReport);

    if (activeReport.mode === "customerRange") {
      params.customer_id = customerId.trim();
    }

    return {
      type: activeReport.exportType,
      format: "pdf",
      params,
    };
  }

  async function handleExportPdf() {
    if (exporting) return;

    if (activeReport.mode === "customerRange" && !customerId.trim()) {
      toast.error("أدخل رقم العميل أولاً");
      return;
    }

    setExporting(true);
    setExportJob(null);

    try {
      const res = await reportsService.queueExport(buildExportPayload());
      const jobId = getExportId(res);

      if (!jobId) {
        toast.error("لم يتم استلام رقم مهمة التصدير من الخادم");
        setExporting(false);
        return;
      }

      setExportJob({ id: jobId, status: "queued" });
      toast.info("تمت إضافة التقرير إلى قائمة التصدير");
      pollExport(jobId, 0);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
    }
  }

  async function pollExport(jobId, attempts = 0) {
    if (attempts > 40) {
      toast.error("انتهت مهلة انتظار التصدير");
      setExporting(false);
      return;
    }

    try {
      const res = await reportsService.exportStatus(jobId);
      const status = getExportStatus(res);

      setExportJob({ id: jobId, status });

      if (READY_STATUSES.includes(status)) {
        await downloadExport(jobId, res);
        return;
      }

      if (FAIL_STATUSES.includes(status)) {
        toast.error("فشل تجهيز ملف التصدير");
        setExporting(false);
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        pollExport(jobId, attempts + 1);
      }, 2000);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
    }
  }

  async function downloadExport(jobId, statusRes) {
    try {
      const file = await reportsService.exportDownload(jobId);
      const statusPayload = unwrapPayload(statusRes);

      const fileName =
        statusPayload?.filename ||
        statusPayload?.file_name ||
        `${activeReport.key}-${Date.now()}.pdf`;

      const blob = new Blob([file.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      toast.success("تم تحميل التقرير بنجاح");
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 pb-8" dir="rtl">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700 shadow-sm">
              <ChartNoAxesColumnIncreasing className="h-7 w-7" />
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                التقارير
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                تقارير الحركة، الأرباح، رأس المال، المصروفات، وكشوفات العملاء
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting || loading}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              تصدير PDF
            </button>
          </div>
        </div>

        {exportJob && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-right">
              <p className="text-sm font-black text-amber-900">حالة التصدير: {exportJob.status}</p>
              <p className="mt-1 text-xs font-bold text-amber-700" dir="ltr">{exportJob.id}</p>
            </div>

            <Badge color={READY_STATUSES.includes(exportJob.status) ? "emerald" : "amber"}>
              PDF
            </Badge>
          </div>
        )}
      </section>

      <div dir="ltr" className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main dir="rtl" className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
                  <ActiveIcon className="h-7 w-7" />
                </div>

                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-950">{activeReport.label}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{activeReport.subtitle}</p>
                </div>
              </div>

              <Badge color="teal">{getModeLabel(activeReport.mode)}</Badge>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              {activeReport.mode === "date" && (
                <Field label="التاريخ">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ep-input h-11 w-48" />
                </Field>
              )}

              {activeReport.mode === "month" && (
                <Field label="الشهر">
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="ep-input h-11 w-48" />
                </Field>
              )}

              {(activeReport.mode === "range" || activeReport.mode === "customerRange") && (
                <>
                  <Field label="من تاريخ">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        if (dateTo < e.target.value) setDateTo(e.target.value);
                      }}
                      className="ep-input h-11 w-48"
                    />
                  </Field>

                  <Field label="إلى تاريخ">
                    <input type="date" min={dateFrom} value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ep-input h-11 w-48" />
                  </Field>
                </>
              )}

              {activeReport.mode === "customerRange" && (
                <Field label="رقم العميل">
                  <input
                    type="number"
                    min="1"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="ep-input h-11 w-48"
                    placeholder="مثال: 1"
                  />
                </Field>
              )}

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                عرض التقرير
              </button>
            </div>
          </section>

          {error && !loading ? (
            <ErrorState title="تعذّر تحميل التقرير" description={extractApiError(error)} onRetry={load} />
          ) : loading ? (
            <LoadingState />
          ) : activeReport.mode === "customerRange" && !customerId.trim() ? (
            <EmptyState icon={UserRound} title="أدخل رقم العميل" description="اكتب رقم العميل ثم اضغط عرض التقرير" />
          ) : !payload ? (
            <EmptyState icon={FileText} title="لا توجد بيانات" description="لا توجد بيانات لهذا التقرير حسب الفلاتر الحالية" />
          ) : (
            <>
              <section className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
                {cards.map((card) => (
                  <StatCard key={card.title} card={card} />
                ))}
              </section>

              {infoItems.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                    <h3 className="text-base font-black text-slate-950">ملخص التقرير</h3>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                    {infoItems.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-right">
                        <p className="text-xs font-black text-slate-500">{item.label}</p>
                        <p className="mt-2 truncate text-base font-black text-slate-950">
                          {item.key === "generated_at" ? formatDateTime(item.value) : formatCell(item.value, item.key)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sections.length === 0 ? (
                <EmptyState icon={FileText} title="لا توجد سجلات تفصيلية" description="القيم الحالية ظاهرة في البطاقات وملخص التقرير" />
              ) : (
                <div className="space-y-5">
                  {sections.map((section) => (
                    <ReportTable key={section.key} title={section.title} rows={section.rows} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <aside dir="rtl" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-5 py-5">
            <h2 className="text-right text-base font-black text-slate-950">أنواع التقارير</h2>
          </div>

          <div className="max-h-[720px] space-y-2 overflow-y-auto p-4">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon || FileText;
              const active = activeReportKey === report.key;

              return (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => handleReportChange(report.key)}
                  className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                    active
                      ? "border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                      active ? "border-white/20 bg-white/15 text-white" : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{report.label}</p>
                      <p className={`mt-1 truncate text-xs font-semibold ${active ? "text-teal-100" : "text-slate-400"}`}>
                        {report.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-right text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function StatCard({ card }) {
  const Icon = card.icon || Activity;

  const colorStyles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${colorStyles[card.color] || colorStyles.blue}`}>
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-black text-slate-500">{card.title}</p>

          <p className="mt-5 truncate text-2xl font-black tabular-nums text-slate-950 sm:text-3xl" dir="ltr">
            {displayCardValue(card)}
          </p>

          {card.kind === "money" && (
            <p className="mt-2 text-xs font-bold text-slate-400">USD</p>
          )}

          {card.note && (
            <p className="mt-2 truncate text-xs font-bold text-slate-400">{card.note}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReportTable({ title, rows }) {
  const columns = getColumns(rows);

  if (!columns.length) {
    return <EmptyState icon={FileText} title={`لا توجد بيانات في ${title}`} description="هذا القسم لا يحتوي سجلات قابلة للعرض" />;
  }

  return (
    <motion.section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-5">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">{rows.length}</span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="border-b border-slate-100 bg-white">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  {labelOf(column)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row?.id || index} className="transition hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column} className="max-w-[240px] truncate px-5 py-4 text-right text-sm font-bold text-slate-700">
                    {formatCell(row?.[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}