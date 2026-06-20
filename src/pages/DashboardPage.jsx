import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Wallet,
  Activity,
  ChevronLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  UsersRound,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import ScrollReveal from "../shared/ScrollReveal";
import dashboardService from "../services/dashboard";
import { formatMoney } from "../shared/helpers";

const PERIODS = [
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يوم" },
  { key: "1d", label: "اليوم" },
];

function unwrapApiPayload(response) {
  return response?.data?.data || response?.data || response || {};
}

function normalizeChartResponse(response) {
  const payload = unwrapApiPayload(response);

  if (Array.isArray(payload.labels)) {
    return payload.labels.map((label, index) => ({
      label,
      receive: Number(payload.receive?.[index] ?? 0),
      send: Number(payload.send?.[index] ?? 0),
      net: Number(payload.net?.[index] ?? 0),
    }));
  }

  return [];
}

function DashboardPage() {
  const [period, setPeriod] = useState("30d");
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, chartResponse] = await Promise.all([
        dashboardService.summary(period),
        dashboardService.chart(period),
      ]);

      setSummary(unwrapApiPayload(summaryResponse));
      setChart(normalizeChartResponse(chartResponse));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [period]);

  const stats = useMemo(() => buildStats(summary), [summary]);
  const operationsDistribution = useMemo(() => buildOperationsDistribution(summary), [summary]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
            <Activity className="h-6 w-6" />
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">لوحة التحكم</h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              نظرة عامة على العمليات والعملاء والأرصدة
            </p>
          </div>
        </div>

        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error && !loading ? (
        <div className="ep-card-static min-w-0 overflow-hidden">
          <ErrorState title="تعذّر تحميل البيانات" onRetry={load} />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
            {stats.map((stat, index) => (
              <div key={stat.title} className="xl:col-span-3">
                <StatCard {...stat} loading={loading} delay={index * 0.06} />
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ScrollReveal className="xl:col-span-8">
              <div className="ep-card-static h-full min-w-0 overflow-hidden p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-right">
                    <h3 className="text-base font-black text-slate-900">حركة العمليات</h3>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      Receive / Send / Net
                    </p>
                  </div>

                  <PeriodSelector value={period} onChange={setPeriod} />
                </div>

                <LineChart data={chart} loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08} className="xl:col-span-4">
              <div className="ep-card-static h-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="text-base font-black text-slate-900">أفضل العملاء والموردين</h3>

                  <Link
                    to="/customers"
                    className="flex items-center gap-1 text-xs font-bold text-teal-600 transition hover:text-teal-800"
                  >
                    عرض العملاء
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <TopCustomersList items={summary?.top_customers || []} loading={loading} />
              </div>
            </ScrollReveal>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <ScrollReveal className="xl:col-span-4">
              <div className="ep-card-static h-full min-w-0 overflow-hidden p-5">
                <h3 className="mb-4 text-right text-base font-black text-slate-900">
                  ملخص عام
                </h3>

                <TotalSummary data={summary?.total_summary} loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05} className="xl:col-span-4">
              <div className="ep-card-static h-full min-w-0 overflow-hidden p-5">
                <h3 className="mb-4 text-right text-base font-black text-slate-900">
                  ملخص اليوم
                </h3>

                <TodaySummary data={summary?.today_net_usd} loading={loading} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1} className="xl:col-span-4">
              <div className="ep-card-static h-full min-w-0 overflow-hidden p-5">
                <h3 className="mb-4 text-right text-base font-black text-slate-900">
                  حالة العمليات
                </h3>

                <OperationsStatusList data={operationsDistribution} loading={loading} />
              </div>
            </ScrollReveal>
          </section>
        </>
      )}
    </div>
  );
}

function buildStats(summary) {
  return [
    {
      title: "عدد العملاء",
      value: Number(summary?.customers_count || 0),
      icon: UsersRound,
      color: "violet",
      note: "إجمالي العملاء والموردين",
    },
    {
      title: "عمليات معلقة",
      value: Number(summary?.pending_operations_count || 0),
      icon: Clock3,
      color: "amber",
      note: "بانتظار التنفيذ",
    },
    {
      title: "المبلغ المعلق",
      value: Number(summary?.pending_amount_total || 0),
      prefix: "$",
      icon: DollarSign,
      color: "emerald",
      note: "إجمالي مبالغ العمليات المعلقة",
      decimals: 2,
    },
    {
      title: "رصيدي",
      value: Number(summary?.my_vault_balance ?? summary?.total_balance_usd ?? 0),
      prefix: "$",
      icon: Wallet,
      color: "teal",
      note: "الرصيد الحالي",
      decimals: 2,
    },
  ];
}

function buildOperationsDistribution(summary) {
  return [
    {
      key: "pending",
      label: "قيد الانتظار",
      value: Number(summary?.pending_operations_count || 0),
      icon: Clock3,
      color: "amber",
    },
    {
      key: "completed",
      label: "مكتملة",
      value: Number(summary?.completed_operations_count || 0),
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      key: "cancelled",
      label: "ملغاة",
      value: Number(summary?.cancelled_operations_count || 0),
      icon: AlertTriangle,
      color: "rose",
    },
  ];
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {PERIODS.map((period) => (
        <button
          key={period.key}
          type="button"
          onClick={() => onChange(period.key)}
          className={[
            "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
            value === period.key
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function TopCustomersList({ items, loading }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="ep-skeleton h-14" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return <EmptyState title="لا يوجد عملاء" description="لا توجد بيانات عملاء للعرض" />;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((customer) => (
        <div key={customer.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
          <Badge color={customer.type === "supplier" ? "violet" : "teal"}>
            {customer.type === "supplier" ? "مورد" : "عميل"}
          </Badge>

          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <p className="max-w-full truncate text-sm font-black text-slate-900">{customer.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400" dir="ltr">
              #{customer.customer_code || customer.id}
            </p>
          </div>

          <div className="shrink-0 text-left">
            <p className="font-mono text-xs font-black text-emerald-600" dir="ltr">
              {formatMoney(customer.balance_usd)} USD
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-72 w-full" />;

  if (!data || data.length === 0) {
    return <EmptyState title="لا توجد بيانات" description="لم يتم تسجيل أي حركة خلال هذه الفترة" />;
  }

  const hasRealData = data.some(
    (point) =>
      Number(point.receive || 0) !== 0 ||
      Number(point.send || 0) !== 0 ||
      Number(point.net || 0) !== 0
  );

  if (!hasRealData) {
    return <EmptyState title="لا توجد حركة كافية" description="كل قيم الرسم البياني تساوي صفر خلال هذه الفترة" />;
  }

  const width = 700;
  const height = 240;
  const padTop = 16;
  const padBottom = 32;
  const padX = 36;
  const innerHeight = height - padTop - padBottom;

  const maxValue = Math.max(
    ...data.flatMap((point) => [
      Math.abs(Number(point.receive || 0)),
      Math.abs(Number(point.send || 0)),
      Math.abs(Number(point.net || 0)),
    ]),
    1
  );

  const xFor = (index) =>
    data.length === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (data.length - 1);

  const yFor = (value) => padTop + innerHeight - (Number(value || 0) / maxValue) * innerHeight;

  const pathFor = (key) =>
    data
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point[key])}`)
      .join(" ");

  const receivePath = pathFor("receive");
  const sendPath = pathFor("send");
  const netPath = pathFor("net");

  return (
    <div className="relative min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Receive
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
          Send
        </span>

        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          Net
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((percent) => (
          <line
            key={percent}
            x1={padX}
            x2={width - padX}
            y1={padTop + innerHeight * percent}
            y2={padTop + innerHeight * percent}
            stroke="#e2e8f0"
            strokeDasharray="3 4"
          />
        ))}

        <motion.path
          d={receivePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />

        <motion.path
          d={sendPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
        />

        <motion.path
          d={netPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />

        {data.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={xFor(index)} cy={yFor(point.net)} r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
            <text x={xFor(index)} y={height - 10} textAnchor="middle" className="fill-slate-400" fontSize="10">
              {String(point.label).slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function OperationsStatusList({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-56 w-full" />;

  const palette = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.key}
            className="flex min-h-[64px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
          >
            <span className="font-mono text-xl font-black text-slate-900 sm:text-2xl" dir="ltr">
              {item.value.toLocaleString("en-US")}
            </span>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-slate-600">{item.label}</p>
              </div>

              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${palette[item.color]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TodaySummary({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-56 w-full" />;

  const rows = [
    { label: "استلام", value: Number(data?.receive || 0), color: "text-emerald-600" },
    { label: "إرسال", value: Number(data?.send || 0), color: "text-rose-600" },
    { label: "الصافي", value: Number(data?.net || 0), color: "text-blue-600" },
    { label: "عدد العمليات", value: Number(data?.count || 0), color: "text-slate-900", count: true },
  ];

  return <SummaryRows rows={rows} />;
}

function TotalSummary({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-56 w-full" />;

  const rows = [
    { label: "استلام", value: Number(data?.receive || 0), color: "text-emerald-600" },
    { label: "إرسال", value: Number(data?.send || 0), color: "text-rose-600" },
    { label: "الصافي", value: Number(data?.net || 0), color: "text-blue-600" },
    { label: "عدد العمليات", value: Number(data?.count || 0), color: "text-slate-900", count: true },
  ];

  return <SummaryRows rows={rows} />;
}

function SummaryRows({ rows }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-h-[48px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
        >
          <span className={`font-mono text-sm font-black ${row.color}`} dir="ltr">
            {row.count ? row.value.toLocaleString("en-US") : `${formatMoney(row.value)} USD`}
          </span>

          <span className="text-xs font-black text-slate-600">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export default DashboardPage;