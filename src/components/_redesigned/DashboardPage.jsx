import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CirclePlus,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import AnimatedNumber from "../shared/AnimatedNumber";
import ScrollReveal from "../shared/ScrollReveal";
import dashboardService from "../services/dashboard";

// Period filter options
const PERIODS = [
  { key: "1d", label: "اليوم" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر شهر" },
];

// API summary -> stat cards
function buildStats(s) {
  if (!s) return defaultStats;
  return [
    {
      title: "الصافي",
      value: s.net_today ?? s.net ?? 0,
      prefix: "$",
      note: "فائض نقدي متاح",
      change: s.net_change || "+0%",
      icon: Activity,
      color: "cyan",
    },
    {
      title: "إجمالي التسليم",
      value: s.delivered_today ?? s.delivered ?? 0,
      prefix: "$",
      note: "معدل مستقر",
      change: s.delivered_change || "+0%",
      icon: ArrowUp,
      color: "rose",
    },
    {
      title: "إجمالي الاستلام",
      value: s.received_today ?? s.received ?? 0,
      prefix: "$",
      note: "معدل إيجابي",
      change: s.received_change || "+0%",
      icon: ArrowDown,
      color: "blue",
    },
    {
      title: "الرصيد الحالي",
      value: s.total_balance ?? s.balance ?? 0,
      prefix: "$",
      note: "هذا الأسبوع",
      change: s.balance_change || "+0%",
      icon: Wallet,
      color: "violet",
    },
  ];
}

// Fallback data
const defaultStats = [
  { title: "الصافي", value: 400000, prefix: "$", note: "فائض نقدي متاح", change: "+4.2%", icon: Activity, color: "cyan" },
  { title: "إجمالي التسليم", value: 850000, prefix: "$", note: "معدل مستقر", change: "+2.1%", icon: ArrowUp, color: "rose" },
  { title: "إجمالي الاستلام", value: 1250000, prefix: "$", note: "معدل إيجابي", change: "+7.8%", icon: ArrowDown, color: "blue" },
  { title: "الرصيد الحالي", value: 24500000, prefix: "$", note: "هذا الأسبوع", change: "+2.4%", icon: Wallet, color: "violet" },
];

const defaultChart = [
  { day: "اليوم", received: 95, delivered: 60 },
  { day: "الخميس", received: 70, delivered: 45 },
  { day: "الأربعاء", received: 85, delivered: 70 },
  { day: "الثلاثاء", received: 60, delivered: 40 },
  { day: "الإثنين", received: 75, delivered: 55 },
  { day: "الأحد", received: 55, delivered: 35 },
  { day: "السبت", received: 80, delivered: 65 },
];

const rates = [
  { pair: "USD/SAR", value: "3.7510", change: "+0.12%", flag: "US" },
  { pair: "EUR/SAR", value: "4.0850", change: "+0.15%", flag: "EU" },
  { pair: "TRY/SAR", value: "0.1150", change: "-0.00%", flag: "TR" },
  { pair: "GBP/SAR", value: "4.7200", change: "+0.11%", flag: "GB" },
];

const recentTxns = [
  { id: "TRX-001#", client: "شركة الأفق للتجارة", type: "استلام", amount: "150,000", currency: "USD", status: "مكتمل" },
  { id: "TRX-002#", client: "مؤسسة النور", type: "تسليم", amount: "75,000", currency: "EUR", status: "معلق" },
  { id: "TRX-003#", client: "أحمد المحمود", type: "استلام", amount: "20,000", currency: "TRY", status: "مكتمل" },
];

// Motion variants
const containerStagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(defaultStats);
  const [chartData, setChartData] = useState(defaultChart);
  const [period, setPeriod] = useState("7d"); // 1d | 7d | 30d
  const [loading, setLoading] = useState(true);

  // Refetch on period change
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [summaryRes, chartRes] = await Promise.all([
          dashboardService.summary(period).catch((e) => {
            console.warn("summary error:", e);
            return null;
          }),
          dashboardService.chart(period).catch((e) => {
            console.warn("chart error:", e);
            return null;
          }),
        ]);

        if (cancelled) return;

        if (summaryRes) {
          setStats(buildStats(summaryRes.data || summaryRes));
        }
        if (chartRes) {
          const arr = chartRes.data || chartRes;
          if (Array.isArray(arr) && arr.length > 0) setChartData(arr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ScrollReveal>
          <div className="min-w-0 text-right">
            <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              لوحة التحكم
            </h1>
            <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
              نظرة عامة على أداء الصرافة
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className="flex shrink-0 items-center gap-2">
            {/* Period filter */}
            <PeriodSelector period={period} onChange={setPeriod} />

            {/* Add transaction */}
            <button
              type="button"
              onClick={() => navigate("/add-transaction")}
              className="whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-slate-700 active:bg-slate-900 sm:px-5 sm:py-3 sm:text-sm"
            >
              + إضافة عملية
            </button>
          </div>
        </ScrollReveal>
      </div>

      {/* Stats */}
      <motion.section
        key={period} // Re-trigger animation on filter change
        variants={containerStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4"
      >
        {stats.map((item) => (
          <motion.div key={item.title} variants={fadeUp}>
            <StatCard item={item} loading={loading} />
          </motion.div>
        ))}
      </motion.section>

      {/* Main content */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <ScrollReveal delay={0.1}>
            <FinancialChart data={chartData} period={period} />
          </ScrollReveal>
          <ScrollReveal delay={0.14}>
            <RecentTransactions />
          </ScrollReveal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 xl:auto-rows-fr">
          <ScrollReveal delay={0.08} className="h-full">
            <QuickActions />
          </ScrollReveal>
          <ScrollReveal delay={0.12} className="h-full">
            <ExchangeRates />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Period selector ---------------- */
function PeriodSelector({ period, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {PERIODS.map((p) => {
        const active = period === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className={[
              "whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold transition-all duration-200 sm:text-xs",
              active
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            ].join(" ")}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({ item, loading }) {
  const Icon = item.icon;

  const colors = {
    cyan: { fill: "#f0fdfa", border: "#99f6e4", text: "#0d9488", glow: "rgba(45,212,191,0.22)" },
    blue: { fill: "#ecfeff", border: "#a5f3fc", text: "#0891b2", glow: "rgba(34,211,238,0.20)" },
    rose: { fill: "#f0fdfa", border: "#5eead4", text: "#0f766e", glow: "rgba(45,212,191,0.22)" },
    violet: { fill: "#ccfbf1", border: "#5eead4", text: "#115e59", glow: "rgba(20,184,166,0.20)" },
  };
  const c = colors[item.color];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-500 hover:border-teal-400/40 hover:shadow-[0_14px_30px_-16px_rgba(30,41,59,0.20)]"
    >
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: c.glow }}
      />
      {/* Top accent line */}
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-[2px] origin-left scale-x-0 rounded-full transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(to left, ${c.text}, transparent)` }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div
          className="rounded-xl border p-3 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-4deg]"
          style={{ background: c.fill, borderColor: c.border, color: c.text }}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">{item.title}</p>
          <div className="mt-5 text-3xl font-black text-slate-800 sm:text-4xl">
            {loading ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded bg-slate-100" />
            ) : (
              <AnimatedNumber value={item.value} prefix={item.prefix} />
            )}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-xs">
            <span className="font-bold text-emerald-600">{item.change}</span>
            <span className="text-slate-400">{item.note}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Quick actions ---------------- */
function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "إضافة استلام",
      icon: ArrowDown,
      bg: "#f0fdfa",
      border: "#99f6e4",
      text: "#0f766e",
      onClick: () => navigate("/add-transaction?type=receive"),
    },
    {
      label: "إضافة تسليم",
      icon: ArrowUp,
      bg: "#ecfeff",
      border: "#a5f3fc",
      text: "#0e7490",
      onClick: () => navigate("/add-transaction?type=deliver"),
    },
    {
      label: "عميل جديد",
      icon: CirclePlus,
      bg: "#f0fdfa",
      border: "#5eead4",
      text: "#115e59",
      onClick: () => navigate("/customers?action=add"),
    },
  ];

  return (
    <Panel title="إجراءات سريعة">
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              type="button"
              onClick={action.onClick}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-300"
              style={{ background: action.bg, borderColor: action.border, color: action.text }}
            >
              <span className="relative z-10">{action.label}</span>
              <Icon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]" />
              <span className="pointer-events-none absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/50 blur-md transition-all duration-700 group-hover:left-[120%]" />
            </motion.button>
          );
        })}
      </div>
    </Panel>
  );
}

/* ---------------- Exchange rates ---------------- */
function ExchangeRates() {
  return (
    <Panel title="أسعار الصرف">
      <div className="flex flex-1 flex-col justify-between gap-2">
        {rates.map((rate, index) => (
          <motion.div
            key={rate.pair}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            whileHover={{ x: -2 }}
            className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 transition-all duration-300 hover:border-teal-400/40 hover:bg-white hover:shadow-[0_6px_18px_-8px_rgba(45,212,191,0.30)]"
          >
            <span className={`text-xs font-black ${rate.change.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>
              {rate.change}
            </span>
            <div className="text-right">
              <div className="font-mono text-sm font-black text-slate-900 tabular-nums">{rate.value}</div>
              <div className="text-xs text-slate-500">{rate.flag} {rate.pair}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Financial chart ---------------- */
function FinancialChart({ data, period }) {
  const periodLabel =
    PERIODS.find((p) => p.key === period)?.label || "آخر 7 أيام";

  return (
    <Panel
      title="التحليلات المالية"
      subtitle={`مقارنة حركة النقد خلال ${periodLabel}`}
    >
      {/* Legend */}
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-4 rounded-sm bg-slate-700" />
          استلام
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-4 rounded-sm bg-slate-300" />
          تسليم
        </span>
      </div>

      {/* Bars */}
      <div className="relative flex h-72 items-end justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-6 sm:gap-4 sm:px-5">
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-x-3 top-6 bottom-10 sm:inset-x-5">
          <div className="absolute inset-x-0 top-0 h-px bg-slate-100" />
          <div className="absolute inset-x-0 top-1/4 h-px bg-slate-100" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-slate-100" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200" />
        </div>

        {data.map((day, index) => (
          <div key={`${period}-${index}`} className="relative z-10 group flex flex-1 flex-col items-center">
            <div className="mb-3 flex h-52 items-end gap-1 sm:gap-1.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${day.received}%` }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "bottom", background: "#1e293b" }}
                className="w-3 rounded-t-sm transition-colors duration-200 hover:bg-slate-700 sm:w-5"
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${day.delivered}%` }}
                transition={{ duration: 0.7, delay: index * 0.05 + 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "bottom", background: "#cbd5e1" }}
                className="w-3 rounded-t-sm transition-colors duration-200 hover:bg-slate-400 sm:w-5"
              />
            </div>
            <span className="text-[10px] font-medium text-slate-500 transition-colors duration-200 group-hover:text-slate-800 sm:text-xs">
              {day.day || day.label || ""}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Recent transactions ---------------- */
function RecentTransactions() {
  const navigate = useNavigate();

  return (
    <Panel
      title="آخر الحركات"
      action={
        <button
          type="button"
          onClick={() => navigate("/transactions")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          عرض الكل
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 font-medium">الحالة</th>
              <th className="pb-3 font-medium">العملة</th>
              <th className="pb-3 font-medium">المبلغ</th>
              <th className="pb-3 font-medium">النوع</th>
              <th className="pb-3 font-medium">العميل</th>
              <th className="pb-3 font-medium">رقم الحركة</th>
            </tr>
          </thead>
          <tbody>
            {recentTxns.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="group border-b border-slate-100 transition-all duration-300 hover:bg-teal-50/40"
              >
                <td className="py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold transition-all duration-300 group-hover:scale-105 ${row.status === "مكتمل" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3 text-slate-600">{row.currency}</td>
                <td className="py-3 font-bold text-slate-900 tabular-nums">{row.amount}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold transition-all duration-300 group-hover:scale-105 ${row.type === "استلام" ? "bg-teal-50 text-teal-700" : "bg-cyan-50 text-cyan-700"}`}>
                    {row.type}
                  </span>
                </td>
                <td className="py-3 text-slate-700 transition-colors duration-300 group-hover:text-slate-900">{row.client}</td>
                <td className="py-3 font-mono text-slate-400 transition-colors duration-300 group-hover:text-cyan-600">{row.id}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------------- Panel wrapper ---------------- */
function Panel({ title, subtitle, children, action }) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-500 hover:border-teal-400/30 hover:shadow-[0_10px_28px_-16px_rgba(30,41,59,0.18)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3 text-right">
        <div className="flex items-center gap-2">
          {action}
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-teal-300 to-teal-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default DashboardPage;
