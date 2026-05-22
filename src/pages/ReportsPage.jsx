import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChartNoAxesColumnIncreasing, FileText, FileSpreadsheet, RefreshCw,
  ArrowDown, DollarSign, Activity, TrendingUp, ArrowUpRight, ArrowDownRight,
  Filter
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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function ReportsPage() {
  const toast = useToast();
  const today = new Date().toISOString().split("T")[0];
  
  const [reportType, setReportType] = useState("daily");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [currency, setCurrency] = useState("USD");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = reportType === "monthly"
        ? await reportsService.monthly({ month: dateFrom.slice(0, 7) }).catch(() => null)
        : await reportsService.daily(dateFrom).catch(() => null);
      setData(res?.data || res || null);
    } catch (err) { 
      setError(err); 
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { load(); }, [reportType, dateFrom]);

  async function handleExport(format) {
    setExporting(true);
    try {
      const res = await reportsService.queueDailyPdfExport({ 
        date: dateFrom, 
        format,
        currency 
      });
      const exportId = res?.data?.id || res?.id;
      if (exportId) {
        toast.info("جارٍ تجهيز الملف...");
        pollExport(exportId, format);
      }
    } catch (err) { 
      toast.error(extractApiError(err)); 
    } finally { 
      setExporting(false); 
    }
  }

  async function pollExport(id, format, attempts = 0) {
    if (attempts > 30) return toast.error("انتهت مهلة التصدير");
    try {
      const res = await reportsService.exportStatus(id);
      const status = res?.data?.status || res?.status;
      if (status === "completed") {
        const file = await reportsService.exportDownload(id);
        const url = window.URL.createObjectURL(file.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${dateFrom}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("تم تحميل الملف بنجاح");
      } else if (status === "failed") {
        toast.error("فشل التصدير");
      } else {
        setTimeout(() => pollExport(id, format, attempts + 1), 2000);
      }
    } catch { 
      toast.error("تعذّر فحص حالة التصدير"); 
    }
  }

  // API mapping
  const summary = data?.summary || data || {};
  const totalDeposits = toNumber(summary.total_deposits ?? summary.received ?? summary.deposits ?? 0);
  const totalWithdrawals = toNumber(summary.total_withdrawals ?? summary.delivered ?? summary.withdrawals ?? 0);
  const netMovement = toNumber(summary.net ?? summary.net_movement ?? (totalDeposits - totalWithdrawals));
  const transactionsCount = toNumber(summary.transactions_count ?? summary.count ?? summary.total_transactions ?? 0);
  const depositsChange = toNumber(summary.deposits_change ?? 0);
  const withdrawalsChange = toNumber(summary.withdrawals_change ?? 0);
  
  const breakdown = data?.breakdown || [];
  const topTxns = data?.top_transactions || [];
  const chartData = data?.chart || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700 shadow-sm">
              <ChartNoAxesColumnIncreasing className="h-7 w-7" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900">التقارير</h1>
              <p className="text-sm text-slate-500 mt-0.5">تقارير شاملة لأداء العمليات المالية والحركة اليومية</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          {/* Report type */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">نوع التقرير</label>
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)} 
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none appearance-none cursor-pointer"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-9 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Currency */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">العملة</label>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              className="h-10 w-40 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none appearance-none cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <DollarSign className="absolute left-3 top-9 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Date */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">
              {reportType === "monthly" ? "الشهر" : "من تاريخ"}
            </label>
            <input 
              type={reportType === "monthly" ? "month" : "date"}
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {reportType === "daily" && (
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 text-right">إلى تاريخ</label>
              <input 
                type="date"
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="h-10 w-44 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:border-teal-400 focus:outline-none"
              />
              </div>
          )}

          <div className="mr-auto flex items-end gap-2">
            {/* Excel export */}
            <motion.button 
              type="button" 
              onClick={() => handleExport("excel")} 
              disabled={exporting || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </motion.button>

            {/* PDF export */}
            <motion.button 
              type="button" 
              onClick={() => handleExport("pdf")} 
              disabled={exporting || loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              تصدير PDF
            </motion.button>

            {/* Refresh */}
            <motion.button 
              type="button" 
              onClick={load}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      {error && !loading ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <motion.section 
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Deposits */}
            <EnhancedStatCard
              title="إجمالي الإيداعات"
              value={totalDeposits}
              currency={currency}
              icon={DollarSign}
              gradient="from-emerald-500 to-teal-600"
              color="emerald"
              change={depositsChange}
              changeDir="up"
            />

            {/* Withdrawals */}
            <EnhancedStatCard
              title="إجمالي السحوبات"
              value={totalWithdrawals}
              currency={currency}
              icon={ArrowDown}
              gradient="from-rose-500 to-red-600"
              color="rose"
              change={withdrawalsChange}
              changeDir="down"
            />

            {/* Net */}
            <EnhancedStatCard
              title="صافي الحركة"
              value={netMovement}
              currency={currency}
              icon={TrendingUp}
              gradient="from-blue-500 to-indigo-600"
              color="blue"
            />

            {/* Count */}
            <EnhancedStatCard
              title="عدد المعاملات"
              value={transactionsCount}
              icon={Activity}
              gradient="from-violet-500 to-purple-600"
              color="violet"
              note="معاملة"
              isCount
            />
          </motion.section>

          {/* Main grid */}
          <motion.div 
            className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.5fr_1fr] mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Donut chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 text-right text-base font-black text-slate-900 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                تصنيف الحركة حسب النوع
              </h3>
              <BreakdownDonut data={breakdown} />
            </div>

            {/* Movement chart */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 text-right text-base font-black text-slate-900 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                الحركة اليومية (صافي الحركة)
              </h3>
              {chartData.length > 0 ? (
                <DailyChart data={chartData} />
              ) : (
                <EmptyState title="لا توجد بيانات للرسم البياني" />
              )}
            </div>

            {/* Top transactions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="mb-6 text-right text-base font-black text-slate-900 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                أكبر المعاملات
              </h3>
              {topTxns.length === 0 ? (
                <EmptyState title="لا توجد معاملات" />
              ) : (
                <div className="space-y-3">
                  {topTxns.slice(0, 5).map((t, idx) => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge color={["receive", "deposit"].includes(t.type) ? "emerald" : "rose"}>
                          {["receive", "deposit"].includes(t.type) ? "إيداع" : "سحب"}
                        </Badge>
                        <div className="text-right">
                          <p dir="ltr" className={`font-mono text-base font-black tabular-nums ${["receive", "deposit"].includes(t.type) ? "text-emerald-600" : "text-rose-600"}`}>
                            {["receive", "deposit"].includes(t.type) ? "+" : "-"}{formatMoney(t.amount)}
                          </p>
                          <p className="text-xs text-slate-500 font-semibold">{t.currency_code || currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <p dir="ltr" className="font-mono text-slate-400">{t.reference_number || `#${t.id}`}</p>
                        <p className="text-slate-500">{new Date(t.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Breakdown table */}
          {breakdown.length > 0 && (
            <motion.div 
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <h3 className="text-right text-base font-black text-slate-900 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ملخص التقرير حسب الفئات
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">نوع الحركة</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">عدد المعاملات</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">إجمالي الإيداعات</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">إجمالي السحوبات</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">صافي الحركة</th>
                      <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wide">النسبة من الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.map((b, idx) => (
                      <motion.tr 
                        key={b.type}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <Badge color={b.type === "receive" ? "emerald" : b.type === "send" ? "rose" : "blue"}>
                            {b.label || b.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 text-base">{b.count || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-emerald-600 font-semibold" dir="ltr">
                            {formatMoney(b.deposits || 0)} {b.currency || currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-rose-600 font-semibold" dir="ltr">
                            {formatMoney(b.withdrawals || 0)} {b.currency || currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-black text-slate-900 text-base" dir="ltr">
                            {formatMoney(b.net || 0)} {b.currency || currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-slate-700 font-bold text-base">{(b.percentage || 0).toFixed(1)}%</span>
                            <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                                style={{ width: `${b.percentage || 0}%` }}
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

// Stat card
function EnhancedStatCard({ title, value, currency, icon: Icon, color, change, changeDir, note, isCount = false }) {
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
            <p
              className="font-mono text-4xl font-black tabular-nums text-slate-900"
              dir="ltr"
            >
              {formatMoney(toNumber(value))}
              {!isCount && <span className="mr-1 text-base font-bold text-slate-500">{currencySymbol}</span>}
            </p>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-400">{note || currency || ""}</p>

          {change !== undefined && change !== 0 && (
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <span className="text-xs text-slate-500">عن الفترة السابقة</span>
              <span className={`flex items-center gap-1 text-xs font-black ${changeDir === "up" ? "text-emerald-600" : "text-rose-600"}`}>
                {changeDir === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${c.iconBg} ${c.iconText}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </motion.div>
  );
}

// Donut chart
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
          <p className="text-xs text-slate-500 font-semibold">معاملة</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 text-right">
        {segments.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                {s.count}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                ({s.pct.toFixed(1)}%)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                {s.label || s.type}
              </span>
              <div 
                className="h-3 w-3 rounded-full shadow-sm group-hover:scale-110 transition-transform" 
                style={{ background: s.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Daily chart
function DailyChart({ data }) {
  const values = data.map((d) => Number(d.net || d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const chartData = data.slice(0, 14);

  return (
    <div className="relative h-64 w-full">
      {/* Y-axis */}
      <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-xs font-mono text-slate-400 pr-2">
        <span>{formatMoney(max)}</span>
        <span>{formatMoney((max + min) / 2)}</span>
        <span>{formatMoney(min)}</span>
      </div>

      {/* Chart */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full pl-12">
        {/* Grid */}
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

        {/* Bars */}
        {chartData.map((d, i) => {
          const v = Number(d.net || d.value || 0);
          const normalizedHeight = ((v - min) / range) * 80;
          const barWidth = (100 / Math.min(14, chartData.length)) - 1.5;
          const x = (i / Math.min(14, chartData.length)) * 100 + 0.75;
          
          return (
            <g key={i}>
              <motion.rect
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
            </g>
          );
        })}

        {/* Line */}
        <motion.polyline
          points={chartData.map((d, i, arr) => {
            const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
            const y = 90 - (((Number(d.net || d.value || 0) - min) / range) * 80);
            return `${x},${y}`;
          }).join(" ")}
          fill="none"
          stroke="#059669"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          vectorEffect="non-scaling-stroke"
        />

        {/* Gradients */}
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

      {/* X-axis */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs font-mono text-slate-400 pt-2 pl-12">
        {chartData.map((d, i) => {
          if (i % Math.ceil(chartData.length / 7) !== 0) return null;
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