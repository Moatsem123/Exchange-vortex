import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  Activity,
  ChevronLeft,
  Plus,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import ScrollReveal from "../shared/ScrollReveal";
import AddBalanceModal from "../shared/AddBalanceModal";
import { useToast } from "../shared/Toast";
import dashboardService from "../services/dashboard";
import transactionsService from "../services/transactions";
import {
  formatRelative,
  getTransactionTypeMeta,
  unwrapList,
} from "../shared/helpers";

const PERIODS = [
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يوم" },
  { key: "1d", label: "اليوم" },
];

const BALANCE_KEY = "ep_general_balance_v1";

function readBalance() {
  try {
    const v = Number(localStorage.getItem(BALANCE_KEY));
    return isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function writeBalance(v) {
  try {
    localStorage.setItem(BALANCE_KEY, String(Number(v) || 0));
  } catch {}
}

function normalizeChartResponse(response) {
  const payload = response?.data || response || {};

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.labels)) {
    return payload.labels.map((label, index) => ({
      label,
      date: payload.dates?.[index] || label,
      received: Number(
        payload.received?.[index] ??
          payload.receive?.[index] ??
          payload.deposits?.[index] ??
          payload.income?.[index] ??
          0
      ),
      delivered: Number(
        payload.delivered?.[index] ??
          payload.send?.[index] ??
          payload.withdrawals?.[index] ??
          payload.outcome?.[index] ??
          0
      ),
      net: Number(payload.net?.[index] ?? 0),
      count: Number(
        payload.count?.[index] ??
          payload.transactions?.[index] ??
          payload.transactions_count?.[index] ??
          0
      ),
    }));
  }

  if (Array.isArray(payload.chart)) {
    return payload.chart;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

function DashboardPage() {
  const toast = useToast();

  const [period, setPeriod] = useState("7d");
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [balance, setBalance] = useState(readBalance());
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, chartResponse, transactionsResponse] =
        await Promise.all([
          dashboardService.summary(period).catch(() => null),
          dashboardService.chart(period).catch(() => null),
          transactionsService.list({ per_page: 8 }).catch(() => null),
        ]);

      setSummary(summaryResponse?.data || summaryResponse || null);
      setChart(normalizeChartResponse(chartResponse));
      setRecent(unwrapList(transactionsResponse).items.slice(0, 8));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [period]);

  const stats = useMemo(() => buildStats(summary, balance), [summary, balance]);
  const distribution = useMemo(() => computeDistribution(recent), [recent]);

  function handleAddBalance({ amount }) {
    const next = balance + Number(amount);

    setBalance(next);
    writeBalance(next);

    toast.success("تم إضافة الرصيد محليًا فقط - لم يتم حفظه في قاعدة البيانات");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
            <Activity className="h-6 w-6" />
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              لوحة التحكم
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              نظرة عامة على أداء النظام والأنشطة الرئيسية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition"
          style={{ background: "hsl(179, 87%, 28%)" }}
        >
          <Plus className="h-4 w-4" />
          إضافة رصيد
        </button>
      </div>

      {error && !loading ? (
        <div className="ep-card-static">
          <ErrorState title="تعذّر تحميل البيانات" onRetry={load} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s, idx) => (
              <StatCard
                key={s.title}
                {...s}
                loading={loading}
                delay={idx * 0.06}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.6fr]">
            <ScrollReveal>
              <div className="ep-card-static h-full">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="text-base font-black text-slate-900">
                    أحدث المعاملات
                  </h3>

                  <Link
                    to="/transactions"
                    className="flex items-center gap-1 text-xs font-bold text-teal-600 transition hover:text-teal-800"
                  >
                    عرض جميع المعاملات
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <RecentTransactionsList items={recent} loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="ep-card-static h-full p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-right">
                    <h3 className="text-base font-black text-slate-900">
                      الحركة اليومية (صافي الحركة)
                    </h3>
                  </div>

                  <PeriodSelector value={period} onChange={setPeriod} />
                </div>

                <LineChart data={chart} loading={loading} />
              </div>
            </ScrollReveal>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ScrollReveal>
              <div className="ep-card-static h-full p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">
                    تنبيهات النظام
                  </h3>

                  <Link
                    to="/notifications"
                    className="text-[11px] font-bold text-teal-600 transition hover:text-teal-800"
                  >
                    عرض جميع التنبيهات
                  </Link>
                </div>

                <SystemAlerts loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="ep-card-static h-full p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-right text-base font-black text-slate-900">
                    أداء الفروع
                  </h3>

                  <select className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 outline-none">
                    <option>هذا الشهر</option>
                    <option>الشهر الماضي</option>
                  </select>
                </div>

                <BranchPerformance loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="ep-card-static h-full p-5">
                <h3 className="mb-4 text-right text-base font-black text-slate-900">
                  توزيع المعاملات حسب النوع
                </h3>

                <DonutDistribution data={distribution} loading={loading} />
              </div>
            </ScrollReveal>
          </section>
        </>
      )}

      <AddBalanceModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAddBalance}
        currentBalance={balance}
      />
    </div>
  );
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={[
            "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
            value === p.key
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function buildStats(s, generalBalance) {
  const total = s?.total_summary || {};

  const totalTx = Number(
    total?.count ??
      s?.transactions_count ??
      s?.total_transactions ??
      0
  );

  const totalIn = Number(
    total?.receive ??
      s?.received ??
      s?.deposits ??
      s?.total_deposits ??
      0
  );

  const net = Number(
    total?.net ??
      s?.net ??
      s?.net_today ??
      0
  );

  const totalBalance = Number(
    s?.total_balance_usd ??
      s?.my_vault_balance ??
      generalBalance ??
      0
  );

  return [
    {
      title: "صافي الحركة",
      value: net,
      prefix: "$",
      icon: TrendingUp,
      color: "emerald",
      change: s?.net_change || null,
      changeDir: getChangeDir(s?.net_change_dir, s?.net_change),
      note: "إجمالي صافي الحركة",
      decimals: 2,
    },
    {
      title: "إجمالي الأرصدة",
      value: totalBalance,
      prefix: "$",
      icon: Wallet,
      color: "amber",
      change: s?.balance_change || null,
      changeDir: getChangeDir(s?.balance_change_dir, s?.balance_change),
      note: "إجمالي الرصيد الحالي",
      decimals: 2,
    },
    {
      title: "إجمالي الإيرادات",
      value: totalIn,
      prefix: "$",
      icon: DollarSign,
      color: "teal",
      change: s?.received_change || null,
      changeDir: getChangeDir(s?.received_change_dir, s?.received_change),
      note: "إجمالي الإيداعات",
      decimals: 2,
    },
    {
      title: "إجمالي المعاملات",
      value: totalTx,
      icon: ArrowRightLeft,
      color: "violet",
      change: s?.transactions_change || null,
      changeDir: getChangeDir(
        s?.transactions_change_dir,
        s?.transactions_change
      ),
      note: "كل المعاملات",
    },
  ];
}

function getChangeDir(explicit, value) {
  if (explicit === "up" || explicit === "down") return explicit;
  if (typeof value === "string" && value.startsWith("-")) return "down";
  return "up";
}

function LineChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-72 w-full" />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات"
        description="لم يتم تسجيل أي حركة خلال هذه الفترة"
      />
    );
  }

  const points = data.slice(0, 14).map((d) => {
    const received = Number(d.received ?? d.receive ?? d.deposits ?? 0);
    const delivered = Number(
      d.delivered ?? d.send ?? d.withdrawals ?? d.outcome ?? 0
    );

    return {
      label: d.day || d.label || d.date || "",
      net:
        d.net !== undefined && d.net !== null
          ? Number(d.net)
          : received - delivered,
      count: Number(d.count ?? d.transactions_count ?? d.transactions ?? 0),
    };
  });

  const hasRealData = points.some((p) => p.net !== 0 || p.count !== 0);

  if (!hasRealData) {
    return (
      <EmptyState
        title="لا توجد حركة كافية"
        description="كل قيم الرسم البياني تساوي صفر خلال هذه الفترة"
      />
    );
  }

  const w = 700;
  const h = 240;
  const padTop = 16;
  const padBottom = 32;
  const padX = 36;

  const maxNet = Math.max(...points.map((p) => Math.abs(p.net)), 1);
  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const innerH = h - padTop - padBottom;

  const xFor = (i) =>
    points.length === 1
      ? w / 2
      : padX + (i * (w - padX * 2)) / (points.length - 1);

  const yNet = (v) =>
    padTop + innerH - ((v / maxNet) * innerH) / 2 - innerH / 2;

  const yCount = (v) => padTop + innerH - (v / maxCount) * innerH;

  const pathNet = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yNet(p.net)}`)
    .join(" ");

  const areaNet = `${pathNet} L ${xFor(points.length - 1)} ${
    padTop + innerH
  } L ${xFor(0)} ${padTop + innerH} Z`;

  const pathCount = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yCount(p.count)}`)
    .join(" ");

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          عدد المعاملات
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          صافي الحركة (USD)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-72 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={w - padX}
            y1={padTop + innerH * p}
            y2={padTop + innerH * p}
            stroke="#e2e8f0"
            strokeDasharray="3 4"
          />
        ))}

        <motion.path
          d={areaNet}
          fill="url(#netFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          d={pathNet}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        <motion.path
          d={pathCount}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: "easeInOut" }}
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xFor(i)}
              cy={yNet(p.net)}
              r="3.5"
              fill="#fff"
              stroke="#10b981"
              strokeWidth="2"
            />

            <circle
              cx={xFor(i)}
              cy={yCount(p.count)}
              r="3.5"
              fill="#fff"
              stroke="#3b82f6"
              strokeWidth="2"
            />

            <text
              x={xFor(i)}
              y={h - 10}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="10"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RecentTransactionsList({ items, loading }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ep-skeleton h-14" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <EmptyState title="لا توجد معاملات حديثة" />;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((t) => {
        const type = getTransactionTypeMeta(t.type);
        const isOut = ["send", "withdraw", "withdrawal"].includes(t.type);

        return (
          <div
            key={t.id}
            className="flex items-center justify-between px-5 py-3.5"
          >
            <Badge color={type.color}>{type.label}</Badge>

            <div className="flex flex-1 flex-col items-center text-center">
              <p className="text-sm font-black tabular-nums text-slate-900">
                {isOut ? "-" : "+"}
                {Number(t.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs text-slate-500">
                  {t.currency_code || t.currency || "USD"}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p
                dir="ltr"
                className="font-mono text-xs font-bold text-slate-700"
              >
                {t.reference_number || t.code || `TXN-${t.id}`}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {formatRelative(t.created_at || t.transaction_date)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeDistribution(items) {
  const counts = {
    receive: 0,
    send: 0,
    transfer: 0,
    exchange: 0,
    other: 0,
  };

  const labels = {
    receive: "إيداعات",
    send: "سحوبات",
    transfer: "تحويلات",
    exchange: "مصروفات",
    other: "أخرى",
  };

  const colors = {
    receive: "#10b981",
    send: "#ef4444",
    transfer: "#3b82f6",
    exchange: "#f59e0b",
    other: "#94a3b8",
  };

  items.forEach((t) => {
    const key =
      t.type === "receive" || t.type === "deposit"
        ? "receive"
        : t.type === "send" ||
            t.type === "withdraw" ||
            t.type === "withdrawal"
          ? "send"
          : t.type === "transfer"
            ? "transfer"
            : t.type === "exchange"
              ? "exchange"
              : "other";

    counts[key] += 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return Object.keys(counts)
    .map((k) => ({
      key: k,
      label: labels[k],
      color: colors[k],
      count: counts[k],
      pct: total ? (counts[k] / total) * 100 : 0,
    }))
    .filter((s) => s.count > 0 || total === 0);
}

function DonutDistribution({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-56 w-full" />;

  const total = data.reduce((a, b) => a + b.count, 0);
  const size = 180;
  const r = 70;
  const stroke = 22;
  const c = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />

          {total > 0 &&
            data.map((d) => {
              const len = (d.pct / 100) * c;

              const seg = (
                <motion.circle
                  key={d.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
              );

              offset += len;
              return seg;
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-black text-slate-900">{total}</p>
          <p className="text-[10px] text-slate-500">معاملة</p>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {data.length === 0 && (
          <p className="text-center text-xs text-slate-400">لا توجد بيانات</p>
        )}

        {data.map((d) => (
          <div
            key={d.key}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="font-bold tabular-nums text-slate-600">
              {d.pct.toFixed(1)}%
            </span>

            <span className="flex items-center gap-2 font-bold text-slate-700">
              {d.label}
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: d.color }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchPerformance({ loading }) {
  const branches = [
    { name: "الفرع الرئيسي", value: 820450.75, pct: 100 },
    { name: "جدة", value: 512300.5, pct: 62 },
    { name: "فرع الدمام", value: 324120.0, pct: 39 },
    { name: "فرع الرياض", value: 298750.25, pct: 36 },
    { name: "أبها", value: 156890.0, pct: 19 },
  ];

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ep-skeleton h-8" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {branches.map((b) => (
        <div key={b.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold tabular-nums text-slate-700">
              {b.value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-[10px] text-slate-400">USD</span>
            </span>

            <span className="font-bold text-slate-600">{b.name}</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${b.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>
      ))}

      <Link
        to="/funds"
        className="block pt-2 text-center text-[11px] font-bold text-teal-600 transition hover:text-teal-800"
      >
        عرض جميع الفروع
      </Link>
    </div>
  );
}

function SystemAlerts({ loading }) {
  const alerts = [
    {
      icon: AlertTriangle,
      color: "rose",
      title: "تنبيه نشاط مشبوه",
      desc: "تم رصد نشاط غير معتاد على حساب محمد علي حسن",
    },
    {
      icon: CheckCircle2,
      color: "emerald",
      title: "تحديث سعر الصرف",
      desc: "تم تحديث سعر صرف زوج USD/EUR إلى 0.9142",
    },
    {
      icon: CloudUpload,
      color: "blue",
      title: "نسخة احتياطية",
      desc: "تم إنشاء نسخة احتياطية للبيانات بنجاح",
    },
  ];

  const palette = {
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ep-skeleton h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => {
        const Icon = a.icon;

        return (
          <div key={i} className="flex items-start gap-3 text-right">
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">{a.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {a.desc}
              </p>
            </div>

            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                palette[a.color]
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DashboardPage;