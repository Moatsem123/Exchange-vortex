/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react-hooks/static-components */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import dashboardService from "../services/dashboard";
import reportsService from "../services/reports";
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
  if (Array.isArray(data?.top_pending_operations)) return data.top_pending_operations;
  if (Array.isArray(data?.top_suppliers_by_volume)) return data.top_suppliers_by_volume;
  if (Array.isArray(data?.top_suppliers_by_commission)) return data.top_suppliers_by_commission;

  return [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getNested(data, paths, fallback = 0) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], data);

    if (value !== undefined && value !== null && value !== "") {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
  }

  return fallback;
}

function formatMoneySafe(value) {
  const text = String(formatMoney(toNumber(value)));
  return text.includes("$") ? text : `$${text}`;
}

function moneyText(value) {
  return formatMoneySafe(value);
}

function shortDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("ar-EG", {
    month: "2-digit",
    day: "2-digit",
  });
}

function getName(item) {
  return (
    item?.name ||
    item?.customer_name ||
    item?.supplier_name ||
    item?.box_name ||
    item?.customer?.name ||
    item?.supplier?.name ||
    item?.box?.name ||
    item?.label ||
    item?.title ||
    "—"
  );
}

function getAmount(item) {
  return toNumber(
    item?.amount ??
      item?.total ??
      item?.total_amount ??
      item?.balance ??
      item?.current_balance ??
      item?.commission_amount ??
      item?.customer_amount ??
      item?.supplier_amount ??
      item?.total_commission_usd ??
      0
  );
}

function getCount(item) {
  return toNumber(item?.count ?? item?.operations_count ?? item?.total_operations ?? 0);
}

function normalizeChart(res) {
  const data = unwrapPayload(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.chart)) return data.chart;
  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.operations_by_day) || Array.isArray(data?.commissions_by_day)) {
    const map = new Map();

    (data.operations_by_day || []).forEach((item) => {
      const key = item.date || item.label || item.day || item.month;
      if (!key) return;

      map.set(key, {
        label: key,
        date: key,
        operations: toNumber(item.count ?? item.operations ?? item.operations_count),
        amount: toNumber(item.amount ?? item.total_amount),
        commissions: 0,
      });
    });

    (data.commissions_by_day || []).forEach((item) => {
      const key = item.date || item.label || item.day || item.month;
      if (!key) return;

      const current =
        map.get(key) || {
          label: key,
          date: key,
          operations: 0,
          amount: 0,
          commissions: 0,
        };

      current.commissions = toNumber(item.amount ?? item.commissions ?? item.commission_amount);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  if (data?.pending_vs_completed) {
    return [
      {
        label: "معلقة",
        operations: toNumber(data.pending_vs_completed.pending?.count),
        amount: toNumber(data.pending_vs_completed.pending?.amount),
        commissions: 0,
      },
      {
        label: "مكتملة",
        operations: toNumber(data.pending_vs_completed.completed?.count),
        amount: toNumber(data.pending_vs_completed.completed?.amount),
        commissions: 0,
      },
    ];
  }

  if (Array.isArray(data?.labels)) {
    return data.labels.map((label, index) => ({
      label,
      operations: toNumber(data.operations?.[index] ?? data.count?.[index] ?? data.operations_count?.[index]),
      commissions: toNumber(data.commissions?.[index] ?? data.commission?.[index] ?? data.commission_amount?.[index]),
      amount: toNumber(data.amounts?.[index] ?? data.amount?.[index] ?? data.total_amount?.[index]),
    }));
  }

  return [];
}

function normalizeCommissionsRows(commissions) {
  const data = unwrapPayload(commissions);

  if (Array.isArray(data)) return data.slice(0, 6);
  if (Array.isArray(data?.items)) return data.items.slice(0, 6);
  if (Array.isArray(data?.by_day)) return data.by_day.slice(0, 6);
  if (Array.isArray(data?.users)) return data.users.slice(0, 6);
  if (Array.isArray(data?.suppliers)) return data.suppliers.slice(0, 6);

  const rows = [];

  if (data?.today_commissions !== undefined) {
    rows.push({
      id: "today_commissions",
      name: "عمولات اليوم",
      amount: data.today_commissions,
      status: "اليوم",
    });
  }

  if (data?.monthly_commissions !== undefined) {
    rows.push({
      id: "monthly_commissions",
      name: "عمولات الشهر",
      amount: data.monthly_commissions,
      status: "الشهر الحالي",
    });
  }

  if (data?.yearly_commissions !== undefined) {
    rows.push({
      id: "yearly_commissions",
      name: "عمولات السنة",
      amount: data.yearly_commissions,
      status: "السنة الحالية",
    });
  }

  return rows;
}

function normalizeSuppliers(raw, list) {
  if (Array.isArray(list) && list.length > 0) return list;

  const volume = Array.isArray(raw?.top_suppliers_by_volume) ? raw.top_suppliers_by_volume : [];
  const commission = Array.isArray(raw?.top_suppliers_by_commission) ? raw.top_suppliers_by_commission : [];
  const commissionMap = new Map(commission.map((item) => [item.id, item.total]));

  if (volume.length > 0) {
    return volume.map((item) => ({
      ...item,
      commission_total: commissionMap.get(item.id) ?? 0,
    }));
  }

  return commission.map((item) => ({
    ...item,
    commission_total: item.total ?? 0,
  }));
}

function summarizeObligations(obligations = []) {
  const totals = {
    receivable: new Map(),
    payable: new Map(),
  };

  obligations.forEach((item) => {
    const type = item.obligation_type === "payable" ? "payable" : "receivable";
    const currency = item.currency || item.customer_currency || item.supplier_currency || "USD";
    const current = totals[type].get(currency) || { currency, amount: 0, settled: 0, remaining: 0 };
    const amount = toNumber(item.original_amount ?? item.amount);
    const settled = toNumber(item.settled_amount ?? item.paid_amount);
    const remaining = toNumber(item.remaining_amount ?? Math.max(amount - settled, 0));

    current.amount += amount;
    current.settled += settled;
    current.remaining += remaining;
    totals[type].set(currency, current);
  });

  return {
    receivable: Array.from(totals.receivable.values()),
    payable: Array.from(totals.payable.values()),
  };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");

  const [summary, setSummary] = useState({});
  const [financial, setFinancial] = useState({});
  const [suppliersRaw, setSuppliersRaw] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [commissions, setCommissions] = useState({});
  const [obligations, setObligations] = useState([]);
  const [chart, setChart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [softErrors, setSoftErrors] = useState([]);
  const [mainError, setMainError] = useState(null);

  async function load() {
    setLoading(true);
    setMainError(null);
    setSoftErrors([]);

    const params = { period };

    const [summaryRes, financialRes, suppliersRes, boxesRes, commissionsRes, chartsRes, obligationsRes] =
      await Promise.allSettled([
        dashboardService.summary(params),
        dashboardService.financial(params),
        dashboardService.suppliers(params),
        dashboardService.boxes(params),
        dashboardService.commissions(params),
        dashboardService.charts(params),
        reportsService.obligations({ per_page: 1000 }),
      ]);

    const errors = [];

    if (summaryRes.status === "fulfilled") {
      setSummary(unwrapPayload(summaryRes.value));
    } else {
      setSummary({});
      errors.push("summary");
    }

    if (financialRes.status === "fulfilled") {
      setFinancial(unwrapPayload(financialRes.value));
    } else {
      setFinancial({});
      errors.push("financial");
    }

    if (suppliersRes.status === "fulfilled") {
      setSuppliersRaw(unwrapPayload(suppliersRes.value));
      setSuppliers(unwrapList(suppliersRes.value));
    } else {
      setSuppliersRaw({});
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

    if (obligationsRes.status === "fulfilled") {
      setObligations(unwrapList(obligationsRes.value));
    } else {
      setObligations([]);
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

  const mergedFinancial = useMemo(() => {
    return {
      ...summary,
      ...financial,
    };
  }, [summary, financial]);

  const dashboardNumbers = useMemo(() => {
    const totalBoxesBalance =
      getNested(mergedFinancial, [
        "total_boxes_balance",
        "boxes_total_balance",
        "total_box_balances",
        "boxes.total_balance",
        "boxes.total",
      ]) || boxes.reduce((sum, box) => sum + toNumber(box.current_balance ?? box.balance), 0);

    const capitalBalance = getNested(mergedFinancial, [
      "capital_balance",
      "capital.balance",
      "capital.total",
    ]);

    const freeCapital = getNested(mergedFinancial, [
      "free_capital",
      "capital.free",
      "capital.available",
    ]);

    const pendingCount = getNested(mergedFinancial, [
      "pending_operations_count",
      "operations.pending_count",
      "pending.count",
    ]);

    const pendingAmount = getNested(mergedFinancial, [
      "pending_operations_amount",
      "pending_amount",
      "pending.amount",
      "operations.pending_amount",
    ]);

    const completedCount = getNested(mergedFinancial, [
      "completed_operations_count",
      "operations.completed_count",
      "completed.count",
    ]);

    const completedAmount = getNested(mergedFinancial, [
      "completed_operations_amount",
      "completed_amount",
      "completed.amount",
      "operations.completed_amount",
    ]);

    const todayOperations = getNested(mergedFinancial, [
      "today_operations_count",
      "today.count",
      "today_operations",
    ]);

    const todayOperationsAmount = getNested(mergedFinancial, [
      "today_operations_amount",
      "today.amount",
      "today_operations_amount_usd",
    ]);

    const todayCommissions =
      getNested(mergedFinancial, [
        "today_commissions",
        "today_commission",
        "today.commissions",
        "commissions.today",
      ]) ||
      getNested(commissions, ["today_commissions", "today", "today_total"]);

    const monthlyCommissions =
      getNested(commissions, ["monthly_commissions", "month", "monthly_total"]) ||
      getNested(mergedFinancial, ["monthly_commissions"]);

    const yearlyCommissions =
      getNested(commissions, ["yearly_commissions", "year", "yearly_total"]) ||
      getNested(mergedFinancial, ["yearly_commissions"]);

    const customersCount = getNested(mergedFinancial, [
      "customers_count",
      "counts.customers",
      "customers.total",
    ]);

    const suppliersCount =
      getNested(mergedFinancial, ["suppliers_count", "counts.suppliers", "suppliers.total"]) ||
      toNumber(suppliersRaw?.total_suppliers) ||
      suppliers.length;

    const boxesCount =
      getNested(mergedFinancial, ["boxes_count", "counts.boxes", "boxes.count"]) || boxes.length;

    return {
      capitalBalance,
      freeCapital,
      totalBoxesBalance,
      pendingCount,
      pendingAmount,
      completedCount,
      completedAmount,
      todayOperations,
      todayOperationsAmount,
      todayCommissions,
      monthlyCommissions,
      yearlyCommissions,
      customersCount,
      suppliersCount,
      boxesCount,
    };
  }, [mergedFinancial, suppliersRaw, suppliers, boxes, commissions]);

  const stats = useMemo(
    () => [
      {
        title: "إجمالي رأس المال",
        value: dashboardNumbers.capitalBalance,
        money: true,
        icon: Wallet,
        color: "teal",
        note: "يشمل الرصيد العام وأرصدة الصناديق",
      },
      {
        title: "الرصيد العام لرأس المال",
        value: dashboardNumbers.freeCapital,
        money: true,
        icon: DollarSign,
        color: "emerald",
        note: "غير مخصص لصندوق",
      },
      {
        title: "إجمالي أرصدة الصناديق",
        value: dashboardNumbers.totalBoxesBalance,
        money: true,
        icon: Wallet,
        color: "blue",
        note: "سيولة مخصصة داخل الصناديق",
      },
      {
        title: "عمليات مكتملة",
        value: dashboardNumbers.completedCount,
        icon: CheckCircle2,
        color: "emerald",
        note: "عمليات تم إنهاؤها",
      },
      {
        title: "قيمة المكتمل",
        value: dashboardNumbers.completedAmount,
        money: true,
        icon: DollarSign,
        color: "emerald",
        note: "إجمالي العمليات المكتملة",
      },
      {
        title: "عمليات معلقة",
        value: dashboardNumbers.pendingCount,
        icon: Clock3,
        color: "amber",
        note: "بانتظار الإكمال",
      },
      {
        title: "قيمة المعلق",
        value: dashboardNumbers.pendingAmount,
        money: true,
        icon: AlertTriangle,
        color: "rose",
        note: "مبالغ العمليات المعلقة",
      },
      {
        title: "عمليات اليوم",
        value: dashboardNumbers.todayOperations,
        icon: Activity,
        color: "blue",
        note: "حركة اليوم",
      },
      {
        title: "قيمة اليوم",
        value: dashboardNumbers.todayOperationsAmount,
        money: true,
        icon: DollarSign,
        color: "blue",
        note: "مبالغ عمليات اليوم",
      },
      {
        title: "عمولات اليوم",
        value: dashboardNumbers.todayCommissions,
        money: true,
        icon: TrendingUp,
        color: "violet",
        note: "ربح اليوم من العمولات",
      },
      {
        title: "العملاء",
        value: dashboardNumbers.customersCount,
        icon: UsersRound,
        color: "slate",
        note: "عدد العملاء",
      },
      {
        title: "الموردين",
        value: dashboardNumbers.suppliersCount,
        icon: Building2,
        color: "violet",
        note: "عدد الموردين",
      },
    ],
    [dashboardNumbers]
  );

  const pendingOperations = useMemo(() => {
    const list =
      financial?.top_pending_operations ||
      financial?.pending_operations ||
      financial?.pendingOperations ||
      financial?.pending?.operations ||
      summary?.top_pending_operations ||
      [];

    return Array.isArray(list) ? list.slice(0, 6) : [];
  }, [financial, summary]);

  const commissionRows = useMemo(() => normalizeCommissionsRows(commissions), [commissions]);

  const supplierRows = useMemo(
    () => normalizeSuppliers(suppliersRaw, suppliers),
    [suppliers, suppliersRaw]
  );

  const obligationTotals = useMemo(() => summarizeObligations(obligations), [obligations]);

  const healthStatus = useMemo(() => {
    if (financial?.reconciliation_status === "mismatch") return "warning";
    if (dashboardNumbers.pendingCount > 0) return "pending";
    return "stable";
  }, [financial, dashboardNumbers.pendingCount]);

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
              لوحة قيادة مالية
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              متابعة إجمالي رأس المال، الرصيد العام، أرصدة الصناديق، الذمم، والعمولات من مصدر واحد.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <PeriodSelector value={period} onChange={setPeriod} />

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث البيانات
            </button>
          </div>
        </div>

       
      </section>

      {softErrors.length > 0 && !loading && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-right text-xs font-bold leading-6 text-amber-800">
          بعض أقسام الداشبورد لم ترجع بيانات: {softErrors.join(", ")}. هذا لا يمنع عرض الأقسام التي تعمل.
        </div>
      )}

      {mainError && !loading ? (
        <ErrorState
          title="تعذّر تحميل الداشبورد الجديد"
          description={extractApiError(mainError)}
          onRetry={load}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            {stats.map((stat) => (
              <MetricCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                money={stat.money}
                icon={stat.icon}
                color={stat.color}
                note={stat.note}
                loading={loading}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 xl:col-span-8">
              <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-teal-100 blur-3xl" />
              <div className="absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-violet-100 blur-3xl" />

              <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3">
                <Badge color="teal">Dashboard Charts</Badge>

                <div className="text-right">
                  <h3 className="text-xl font-black text-slate-950">الرسم المالي</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">عمليات، عمولات ومبالغ حسب الفترة</p>
                </div>
              </div>

              <DashboardChart data={chart} loading={loading} />
            </div>

            <div className="xl:col-span-4">
              <SystemPulse
                loading={loading}
                financial={financial}
                numbers={dashboardNumbers}
                pendingOperations={pendingOperations}
                healthStatus={healthStatus}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <FinancialPositionPanel loading={loading} totals={obligationTotals} />

            <InfoPanel
              title="مراقبة الموردين"
              subtitle="أهم الموردين حسب الحجم والعمولة"
              items={supplierRows}
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

function DashboardChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-80 w-full rounded-2xl" />;

  if (!data || data.length === 0) {
    return <EmptyState title="لا توجد بيانات للرسم" description="Endpoint /dashboard/charts لم يرجع بيانات لهذه الفترة" />;
  }

  const rows = data.slice(-12).map((item, index) => ({
    label: item.label || item.date || item.day || item.month || `#${index + 1}`,
    operations: toNumber(item.operations ?? item.operations_count ?? item.count),
    commissions: toNumber(item.commissions ?? item.commission ?? item.commission_amount ?? item.profit),
    amount: toNumber(item.amount ?? item.total_amount ?? item.completed_amount),
  }));

  function getSeriesColor(key) {
    const colors = {
      operations: "#14b8a6",
      commissions: "#8b5cf6",
      amount: "#10b981",
    };

    return colors[key] || "#64748b";
  }

  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        dir="rtl"
        style={{ textAlign: "right", direction: "rtl" }}
        className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm"
      >
        <p className="mb-2 text-[11px] font-black text-slate-500">{String(label).slice(0, 14)}</p>

        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
              <span dir="ltr" className="font-mono font-black text-slate-900">
                {entry.dataKey === "operations"
                  ? toNumber(entry.value).toLocaleString("en-US")
                  : formatMoneySafe(entry.value)}
              </span>

              <span className="flex items-center gap-1.5 font-bold text-slate-600">
                {entry.name}
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getSeriesColor(entry.dataKey) }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function CustomLegend({ payload = [] }) {
    return (
      <div
        dir="rtl"
        style={{ textAlign: "right", direction: "rtl" }}
        className="mb-4 flex flex-wrap items-center justify-end gap-4 text-xs font-bold text-slate-500"
      >
        {payload.map((entry) => (
          <span key={entry.value} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 shadow-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getSeriesColor(entry.dataKey) }}
            />
            {entry.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="min-w-0 rounded-[1.75rem] border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-teal-50/40 p-4 shadow-inner"
      dir="rtl"
      style={{ direction: "rtl" }}
    >
      <ResponsiveContainer width="100%" height={330}>
        <RechartsBarChart
          data={rows}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="gradOperations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.35} />
            </linearGradient>

            <linearGradient id="gradCommissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.35} />
            </linearGradient>

            <linearGradient id="gradAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />

          <XAxis
            dataKey="label"
            reversed
            tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            tickFormatter={(val) => String(val).slice(0, 10)}
          />

          <YAxis
            yAxisId="money"
            orientation="right"
            tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${Number(value || 0).toLocaleString("en-US")}`}
          />

          <YAxis
            yAxisId="operations"
            orientation="left"
            hide
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Legend content={<CustomLegend />} verticalAlign="top" align="right" />

          <Bar
            yAxisId="operations"
            dataKey="operations"
            name="العمليات"
            fill="url(#gradOperations)"
            radius={[10, 10, 0, 0]}
            animationDuration={900}
            animationEasing="ease-out"
          />

          <Bar
            yAxisId="money"
            dataKey="commissions"
            name="العمولات"
            fill="url(#gradCommissions)"
            radius={[10, 10, 0, 0]}
            animationDuration={900}
            animationEasing="ease-out"
          />

          <Bar
            yAxisId="money"
            dataKey="amount"
            name="المبلغ"
            fill="url(#gradAmount)"
            radius={[10, 10, 0, 0]}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {PERIODS.map((period) => (
        <button
          key={period.key}
          type="button"
          onClick={() => onChange(period.key)}
          className={[
            "rounded-xl px-4 py-2 text-[11px] font-black transition",
            value === period.key
              ? "bg-slate-950 text-white shadow-lg"
              : "text-slate-500 hover:bg-white hover:text-slate-950",
          ].join(" ")}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ title, value, money, icon: Icon, color, note, loading }) {
  const palette = {
    teal: {
      box: "border-teal-200 bg-teal-50 text-teal-700",
      glow: "bg-teal-400",
    },
    emerald: {
      box: "border-emerald-200 bg-emerald-50 text-emerald-700",
      glow: "bg-emerald-400",
    },
    amber: {
      box: "border-amber-200 bg-amber-50 text-amber-700",
      glow: "bg-amber-400",
    },
    rose: {
      box: "border-rose-200 bg-rose-50 text-rose-700",
      glow: "bg-rose-400",
    },
    violet: {
      box: "border-violet-200 bg-violet-50 text-violet-700",
      glow: "bg-violet-400",
    },
    blue: {
      box: "border-blue-200 bg-blue-50 text-blue-700",
      glow: "bg-blue-400",
    },
    slate: {
      box: "border-slate-200 bg-slate-50 text-slate-700",
      glow: "bg-slate-400",
    },
  };

  if (loading) return <div className="h-40 animate-pulse rounded-[2rem] bg-slate-100" />;

  const config = palette[color] || palette.teal;
  const n = toNumber(value);
  const display = money ? moneyText(n) : n.toLocaleString("en-US");

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className={`absolute -left-10 -top-10 h-28 w-28 rounded-full ${config.glow} opacity-10 blur-2xl transition group-hover:opacity-20`} />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${config.box}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-black text-slate-500">{title}</p>
          <p dir="ltr" className="mt-4 truncate font-mono text-2xl font-black leading-tight text-slate-950">
            {display}
          </p>
          <p className="mt-2 text-[11px] font-bold leading-5 text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  );
}

function SystemPulse({ loading, financial, numbers, pendingOperations, healthStatus }) {
  if (loading) return <div className="h-full min-h-[360px] animate-pulse rounded-[2rem] bg-slate-100" />;

  const mismatch = financial?.reconciliation_status === "mismatch";

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-slate-100 blur-3xl" />

      <div className="relative z-10 mb-5 flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border",
            healthStatus === "stable"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : healthStatus === "warning"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
          ].join(" ")}
        >
          {healthStatus === "stable" ? <ShieldCheck className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
        </div>

        <div className="text-right">
          <h3 className="text-xl font-black text-slate-950">نبض النظام</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {healthStatus === "stable"
              ? "لا يوجد عمليات معلقة حاليًا"
              : healthStatus === "warning"
                ? "يوجد فرق في المطابقة المالية"
                : "يوجد عمليات تحتاج متابعة"}
          </p>
        </div>
      </div>

      {pendingOperations.length > 0 ? (
        <div className="relative z-10 space-y-3">
          {pendingOperations.map((item) => (
            <div key={item.id || item.reference_number} className="rounded-3xl border border-amber-100 bg-amber-50/70 p-4 text-right">
              <div className="flex items-center justify-between gap-3">
                <Badge color="amber">معلقة</Badge>
                <p className="truncate text-sm font-black text-slate-900">{getName(item)}</p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span dir="ltr" className="font-mono font-black text-slate-800">
                  {moneyText(getAmount(item))}
                </span>
                <span className="truncate text-slate-500">{item.reference_number || item.code || `#${item.id}`}</span>
              </div>
            </div>
          ))}

          <Link to="/transactions" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-teal-700">
            عرض كل العمليات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="relative z-10 space-y-4">
          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5 text-right">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-black text-emerald-900">كل العمليات الحالية مستقرة</p>
                <p className="mt-1 text-xs font-bold text-emerald-700">لا يوجد عمليات معلقة تحتاج متابعة</p>
              </div>
            </div>
          </div>

          <PulseRow label="المكتملة" value={numbers.completedCount} />
          <PulseRow label="قيمة المكتمل" value={moneyText(numbers.completedAmount)} />
          <PulseRow label="عمليات اليوم" value={numbers.todayOperations} />
          <PulseRow label="عمولات اليوم" value={moneyText(numbers.todayCommissions)} />

          {mismatch && (
            <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-4 text-right">
              <p className="text-sm font-black text-rose-900">تنبيه مطابقة مالية</p>
              <p dir="ltr" className="mt-2 font-mono text-lg font-black text-rose-700">
                {moneyText(financial?.reconciliation_difference)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PulseRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span dir="ltr" className="font-mono text-sm font-black text-slate-900">
        {value}
      </span>
      <span className="text-xs font-black text-slate-500">{label}</span>
    </div>
  );
}

function FinancialPositionPanel({ loading, totals }) {
  if (loading) return <div className="h-full min-h-[330px] animate-pulse rounded-[2rem] bg-slate-100" />;

  const hasRows = totals.receivable.length > 0 || totals.payable.length > 0;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
        <Link to="/reports" className="inline-flex items-center gap-1 text-xs font-black text-teal-700">
          عرض
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <div className="text-right">
          <h3 className="text-lg font-black text-slate-950">المركز المالي</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">ذمم لنا وعلينا حسب العملة</p>
        </div>
      </div>

      <div className="p-5">
        {!hasRows ? (
          <EmptyState title="لا توجد ذمم مفتوحة" />
        ) : (
          <div className="space-y-4">
            <ObligationGroup title="المبالغ المستحقة لنا" rows={totals.receivable} color="emerald" />
            <ObligationGroup title="المبالغ المستحقة علينا" rows={totals.payable} color="rose" />
          </div>
        )}
      </div>
    </div>
  );
}

function ObligationGroup({ title, rows, color }) {
  const colorClass = color === "rose" ? "text-rose-700 bg-rose-50" : "text-emerald-700 bg-emerald-50";

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-right">
      <p className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${colorClass}`}>{title}</p>

      {rows.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-slate-400">لا توجد مبالغ مفتوحة</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={`${title}-${row.currency}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2">
              <span dir="ltr" className="font-mono text-sm font-black text-slate-950">
                {formatMoney(row.remaining)} {row.currency}
              </span>
              <span className="text-xs font-black text-slate-500">المتبقي</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPanel({ title, subtitle, items, loading, type, emptyTitle, to }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-teal-50 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
        <Link to={to} className="inline-flex items-center gap-1 text-xs font-black text-teal-700">
          عرض
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        <div className="text-right">
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <div className="space-y-3">
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
  const count = getCount(item);

  const badge =
    type === "supplier"
      ? { label: "مورد", color: "violet" }
      : type === "box"
        ? { label: item.type || "صندوق", color: "teal" }
        : { label: "عمولة", color: "emerald" };

  return (
    <div className="group rounded-3xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:border-teal-100 hover:bg-teal-50/40">
      <div className="flex items-center justify-between gap-3">
        <Badge color={badge.color}>{badge.label}</Badge>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
            {item.status || item.currency || item.type || item.reference_number || (count ? `${count} عمليات` : "—")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {type === "supplier" && item.commission_total !== undefined ? (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-violet-700">
            عمولة {moneyText(item.commission_total)}
          </span>
        ) : (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
            {shortDate(item.last_activity_date || item.created_at)}
          </span>
        )}

        <p dir="ltr" className="font-mono text-base font-black text-slate-900">
          {moneyText(amount)}
        </p>
      </div>
    </div>
  );
}
