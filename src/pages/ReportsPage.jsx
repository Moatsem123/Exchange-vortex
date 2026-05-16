import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChartNoAxesColumnIncreasing, FileText, FileSpreadsheet, RefreshCw,
  ArrowDown, DollarSign, Activity, TrendingUp,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import { useToast } from "../shared/Toast";
import reportsService from "../services/reports";
import { extractApiError, formatMoney } from "../shared/helpers";

const TYPES = [
  { key: "daily", label: "التقرير اليومي" },
  { key: "monthly", label: "التقرير الشهري" },
];

function ReportsPage() {
  const toast = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [reportType, setReportType] = useState("daily");
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = reportType === "monthly"
        ? await reportsService.monthly({ month: date.slice(0, 7) }).catch(() => null)
        : await reportsService.daily(date).catch(() => null);
      setData(res?.data || res || null);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [reportType, date]);

  async function handleExport(format) {
    setExporting(true);
    try {
      const res = await reportsService.queueDailyPdfExport({ date, format });
      const exportId = res?.data?.id || res?.id;
      if (exportId) {
        toast.info("جارٍ تجهيز الملف...");
        pollExport(exportId);
      }
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setExporting(false); }
  }

  async function pollExport(id, attempts = 0) {
    if (attempts > 30) return toast.error("انتهت مهلة التصدير");
    try {
      const res = await reportsService.exportStatus(id);
      const status = res?.data?.status || res?.status;
      if (status === "completed") {
        const file = await reportsService.exportDownload(id);
        const url = window.URL.createObjectURL(file.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${date}.pdf`;
        a.click();
        toast.success("تم تحميل الملف");
      } else if (status === "failed") {
        toast.error("فشل التصدير");
      } else {
        setTimeout(() => pollExport(id, attempts + 1), 2000);
      }
    } catch { toast.error("تعذّر فحص الحالة"); }
  }

  const summary = data?.summary || data || {};
  const breakdown = data?.breakdown || [];
  const topTxns = data?.top_transactions || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="التقارير"
        subtitle="تقارير شاملة لأداء العمليات المالية والحركة اليومية"
        icon={ChartNoAxesColumnIncreasing}
        actions={
          <>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="ep-input h-10 w-40 text-xs appearance-none">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ep-input h-10 w-40 text-xs" />
            <button type="button" onClick={() => handleExport("excel")} disabled={exporting} className="ep-btn ep-btn-primary">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button type="button" onClick={() => handleExport("pdf")} disabled={exporting} className="ep-btn ep-btn-danger">
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
            <button type="button" onClick={load} className="ep-btn ep-btn-ghost">
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </button>
          </>
        }
      />

      {error && !loading ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="ep-skeleton h-32" />)}
          </div>
          <div className="ep-skeleton h-72" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي الإيداعات"
              value={summary.total_deposits || summary.received || 0}
              prefix="$" decimals={2} icon={DollarSign} color="emerald"
              change={summary.deposits_change} changeDir="up"
            />
            <StatCard
              title="إجمالي السحوبات"
              value={summary.total_withdrawals || summary.delivered || 0}
              prefix="$" decimals={2} icon={ArrowDown} color="rose"
              change={summary.withdrawals_change} changeDir="down"
            />
            <StatCard
              title="صافي الحركة"
              value={summary.net || (summary.total_deposits - summary.total_withdrawals) || 0}
              prefix="$" decimals={2} icon={TrendingUp} color="blue"
            />
            <StatCard
              title="عدد المعاملات"
              value={summary.transactions_count || 0}
              icon={Activity} color="violet" note="معاملة"
            />
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.5fr_1fr]">
            <div className="ep-card-static p-5">
              <h3 className="mb-4 text-right text-base font-black text-slate-900">تصنيف الحركة حسب النوع</h3>
              <BreakdownDonut data={breakdown} />
            </div>

            <div className="ep-card-static p-5">
              <h3 className="mb-4 text-right text-base font-black text-slate-900">الحركة اليومية (صافي الحركة)</h3>
              {(data?.chart || []).length > 0 ? (
                <DailyChart data={data.chart} />
              ) : (
                <EmptyState title="لا توجد بيانات للرسم البياني" />
              )}
            </div>

            <div className="ep-card-static p-5">
              <h3 className="mb-4 text-right text-base font-black text-slate-900">أكبر المعاملات</h3>
              {topTxns.length === 0 ? (
                <EmptyState title="لا توجد معاملات" />
              ) : (
                <div className="space-y-2">
                  {topTxns.slice(0, 5).map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <Badge color={["receive", "deposit"].includes(t.type) ? "emerald" : "rose"}>
                          {["receive", "deposit"].includes(t.type) ? "إيداع" : "سحب"}
                        </Badge>
                        <div className="text-right">
                          <p dir="ltr" className={`font-mono text-sm font-black tabular-nums ${["receive", "deposit"].includes(t.type) ? "text-emerald-600" : "text-rose-600"}`}>
                            {["receive", "deposit"].includes(t.type) ? "+" : "-"}{formatMoney(t.amount)}
                          </p>
                          <p className="text-[10px] text-slate-500">{t.currency_code}</p>
                        </div>
                      </div>
                      <p dir="ltr" className="mt-1 text-[11px] text-slate-400 font-mono">{t.reference_number || `#${t.id}`}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {breakdown.length > 0 && (
            <div className="ep-card-static overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-right text-base font-black text-slate-900">ملخص التقرير حسب الفئات</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="ep-table min-w-[800px]">
                  <thead>
                    <tr>
                      <th>نوع الحركة</th>
                      <th>عدد المعاملات</th>
                      <th>إجمالي الإيداعات</th>
                      <th>إجمالي السحوبات</th>
                      <th>صافي الحركة</th>
                      <th>النسبة من الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((b) => (
                      <tr key={b.type}>
                        <td>
                          <Badge color={b.type === "receive" ? "emerald" : b.type === "send" ? "rose" : "blue"}>
                            {b.label || b.type}
                          </Badge>
                        </td>
                        <td className="font-bold text-slate-900">{b.count || 0}</td>
                        <td className="font-mono text-emerald-600">{formatMoney(b.deposits || 0)} {b.currency}</td>
                        <td className="font-mono text-rose-600">{formatMoney(b.withdrawals || 0)} {b.currency}</td>
                        <td className="font-mono font-black text-slate-900">{formatMoney(b.net || 0)} {b.currency}</td>
                        <td className="text-slate-700 font-bold">{(b.percentage || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownDonut({ data }) {
  if (!data || data.length === 0) return <EmptyState title="لا توجد بيانات" />;

  const total = data.reduce((a, b) => a + (b.count || 0), 0);
  const colors = ["#10b981", "#e11d48", "#2563eb", "#f59e0b", "#94a3b8"];
  let cumulative = 0;

  const segments = data.map((d, i) => {
    const pct = total > 0 ? ((d.count || 0) / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {segments.map((s, i) => {
            const circ = 2 * Math.PI * 40;
            const dasharray = `${(s.pct / 100) * circ} ${circ}`;
            const offset = -((s.start / 100) * circ);
            return (
              <motion.circle
                key={i} cx="50" cy="50" r="40" fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={dasharray} strokeDashoffset={offset}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-black text-slate-900">{total}</p>
          <p className="text-[10px] text-slate-500">معاملة</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 text-right">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-700">
              {s.count} ({s.pct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-600">
              <span>{s.label || s.type}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyChart({ data }) {
  const values = data.map((d) => Number(d.net || d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.slice(0, 14).map((d, i, arr) => {
    const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
    const y = 100 - ((Number(d.net || d.value || 0) - min) / range) * 80 - 10;
    return { x, y };
  });

  return (
    <div className="relative h-56 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.3" />
        ))}
        {data.slice(0, 14).map((d, i) => {
          const v = Number(d.net || d.value || 0);
          const h = ((v - min) / range) * 80;
          return (
            <motion.rect
              key={i}
              x={(i / Math.min(14, data.length)) * 100 + 0.5}
              y={90 - h}
              width={(100 / Math.min(14, data.length)) - 1}
              height={h}
              fill={v >= 0 ? "#10b981" : "#e11d48"}
              fillOpacity="0.2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          );
        })}
        <motion.polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#059669" strokeWidth="0.8"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export default ReportsPage;