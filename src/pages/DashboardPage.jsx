import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCw,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import dashboardService from "../services/dashboard";
import { extractApiError, formatMoney } from "../shared/helpers";

const PERIODS = [
  { key: "1d", label: "اليوم" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يوم" },
];

function unwrapPayload(res) {
  return res?.data?.data || res?.data || res || {};
}

function unwrapList(res) {
  const data = unwrapPayload(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.suppliers)) return data.suppliers;
  if (Array.isArray(data?.boxes)) return data.boxes;
  if (Array.isArray(data?.commissions)) return data.commissions;
  if (Array.isArray(data?.pending_operations)) return data.pending_operations;

  return [];
}

function numberFrom(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) {
      const value = Number(data[key]);
      return Number.isFinite(value) ? value : fallback;
    }
  }

  return fallback;
}

function getNested(data, paths, fallback = 0) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], data);

    if (value !== undefined && value !== null) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
  }

  return fallback;
}

function getName(item) {
  return item?.name || item?.customer?.name || item?.supplier?.name || item?.box?.name || "—";
}

function getAmount(item) {
  return Number(
    item?.amount ||
      item?.total_amount ||
      item?.balance ||
      item?.current_balance ||
      item?.commission_amount ||
      item?.customer_amount ||
      0
  );
}

function normalizeChart(res) {
  const data = unwrapPayload(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.chart)) return data.chart;
  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.labels)) {
    return data.labels.map((label, index) => ({
      label,
      operations: Number(data.operations?.[index] ?? data.count?.[index] ?? data.operations_count?.[index] ?? 0),
      commissions: Number(data.commissions?.[index] ?? data.commission?.[index] ?? data.commission_amount?.[index] ?? 0),
      amount: Number(data.amounts?.[index] ?? data.amount?.[index] ?? data.total_amount?.[index] ?? 0),
    }));
  }

  return [];
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");

  const [financial, setFinancial] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [commissions, setCommissions] = useState({});
  const [chart, setChart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [softErrors, setSoftErrors] = useState([]);
  const [mainError, setMainError] = useState(null);

  async function load() {
    setLoading(true);
    setMainError(null);
    setSoftErrors([]);

    const params = { period };

    const [financialRes, suppliersRes, boxesRes, commissionsRes, chartsRes] =
      await Promise.allSettled([
        dashboardService.financial(params),
        dashboardService.suppliers(params),
        dashboardService.boxes(params),
        dashboardService.commissions(params),
        dashboardService.charts(params),
      ]);

    const errors = [];

    if (financialRes.status === "fulfilled") {
      setFinancial(unwrapPayload(financialRes.value));
    } else {
      setFinancial({});
      errors.push("financial");
    }

    if (suppliersRes.status === "fulfilled") {
      setSuppliers(unwrapList(suppliersRes.value));
    } else {
      setSuppliers([]);
      errors.push("suppliers");
    }

    if (boxesRes.status === "fulfilled") {
      setBoxes(unwrapList(boxesRes.value));
    } else {
      setBoxes([]);
      errors.push("boxes");
    }

    if (commissionsRes.status === "fulfilled") {
      setCommissions(unwrapPayload(commissionsRes.value));
    } else {
      setCommissions({});
      errors.push("commissions");
    }

    if (chartsRes.status === "fulfilled") {
      setChart(normalizeChart(chartsRes.value));
    } else {
      setChart([]);
      errors.push("charts");
    }

    setSoftErrors(errors);

    if (errors.includes("financial") && errors.includes("suppliers") && errors.includes("boxes")) {
      setMainError(financialRes.reason || suppliersRes.reason || boxesRes.reason);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [period]);

  const stats = useMemo(() => {
    const totalBoxesBalance =
      getNested(financial, [
        "boxes_total_balance",
        "total_boxes_balance",
        "total_box_balances",
        "boxes.total_balance",
        "boxes.total",
      ]) || boxes.reduce((sum, box) => sum + Number(box.current_balance || box.balance || 0), 0);

    const pendingCount = getNested(financial, [
      "pending_operations_count",
      "operations.pending_count",
      "pending.count",
    ]);

    const pendingAmount = getNested(financial, [
      "pending_operations_amount",
      "pending_amount",
      "pending.amount",
      "operations.pending_amount",
    ]);

    const completedCount = getNested(financial, [
      "completed_operations_count",
      "operations.completed_count",
      "completed.count",
    ]);

    const completedAmount = getNested(financial, [
      "completed_operations_amount",
      "completed_amount",
      "completed.amount",
      "operations.completed_amount",
    ]);

    const todayOperations = getNested(financial, [
      "today_operations_count",
      "today.count",
      "today_operations",
    ]);

    const todayCommissions =
      getNested(financial, [
        "today_commissions",
        "today_commission",
        "today.commissions",
        "commissions.today",
      ]) ||
      getNested(commissions, ["today_commissions", "today", "today_total"]);

    const customersCount = getNested(financial, [
      "customers_count",
      "counts.customers",
      "customers.total",
    ]);

    const suppliersCount =
      getNested(financial, ["suppliers_count", "counts.suppliers", "suppliers.total"]) ||
      suppliers.length;

    const boxesCount =
      getNested(financial, ["boxes_count", "counts.boxes", "boxes.count"]) || boxes.length;

    return [
      {
        title: "إجمالي الصناديق",
        value: totalBoxesBalance,
        prefix: "$",
        icon: Wallet,
        color: "teal",
        note: "السيولة داخل الصناديق",
      },
      {
        title: "عمليات معلقة",
        value: pendingCount,
        icon: Clock3,
        color: "amber",
        note: "بانتظار الإكمال",
      },
      {
        title: "قيمة المعلق",
        value: pendingAmount,
        prefix: "$",
        icon: AlertTriangle,
        color: "rose",
        note: "مبالغ العمليات المعلقة",
      },
      {
        title: "عمليات مكتملة",
        value: completedCount,
        icon: CheckCircle2,
        color: "emerald",
        note: "عمليات تم إنهاؤها",
      },
      {
        title: "قيمة المكتمل",
        value: completedAmount,
        prefix: "$",
        icon: DollarSign,
        color: "emerald",
        note: "إجمالي العمليات المكتملة",
      },
      {
        title: "عمليات اليوم",
        value: todayOperations,
        icon: Activity,
        color: "blue",
        note: "حركة اليوم",
      },
      {
        title: "عمولات اليوم",
        value: todayCommissions,
        prefix: "$",
        icon: TrendingUp,
        color: "violet",
        note: "ربح اليوم من العمولات",
      },
      {
        title: "العملاء",
        value: customersCount,
        icon: UsersRound,
        color: "slate",
        note: "عدد العملاء",
      },
      {
        title: "الموردين",
        value: suppliersCount,
        icon: Building2,
        color: "violet",
        note: "عدد الموردين",
      },
      {
        title: "الصناديق",
        value: boxesCount,
        icon: Wallet,
        color: "teal",
        note: "عدد الصناديق",
      },
    ];
  }, [financial, suppliers, boxes, commissions]);

  const pendingOperations = useMemo(() => {
    const list =
      financial?.pending_operations ||
      financial?.pendingOperations ||
      financial?.pending?.operations ||
      [];

    return Array.isArray(list) ? list.slice(0, 6) : [];
  }, [financial]);

  const commissionRows = useMemo(() => {
    const data = unwrapPayload(commissions);

    if (Array.isArray(data)) return data.slice(0, 6);
    if (Array.isArray(data?.items)) return data.items.slice(0, 6);
    if (Array.isArray(data?.by_day)) return data.by_day.slice(0, 6);
    if (Array.isArray(data?.users)) return data.users.slice(0, 6);
    if (Array.isArray(data?.suppliers)) return data.suppliers.slice(0, 6);

    return [];
  }, [commissions]);

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
              <Activity className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <h1 className="break-words text-xl font-black leading-8 text-slate-950 sm:text-2xl">
                لوحة التحكم المالية
              </h1>
              <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                متابعة العمليات، الصناديق، الموردين، العمولات، والسيولة من الداشبورد الجديد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
            <PeriodSelector value={period} onChange={setPeriod} />

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="ep-btn ep-btn-ghost h-11"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>
        </div>

        {softErrors.length > 0 && !loading && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-right text-xs font-bold leading-6 text-amber-800">
            بعض أقسام الداشبورد لم ترجع بيانات: {softErrors.join(", ")}. هذا لا يمنع عرض الأقسام التي تعمل.
          </div>
        )}
      </section>

      {mainError && !loading ? (
        <ErrorState
          title="تعذّر تحميل الداشبورد الجديد"
          description={extractApiError(mainError)}
          onRetry={load}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <DashboardCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                icon={stat.icon}
                color={stat.color}
                note={stat.note}
                loading={loading}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="ep-card-static min-w-0 overflow-hidden p-4 sm:p-5 xl:col-span-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Badge color="teal">Chart-ready JSON</Badge>

                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">الرسم المالي</h3>
                  <p className="mt-1 text-xs text-slate-500">عمليات وعمولات حسب الفترة</p>
                </div>
              </div>

              <DashboardChart data={chart} loading={loading} />
            </div>

            <div className="ep-card-static min-w-0 overflow-hidden p-4 sm:p-5 xl:col-span-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700">
                  عرض العمليات
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>

                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">العمليات المعلقة</h3>
                  <p className="mt-1 text-xs text-slate-500">آخر عمليات تحتاج متابعة</p>
                </div>
              </div>

              <PendingOperations items={pendingOperations} loading={loading} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <InfoPanel
              title="مراقبة الموردين"
              subtitle="أهم الموردين حسب الداشبورد"
              items={suppliers}
              loading={loading}
              type="supplier"
              emptyTitle="لا يوجد بيانات موردين"
              to="/customers?type=supplier"
            />

            <InfoPanel
              title="مراقبة الصناديق"
              subtitle="أرصدة وحالة الصناديق"
              items={boxes}
              loading={loading}
              type="box"
              emptyTitle="لا يوجد بيانات صناديق"
              to="/boxes"
            />

            <InfoPanel
              title="تحليل العمولات"
              subtitle="ملخص العمولات والأرباح"
              items={commissionRows}
              loading={loading}
              type="commission"
              emptyTitle="لا يوجد بيانات عمولات"
              to="/reports"
            />
          </section>
        </>
      )}
    </div>
  );
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
            "rounded-lg px-3 py-1.5 text-[11px] font-black transition",
            value === period.key
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function DashboardCard({ title, value, prefix, icon: Icon, color, note, loading }) {
  const palette = {
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  if (loading) return <div className="ep-skeleton h-36 rounded-3xl" />;

  const n = Number(value || 0);
  const display = prefix ? `${prefix}${formatMoney(n)}` : n.toLocaleString("en-US");

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${palette[color] || palette.teal}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-black text-slate-500">{title}</p>
          <p dir="ltr" className="mt-3 break-words font-mono text-2xl font-black leading-tight text-slate-950">
            {display}
          </p>
          <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-72 w-full rounded-2xl" />;

  if (!data || data.length === 0) {
    return <EmptyState title="لا توجد بيانات للرسم" description="Endpoint /dashboard/charts لم يرجع بيانات لهذه الفترة" />;
  }

  const rows = data.slice(-12).map((item, index) => ({
    label: item.label || item.date || item.day || item.month || `#${index + 1}`,
    operations: Number(item.operations || item.operations_count || item.count || 0),
    commissions: Number(item.commissions || item.commission || item.commission_amount || item.profit || 0),
    amount: Number(item.amount || item.total_amount || item.completed_amount || 0),
  }));

  const max = Math.max(
    ...rows.flatMap((row) => [Math.abs(row.operations), Math.abs(row.commissions), Math.abs(row.amount)]),
    1
  );

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
          العمليات
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          العمولات
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          المبلغ
        </span>
      </div>

      <div className="flex h-72 items-end gap-3 overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
        {rows.map((row) => (
          <div key={row.label} className="flex h-full min-w-[64px] flex-col justify-end gap-2">
            <div className="flex flex-1 items-end justify-center gap-1">
              <div
                className="w-3 rounded-t-lg bg-teal-500"
                style={{ height: `${Math.max(6, (Math.abs(row.operations) / max) * 100)}%` }}
              />
              <div
                className="w-3 rounded-t-lg bg-violet-500"
                style={{ height: `${Math.max(6, (Math.abs(row.commissions) / max) * 100)}%` }}
              />
              <div
                className="w-3 rounded-t-lg bg-emerald-500"
                style={{ height: `${Math.max(6, (Math.abs(row.amount) / max) * 100)}%` }}
              />
            </div>

            <p className="truncate text-center text-[10px] font-bold text-slate-500">
              {String(row.label).slice(0, 10)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingOperations({ items, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="ep-skeleton h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyState title="لا يوجد عمليات معلقة" description="كل العمليات الحالية لا تحتاج متابعة" />;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id || item.reference_number} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-right">
          <div className="flex items-center justify-between gap-2">
            <Badge color="amber">معلقة</Badge>
            <p className="truncate text-sm font-black text-slate-900">{getName(item)}</p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span dir="ltr" className="font-mono font-black text-slate-800">
              ${formatMoney(getAmount(item))}
            </span>
            <span className="truncate text-slate-500">{item.reference_number || item.code || `#${item.id}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoPanel({ title, subtitle, items, loading, type, emptyTitle, to }) {
  return (
    <div className="ep-card-static min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700">
          عرض
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <div className="text-right">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ep-skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <div className="space-y-2">
            {items.slice(0, 6).map((item, index) => (
              <InfoRow key={item.id || item.name || index} item={item} type={type} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ item, type }) {
  const label = getName(item);
  const amount = getAmount(item);

  const badge =
    type === "supplier"
      ? { label: "مورد", color: "violet" }
      : type === "box"
        ? { label: item.type || "صندوق", color: "teal" }
        : { label: "عمولة", color: "emerald" };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-right">
      <div className="flex items-center justify-between gap-3">
        <Badge color={badge.color}>{badge.label}</Badge>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900">{label}</p>
          <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
            {item.status || item.currency || item.reference_number || "—"}
          </p>
        </div>
      </div>

      <p dir="ltr" className="mt-2 font-mono text-sm font-black text-slate-800">
        ${formatMoney(amount)}
      </p>
    </div>
  );
}