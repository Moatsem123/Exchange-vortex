import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChartNoAxesColumnIncreasing,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ArrowDown,
  DollarSign,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import { useToast } from "../shared/Toast";
import reportsService from "../services/reports";
import { extractApiError, formatMoney } from "../shared/helpers";

const REPORT_TYPES = [
  { key: "daily", label: "التقرير اليومي" },
  { key: "monthly", label: "التقرير الشهري" },
];

const CURRENCIES = [
  { code: "USD", label: "الدولار الأمريكي", symbol: "$" },
  { code: "EUR", label: "اليورو", symbol: "€" },
  { code: "GBP", label: "الجنيه الإسترليني", symbol: "£" },
  { code: "ILS", label: "الشيكل", symbol: "₪" },
];

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

function unwrapData(res) {
  return res?.data || res || {};
}

function getSummary(data) {
  return (
    data?.summary ||
    data?.total_summary ||
    data?.totals ||
    data?.report?.summary ||
    data ||
    {}
  );
}

function getList(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizeBreakdown(data) {
  const list = getList(
    data?.breakdown,
    data?.type_breakdown,
    data?.transactions_by_type,
    data?.distribution,
    data?.by_currency,
    data?.summary?.breakdown,
    data?.total_summary?.breakdown
  );

  return list.map((item) => {
    const type = item.type || item.name || item.key || item.currency_code || "other";
    const receive =
      item.deposits ??
      item.receive ??
      item.total_receive ??
      item.received ??
      item.in ??
      0;
    const send =
      item.withdrawals ??
      item.send ??
      item.total_send ??
      item.delivered ??
      item.out ??
      0;
    const count = item.count ?? item.transactions_count ?? item.total ?? 0;
    const net = item.net ?? item.net_movement ?? toNumber(receive) - toNumber(send);

    return {
      ...item,
      type,
      label: item.label || item.currency_code || getTypeLabel(type),
      count: toNumber(count),
      deposits: toNumber(receive),
      withdrawals: toNumber(send),
      net: toNumber(net),
      percentage: toNumber(item.percentage),
    };
  });
}

function normalizeChart(data) {
  const list = getList(
    data?.chart,
    data?.daily_chart,
    data?.daily_totals,
    data?.movement_chart,
    data?.daily_movement,
    data?.series,
    data?.labels?.map((label, index) => ({
      date: label,
      net: data?.net_values?.[index] ?? data?.values?.[index] ?? 0,
    }))
  );

  return list.map((item) => ({
    date: item.date || item.label || item.day || item.created_at,
    net: toNumber(item.net ?? item.net_movement ?? item.value ?? item.amount ?? 0),
    value: toNumber(item.value ?? item.net ?? item.net_movement ?? item.amount ?? 0),
  }));
}

function normalizeTopTransactions(data) {
  return getList(
    data?.top_transactions,
    data?.largest_transactions,
    data?.transactions,
    data?.recent_transactions
  );
}

function getTypeLabel(type) {
  const labels = {
    receive: "إيداع",
    deposit: "إيداع",
    send: "سحب",
    withdrawal: "سحب",
    withdraw: "سحب",
    transfer: "تحويل",
    exchange: "صرف",
    expense: "مصروف",
    other: "أخرى",
  };

  return labels[type] || type;
}

function getExportId(res) {
  return (
    res?.data?.id ||
    res?.data?.job_id ||
    res?.data?.export_id ||
    res?.data?.uuid ||
    res?.id ||
    res?.job_id ||
    res?.export_id ||
    res?.uuid
  );
}

function getExportStatus(res) {
  return (
    res?.data?.status ||
    res?.status ||
    res?.data?.state ||
    res?.state ||
    "pending"
  );
}

function getFileExtension(format) {
  return format === "excel" ? "xlsx" : "pdf";
}

function getMimeType(format) {
  if (format === "excel") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/pdf";
}

function ReportsPage() {
  const toast = useToast();
  const today = getToday();
  const currentMonth = getCurrentMonth();

  const [reportType, setReportType] = useState("daily");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      let res;

      if (reportType === "monthly") {
        const monthValue = dateFrom.length === 7 ? dateFrom : currentMonth;
        const [year, month] = monthValue.split("-");

        res = await reportsService.monthly({
          year,
          month,
        });
      } else {
        res = await reportsService.daily({
          date: dateFrom,
          date_from: dateFrom,
          date_to: dateTo,
        });
      }

      setData(unwrapData(res));
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reportType, dateFrom, dateTo]);

  function handleReportTypeChange(value) {
    setReportType(value);

    if (value === "monthly") {
      setDateFrom(currentMonth);
      return;
    }

    setDateFrom(today);
    setDateTo(today);
  }

  function buildExportPayload(format) {
    if (reportType === "monthly") {
      const monthValue = dateFrom.length === 7 ? dateFrom : currentMonth;
      const [year, month] = monthValue.split("-");

      return {
        type: "monthly",
        format,
        params: {
          year,
          month,
        },
      };
    }

    return {
      type: "daily",
      format,
      params: {
        date: dateFrom,
        date_from: dateFrom,
        date_to: dateTo,
      },
    };
  }

  async function handleExport(format) {
    if (exporting) return;

    setExporting(true);

    try {
      const payload = buildExportPayload(format);
      const res = await reportsService.queueExport(payload);
      const exportId = getExportId(res);

      if (!exportId) {
        toast.error("لم يتم استلام رقم ملف التصدير من الخادم");
        setExporting(false);
        return;
      }

      toast.info("جارٍ تجهيز الملف...");
      await pollExport(exportId, format);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
    }
  }

  async function pollExport(id, format, attempts = 0) {
    if (attempts > 30) {
      toast.error("انتهت مهلة التصدير");
      setExporting(false);
      return;
    }

    try {
      const res = await reportsService.exportStatus(id);
      const status = getExportStatus(res);

      if (["ready", "completed", "done", "success", "finished"].includes(status)) {
        const file = await reportsService.exportDownload(id);
        const extension = getFileExtension(format);
        const fileName =
          res?.data?.filename ||
          res?.filename ||
          `${reportType}-report-${dateFrom}.${extension}`;

        const blob = new Blob([file.data], { type: getMimeType(format) });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);

        toast.success("تم تحميل الملف بنجاح");
        setExporting(false);
        return;
      }

      if (["failed", "error", "cancelled"].includes(status)) {
        toast.error("فشل التصدير");
        setExporting(false);
        return;
      }

      setTimeout(() => {
        pollExport(id, format, attempts + 1);
      }, 2000);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
    }
  }

  const summary = useMemo(() => getSummary(data), [data]);

  const totalDeposits = toNumber(
    summary.total_deposits ??
      summary.total_receive ??
      summary.receive ??
      summary.received ??
      summary.deposits ??
      summary.income ??
      0
  );

  const totalWithdrawals = toNumber(
    summary.total_withdrawals ??
      summary.total_send ??
      summary.send ??
      summary.delivered ??
      summary.withdrawals ??
      summary.expense ??
      0
  );

  const netMovement = toNumber(
    summary.net ??
      summary.net_movement ??
      summary.balance ??
      summary.net_usd_value ??
      totalDeposits - totalWithdrawals
  );

  const transactionsCount = toNumber(
    summary.transactions_count ??
      summary.count ??
      summary.total_transactions ??
      summary.transactions ??
      0
  );

  const depositsChange = toNumber(summary.deposits_change ?? summary.receive_change ?? 0);
  const withdrawalsChange = toNumber(summary.withdrawals_change ?? summary.send_change ?? 0);

  const breakdown = useMemo(() => normalizeBreakdown(data), [data]);
  const topTxns = useMemo(() => normalizeTopTransactions(data), [data]);
  const chartData = useMemo(() => normalizeChart(data), [data]);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700 shadow-sm">
              <ChartNoAxesColumnIncreasing className="h-7 w-7" />
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900">التقارير</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                تقارير شاملة لأداء العمليات المالية والحركة اليومية
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative">
            <label className="mb-1.5 block text-right text-xs font-bold text-slate-600">
              نوع التقرير
            </label>
            <select
              value={reportType}
              onChange={(e) => handleReportTypeChange(e.target.value)}
              className="h-10 w-44 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <Filter className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <label className="mb-1.5 block text-right text-xs font-bold text-slate-600">
              {reportType === "monthly" ? "الشهر" : "من تاريخ"}
            </label>
            <input
              type={reportType === "monthly" ? "month" : "date"}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);

                if (reportType === "daily" && dateTo < e.target.value) {
                  setDateTo(e.target.value);
                }
              }}
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {reportType === "daily" && (
            <div className="relative">
              <label className="mb-1.5 block text-right text-xs font-bold text-slate-600">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none"
              />
            </div>
          )}

          <div className="mr-auto flex items-end gap-2">
            <motion.button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={exporting || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? "جارٍ التصدير..." : "تصدير Excel"}
            </motion.button>

            <motion.button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={exporting || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {exporting ? "جارٍ التصدير..." : "تصدير PDF"}
            </motion.button>

            <motion.button
              type="button"
              onClick={load}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </motion.button>
          </div>
        </div>
      </div>

      {error && !loading ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <>
          <motion.section
            className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <EnhancedStatCard
              title="إجمالي الإيداعات"
              value={totalDeposits}
              currency="USD"
              icon={DollarSign}
              color="emerald"
              change={depositsChange}
              changeDir="up"
            />

            <EnhancedStatCard
              title="إجمالي السحوبات"
              value={totalWithdrawals}
              currency="USD"
              icon={ArrowDown}
              color="rose"
              change={withdrawalsChange}
              changeDir="down"
            />

            <EnhancedStatCard
              title="صافي الحركة"
              value={netMovement}
              currency="USD"
              icon={TrendingUp}
              color="blue"
            />

            <EnhancedStatCard
              title="عدد المعاملات"
              value={transactionsCount}
              icon={Activity}
              color="violet"
              note="معاملة"
              isCount
            />
          </motion.section>

          <motion.div
            className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.5fr_1fr]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 flex items-center gap-2 text-right text-base font-black text-slate-900">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                تصنيف الحركة حسب النوع
              </h3>
              <BreakdownDonut data={breakdown} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 flex items-center gap-2 text-right text-base font-black text-slate-900">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                الحركة اليومية (صافي الحركة)
              </h3>
              {chartData.length > 0 ? (
                <DailyChart data={chartData} />
              ) : (
                <EmptyState title="لا توجد بيانات للرسم البياني" />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 flex items-center gap-2 text-right text-base font-black text-slate-900">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                أكبر المعاملات
              </h3>
              {topTxns.length === 0 ? (
                <EmptyState title="لا توجد معاملات" />
              ) : (
                <div className="space-y-3">
                  {topTxns.slice(0, 5).map((t, idx) => {
                    const positive = ["receive", "deposit"].includes(t.type);

                    return (
                      <motion.div
                        key={t.id || idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <Badge color={positive ? "emerald" : "rose"}>
                            {positive ? "إيداع" : "سحب"}
                          </Badge>

                          <div className="text-right">
                            <p
                              dir="ltr"
                              className={`font-mono text-base font-black tabular-nums ${
                                positive ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {positive ? "+" : "-"}
                              {formatMoney(t.amount)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {t.currency_code || "USD"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <p dir="ltr" className="font-mono text-slate-400">
                            {t.reference_number || `#${t.id || idx + 1}`}
                          </p>
                          <p className="text-slate-500">
                            {new Date(t.created_at || Date.now()).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {breakdown.length > 0 && (
            <motion.div
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <h3 className="flex items-center gap-2 text-right text-base font-black text-slate-900">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ملخص التقرير حسب الفئات
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b-2 border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        نوع الحركة
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        عدد المعاملات
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        إجمالي الإيداعات
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        إجمالي السحوبات
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        صافي الحركة
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-700">
                        النسبة من الإجمالي
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {breakdown.map((b, idx) => (
                      <motion.tr
                        key={`${b.type}-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <Badge
                            color={
                              b.type === "receive" || b.type === "deposit"
                                ? "emerald"
                                : b.type === "send" || b.type === "withdrawal"
                                  ? "rose"
                                  : "blue"
                            }
                          >
                            {b.label || getTypeLabel(b.type)}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right text-base font-bold text-slate-900">
                          {b.count || 0}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-semibold text-emerald-600" dir="ltr">
                            {formatMoney(b.deposits || 0)} {b.currency || b.currency_code || "USD"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-semibold text-rose-600" dir="ltr">
                            {formatMoney(b.withdrawals || 0)} {b.currency || b.currency_code || "USD"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-base font-black text-slate-900" dir="ltr">
                            {formatMoney(b.net || 0)} {b.currency || b.currency_code || "USD"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-base font-bold text-slate-700">
                              {(b.percentage || 0).toFixed(1)}%
                            </span>
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                                style={{ width: `${Math.min(b.percentage || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function EnhancedStatCard({
  title,
  value,
  currency,
  icon: Icon,
  color,
  change,
  changeDir,
  note,
  isCount = false,
}) {
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  const colorStyles = {
    emerald: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      border: "hover:border-emerald-300",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      border: "hover:border-rose-300",
    },
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      border: "hover:border-blue-300",
    },
    violet: {
      iconBg: "bg-violet-50",
      iconText: "text-violet-600",
      border: "hover:border-violet-300",
    },
  };

  const c = colorStyles[color] || colorStyles.blue;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${c.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-right">
          <p className="text-sm font-bold text-slate-500">{title}</p>

          <div className="mt-5 text-right">
            <p className="font-mono text-4xl font-black tabular-nums text-slate-900" dir="ltr">
              {isCount ? toNumber(value) : formatMoney(toNumber(value))}
              {!isCount && (
                <span className="mr-1 text-base font-bold text-slate-500">
                  {currencySymbol}
                </span>
              )}
            </p>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-400">{note || currency || ""}</p>

          {change !== undefined && change !== 0 && (
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <span className="text-xs text-slate-500">عن الفترة السابقة</span>
              <span
                className={`flex items-center gap-1 text-xs font-black ${
                  changeDir === "up" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {changeDir === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${c.iconBg} ${c.iconText}`}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </motion.div>
  );
}

function BreakdownDonut({ data }) {
  if (!data || data.length === 0) return <EmptyState title="لا توجد بيانات" />;

  const total = data.reduce((a, b) => a + (b.count || 0), 0);
  const colors = ["#10b981", "#e11d48", "#2563eb", "#f59e0b", "#8b5cf6"];
  let cumulative = 0;

  const segments = data.map((d, i) => {
    const pct = total > 0 ? ((d.count || 0) / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="16" />

          {segments.map((s, i) => {
            const circ = 2 * Math.PI * 40;
            const dasharray = `${(s.pct / 100) * circ} ${circ}`;
            const offset = -((s.start / 100) * circ);

            return (
              <motion.circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeDasharray={dasharray}
                strokeDashoffset={offset}
                initial={{ strokeDashoffset: -circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-slate-900">{total}</p>
          <p className="text-xs font-semibold text-slate-500">معاملة</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 text-right">
        {segments.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs font-bold tabular-nums text-slate-700">
                {s.count}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                ({s.pct.toFixed(1)}%)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                {s.label || getTypeLabel(s.type)}
              </span>
              <div
                className="h-3 w-3 rounded-full shadow-sm transition-transform group-hover:scale-110"
                style={{ background: s.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DailyChart({ data }) {
  const chartData = data.slice(0, 14);
  const values = chartData.map((d) => Number(d.net || d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return (
    <div className="relative h-64 w-full">
      <div className="absolute bottom-0 right-0 top-0 flex flex-col justify-between pr-2 text-xs font-mono text-slate-400">
        <span>{formatMoney(max)}</span>
        <span>{formatMoney((max + min) / 2)}</span>
        <span>{formatMoney(min)}</span>
      </div>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full pl-12"
      >
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#f1f5f9"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {chartData.map((d, i) => {
          const v = Number(d.net || d.value || 0);
          const normalizedHeight = ((v - min) / range) * 80;
          const barWidth = 100 / Math.min(14, chartData.length) - 1.5;
          const x = (i / Math.min(14, chartData.length)) * 100 + 0.75;

          return (
            <motion.rect
              key={i}
              x={x}
              y={90 - normalizedHeight}
              width={barWidth}
              height={normalizedHeight}
              fill={v >= 0 ? "url(#gradient-positive)" : "url(#gradient-negative)"}
              rx="1"
              initial={{ height: 0, y: 90 }}
              animate={{ height: normalizedHeight, y: 90 - normalizedHeight }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
            />
          );
        })}

        <motion.polyline
          points={chartData
            .map((d, i, arr) => {
              const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
              const y = 90 - (((Number(d.net || d.value || 0) - min) / range) * 80);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#059669"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          vectorEffect="non-scaling-stroke"
        />

        <defs>
          <linearGradient id="gradient-positive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="gradient-negative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute bottom-0 left-0 right-0 flex justify-between pl-12 pt-2 text-xs font-mono text-slate-400">
        {chartData.map((d, i) => {
          if (i % Math.ceil(chartData.length / 7 || 1) !== 0) return null;

          const date = d.date ? new Date(d.date) : new Date();

          return (
            <span key={i}>
              {date.getDate()}/{date.getMonth() + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default ReportsPage;