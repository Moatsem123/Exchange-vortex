import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import AnimatedNumber from "../shared/AnimatedNumber";
import ScrollReveal from "../shared/ScrollReveal";

const periods = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "أسبوع" },
  { id: "month", label: "شهر" },
  { id: "year", label: "سنة" },
];

const stats = [
  {
    title: "إجمالي الإيرادات",
    value: 1250000,
    prefix: "$",
    change: "+12.4%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "إجمالي الاستلام",
    value: 850000,
    prefix: "$",
    change: "+7.8%",
    trend: "up",
    icon: ArrowDown,
  },
  {
    title: "إجمالي التسليم",
    value: 620000,
    prefix: "$",
    change: "-2.1%",
    trend: "down",
    icon: ArrowUp,
  },
  {
    title: "صافي الربح",
    value: 230000,
    prefix: "$",
    change: "+18.6%",
    trend: "up",
    icon: Wallet,
  },
];

const monthlyTrend = [
  { month: "ينا", value: 45 },
  { month: "فبر", value: 60 },
  { month: "مار", value: 52 },
  { month: "أبر", value: 75 },
  { month: "ماي", value: 68 },
  { month: "يون", value: 90 },
  { month: "يول", value: 82 },
  { month: "أغس", value: 95 },
  { month: "سبت", value: 88 },
  { month: "أكت", value: 105 },
  { month: "نوف", value: 100 },
  { month: "ديس", value: 120 },
];

const currencyDistribution = [
  { code: "USD", name: "الدولار الأمريكي", percent: 42, value: 525000 },
  { code: "EUR", name: "اليورو", percent: 23, value: 287500 },
  { code: "AED", name: "الدرهم الإماراتي", percent: 15, value: 187500 },
  { code: "SAR", name: "الريال السعودي", percent: 12, value: 150000 },
  { code: "JOD", name: "الدينار الأردني", percent: 8, value: 100000 },
];

const topCustomers = [
  { id: 1, name: "شركة الأفق للتجارة", txCount: 48, total: 215000, percent: 100 },
  { id: 2, name: "محمد أحمد", txCount: 32, total: 145000, percent: 67 },
  { id: 3, name: "مؤسسة النور", txCount: 28, total: 128000, percent: 60 },
  { id: 4, name: "سارة خالد", txCount: 21, total: 96000, percent: 45 },
  { id: 5, name: "علي محمود", txCount: 15, total: 64000, percent: 30 },
];

const detailRows = [
  { date: "01/05/2026", txCount: 24, received: 45000, delivered: 18000, net: 27000 },
  { date: "02/05/2026", txCount: 19, received: 38000, delivered: 22000, net: 16000 },
  { date: "03/05/2026", txCount: 27, received: 52000, delivered: 21000, net: 31000 },
  { date: "04/05/2026", txCount: 31, received: 61000, delivered: 28000, net: 33000 },
  { date: "05/05/2026", txCount: 22, received: 41000, delivered: 19000, net: 22000 },
  { date: "06/05/2026", txCount: 28, received: 55000, delivered: 24000, net: 31000 },
  { date: "07/05/2026", txCount: 35, received: 68000, delivered: 29000, net: 39000 },
];

function ReportsPage() {
  const [activePeriod, setActivePeriod] = useState("month");

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page header */}
      <ScrollReveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              التقارير
            </h1>
            <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
              تحليل شامل للأداء المالي مع الإحصائيات والاتجاهات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-slate-700">
              <FileText className="h-4 w-4" />
              <span>تصدير PDF</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Period filter */}
      <ScrollReveal delay={0.05}>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-1">
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePeriod(p.id)}
                className={[
                  "rounded-lg px-4 py-2 text-xs font-bold transition-colors duration-200",
                  activePeriod === p.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-white hover:text-slate-900",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>01/05/2026 — 07/05/2026</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Stats grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((item, index) => (
          <ScrollReveal key={item.title} delay={index * 0.06}>
            <ReportStatCard item={item} />
          </ScrollReveal>
        ))}
      </section>

      {/* Trend chart + currency distribution */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ScrollReveal delay={0.1}>
          <TrendChart />
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <CurrencyBreakdown />
        </ScrollReveal>
      </section>

      {/* Top customers + Detailed table */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ScrollReveal delay={0.18}>
          <TopCustomersList />
        </ScrollReveal>

        <ScrollReveal delay={0.22}>
          <DetailedTable />
        </ScrollReveal>
      </section>
    </div>
  );
}

/* ─────────── Stat card ─────────── */

function ReportStatCard({ item }) {
  const Icon = item.icon;
  const isPositive = item.trend === "up";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="text-right">
          <p className="text-xs font-bold text-slate-500">{item.title}</p>
          <div className="mt-3 text-3xl font-black text-slate-800 sm:text-4xl">
            <AnimatedNumber value={item.value} prefix={item.prefix} />
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5 text-xs">
            <span
              className={[
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold",
                isPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
              ].join(" ")}
            >
              {isPositive ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {item.change}
            </span>
            <span className="text-slate-400">عن الفترة السابقة</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Trend chart (line) ─────────── */

function TrendChart() {
  const max = Math.max(...monthlyTrend.map((m) => m.value));
  const min = Math.min(...monthlyTrend.map((m) => m.value));
  const range = max - min || 1;

  const points = useMemo(() => {
    return monthlyTrend.map((m, i) => {
      const x = (i / (monthlyTrend.length - 1)) * 100;
      const y = 100 - ((m.value - min) / range) * 80 - 10;
      return { x, y, value: m.value, month: m.month };
    });
  }, [max, min, range]);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L 100,100 L 0,100 Z`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="text-xs text-slate-500">آخر 12 شهر</div>
        <div className="text-right">
          <h3 className="text-base font-black text-slate-900">اتجاه الإيرادات</h3>
          <p className="mt-1 text-xs text-slate-500">حركة الأداء عبر الزمن</p>
        </div>
      </div>

      <div className="relative h-64 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="0.3"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="#1e293b"
            fillOpacity="0.06"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="#1e293b"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="0.8"
              fill="#1e293b"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.05 }}
            />
          ))}
        </svg>
      </div>

      {/* Month labels */}
      <div className="mt-3 flex items-center justify-between px-1">
        {monthlyTrend.map((m) => (
          <span key={m.month} className="text-[10px] font-medium text-slate-500">
            {m.month}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Currency breakdown ─────────── */

function CurrencyBreakdown() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 text-right">
        <h3 className="text-base font-black text-slate-900">توزيع العملات</h3>
        <p className="mt-1 text-xs text-slate-500">نسبة كل عملة من إجمالي الحركات</p>
      </div>

      <div className="space-y-4">
        {currencyDistribution.map((c, index) => (
          <motion.div
            key={c.code}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 tabular-nums">
                {c.percent}%
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{c.name}</span>
                <span className="font-mono text-xs font-black text-slate-800">
                  {c.code}
                </span>
              </div>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="absolute right-0 top-0 h-full rounded-full bg-slate-700"
                initial={{ width: 0 }}
                whileInView={{ width: `${c.percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.2 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-1 text-left text-[10px] font-mono text-slate-400 tabular-nums">
              ${c.value.toLocaleString("en-US")}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Top customers ─────────── */

function TopCustomersList() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Users className="h-4 w-4 text-slate-400" />
        <div className="text-right">
          <h3 className="text-base font-black text-slate-900">أكبر العملاء</h3>
          <p className="mt-1 text-xs text-slate-500">حسب إجمالي الحركات</p>
        </div>
      </div>

      <div className="space-y-3">
        {topCustomers.map((c, index) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-colors duration-200 hover:border-slate-300 hover:bg-white"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="text-left">
                <div className="font-mono text-sm font-black text-slate-800 tabular-nums">
                  ${c.total.toLocaleString("en-US")}
                </div>
                <div className="text-[10px] text-slate-500">
                  {c.txCount} حركة
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-black text-slate-700">
                  {index + 1}
                </div>
              </div>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="absolute right-0 top-0 h-full rounded-full bg-slate-700"
                initial={{ width: 0 }}
                whileInView={{ width: `${c.percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.2 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <button className="group mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50">
        <span>عرض جميع العملاء</span>
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─────────── Detailed table ─────────── */

function DetailedTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-5">
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" />
          <span>تنزيل CSV</span>
        </button>
        <div className="text-right">
          <h3 className="text-base font-black text-slate-900">التقرير التفصيلي</h3>
          <p className="mt-1 text-xs text-slate-500">حركات الأيام السبعة الأخيرة</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
              <th className="px-5 py-3 text-xs font-bold">التاريخ</th>
              <th className="px-5 py-3 text-center text-xs font-bold">عدد الحركات</th>
              <th className="px-5 py-3 text-center text-xs font-bold">استلام</th>
              <th className="px-5 py-3 text-center text-xs font-bold">تسليم</th>
              <th className="px-5 py-3 text-center text-xs font-bold">الصافي</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.map((row, index) => (
              <motion.tr
                key={row.date}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50"
              >
                <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                  {row.date}
                </td>
                <td className="px-5 py-3 text-center text-xs font-bold text-slate-800 tabular-nums">
                  {row.txCount}
                </td>
                <td className="px-5 py-3 text-center text-xs font-bold text-emerald-600 tabular-nums">
                  ${row.received.toLocaleString("en-US")}
                </td>
                <td className="px-5 py-3 text-center text-xs font-bold text-rose-600 tabular-nums">
                  ${row.delivered.toLocaleString("en-US")}
                </td>
                <td className="px-5 py-3 text-center text-xs font-black text-slate-900 tabular-nums">
                  ${row.net.toLocaleString("en-US")}
                </td>
              </motion.tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-slate-50 font-black">
              <td className="px-5 py-4 text-xs text-slate-700">المجموع</td>
              <td className="px-5 py-4 text-center text-xs text-slate-800 tabular-nums">
                {detailRows.reduce((s, r) => s + r.txCount, 0)}
              </td>
              <td className="px-5 py-4 text-center text-xs text-emerald-700 tabular-nums">
                ${detailRows.reduce((s, r) => s + r.received, 0).toLocaleString("en-US")}
              </td>
              <td className="px-5 py-4 text-center text-xs text-rose-700 tabular-nums">
                ${detailRows.reduce((s, r) => s + r.delivered, 0).toLocaleString("en-US")}
              </td>
              <td className="px-5 py-4 text-center text-xs text-slate-900 tabular-nums">
                ${detailRows.reduce((s, r) => s + r.net, 0).toLocaleString("en-US")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ReportsPage;
