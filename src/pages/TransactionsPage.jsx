import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Building2,
  CheckCheck,
  ChevronDown,
  Clock3,
  Coins,
  Copy,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import operationsService from "../services/operations";
import dashboardService from "../services/dashboard";
import { extractApiError, formatCompactNumber, formatDate, formatMoney, unwrapList } from "../shared/helpers";

const PER_PAGE = 10;

const STATUS_META = {
  completed: { label: "مكتملة", color: "emerald" },
  pending: { label: "قيد التنفيذ", color: "amber" },
  cancelled: { label: "ملغاة", color: "rose" },
};

const TYPE_OPTIONS = [
  { value: "", label: "نوع العملية" },
  { value: "supplier", label: "تمويل تاجر" },
  { value: "box", label: "تمويل صندوق" },
  { value: "transfer", label: "تحويل بين حسابات" },
];

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "pending", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

function unwrapPayload(res) {
  return res?.data?.data || res?.data || res || {};
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

function getOperationType(operation) {
  const notes = String(operation?.notes || "").toLowerCase();

  if (notes.includes("type: transfer")) {
    return {
      key: "transfer",
      label: "تحويل بين حسابات",
      color: "blue",
      icon: ArrowRightLeft,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-200",
    };
  }

  if (operation?.supplier_id || operation?.supplier) {
    return {
      key: "supplier",
      label: "تمويل تاجر",
      color: "violet",
      icon: Building2,
      bgColor: "bg-violet-50",
      textColor: "text-violet-600",
      borderColor: "border-violet-200",
    };
  }

  return {
    key: "box",
    label: "تمويل صندوق",
    color: "teal",
    icon: Wallet,
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
    borderColor: "border-teal-200",
  };
}

function getCreatorName(operation) {
  return operation?.creator?.name || operation?.user?.name || "—";
}

function getCustomerName(operation) {
  return operation?.customer?.name || operation?.customer_name || "—";
}

function getSupplierName(operation) {
  return operation?.supplier?.name || operation?.supplier_name || "—";
}

function getBoxName(operation) {
  return operation?.box?.name || operation?.box_name || "—";
}

function getSearchText(operation) {
  return [
    operation?.reference_number,
    operation?.notes,
    operation?.status,
    operation?.customer_currency,
    operation?.supplier_currency,
    getCustomerName(operation),
    getSupplierName(operation),
    getBoxName(operation),
    operation?.customer?.customer_code,
    operation?.supplier?.customer_code,
    getCreatorName(operation),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesType(operation, type) {
  if (!type) return true;
  return getOperationType(operation).key === type;
}

function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    pendingAmount: 0,
    loading: true,
  });

  const [selectedId, setSelectedId] = useState(searchParams.get("id") || null);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await operationsService.list({
        page: search || typeFilter || statusFilter ? 1 : page,
        per_page: search || typeFilter || statusFilter ? 100 : PER_PAGE,
        ...(statusFilter && { status: statusFilter }),
      });

      const { items: list, meta: m } = unwrapList(res);
      const term = search.trim().toLowerCase();

      const filteredList = list.filter((operation) => {
        const passSearch = term ? getSearchText(operation).includes(term) : true;
        const passType = matchesType(operation, typeFilter);
        const passStatus = statusFilter ? operation.status === statusFilter : true;
        return passSearch && passType && passStatus;
      });

      setItems(filteredList);
      setMeta({
        total: search || typeFilter || statusFilter ? filteredList.length : Number(m?.total ?? filteredList.length),
        current_page: search || typeFilter || statusFilter ? 1 : Number(m?.current_page ?? page),
        last_page: search || typeFilter || statusFilter ? 1 : Number(m?.last_page ?? 1),
        per_page: Number(m?.per_page ?? PER_PAGE),
      });
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStats = useCallback(async () => {
    setStats((state) => ({ ...state, loading: true }));

    try {
      const res = await dashboardService.summary("7d");
      const data = unwrapPayload(res);

      setStats({
        total:
          Number(data.pending_operations_count || 0) +
          Number(data.completed_operations_count || 0) +
          Number(data.cancelled_operations_count || 0),
        pending: Number(data.pending_operations_count || 0),
        completed: Number(data.completed_operations_count || 0),
        cancelled: Number(data.cancelled_operations_count || 0),
        pendingAmount: Number(data.pending_amount_total || 0),
        loading: false,
      });
    } catch {
      setStats((state) => ({ ...state, loading: false }));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedData(null);
      return;
    }

    setSelectedLoading(true);

    operationsService
      .show(selectedId)
      .then((res) => setSelectedData(unwrapPayload(res)))
      .catch(() => setSelectedData(null))
      .finally(() => setSelectedLoading(false));
  }, [selectedId]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    if (selectedId) next.set("id", String(selectedId));
    else next.delete("id");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [selectedId, searchParams, setSearchParams]);

  async function refreshAll() {
    await Promise.all([load(), loadStats()]);
    if (selectedId) {
      operationsService
        .show(selectedId)
        .then((res) => setSelectedData(unwrapPayload(res)))
        .catch(() => setSelectedData(null));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;

    setBusy(true);

    try {
      await operationsService.remove(confirmDelete.id);
      toast.success("تم حذف العملية");
      setConfirmDelete(null);

      if (selectedId && Number(selectedId) === confirmDelete.id) {
        setSelectedId(null);
      }

      await refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(operation) {
    if (!operation || operation.status !== "pending") return;

    setBusy(true);

    try {
      await operationsService.complete(operation.id);
      toast.success("تم تحويل العملية إلى مكتملة");
      await refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirmCancel || confirmCancel.status !== "pending") return;

    setBusy(true);

    try {
      await operationsService.cancel(confirmCancel.id, {
        cancellation_reason: "تم الإلغاء من الواجهة",
      });
      toast.success("تم إلغاء العملية");
      setConfirmCancel(null);
      await refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleApplyFilters() {
    setSearch(searchInput.trim());
    setTypeFilter(typeInput);
    setStatusFilter(statusInput);
    setPage(1);
  }

  function handleTypeChange(value) {
    setTypeInput(value);
    setTypeFilter(value);
    setPage(1);
  }

  function handleStatusChange(value) {
    setStatusInput(value);
    setStatusFilter(value);
    setPage(1);
  }

  function handleReset() {
    setSearchInput("");
    setTypeInput("");
    setStatusInput("");
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
              <ArrowRightLeft className="h-7 w-7 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900">المعاملات</h1>
              <p className="mt-1 text-sm text-slate-500">عرض وإدارة جميع العمليات والتحويلات</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/add-transaction")}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-lg shadow-teal-500/20 transition hover:shadow-xl hover:shadow-teal-500/30"
              style={{ background: "hsl(179, 87%, 28%)" }}
            >
              <Plus className="h-4 w-4" />
              إضافة معاملة
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Filter className="h-4 w-4" />
              إعادة تعيين
            </button>

            <FilterSelect value={typeInput} onChange={handleTypeChange} options={TYPE_OPTIONS} placeholder="نوع العملية" />
            <FilterSelect value={statusInput} onChange={handleStatusChange} options={STATUS_OPTIONS} placeholder="الحالة" />

            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchInput(value);
                  setSearch(value.trim());
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters();
                }}
                placeholder="ابحث عن عملية، عميل، تاجر، صندوق، مرجع..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-bold text-slate-900 transition placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="إجمالي العمليات" value={stats.total} icon={ArrowRightLeft} color="blue" suffix="عملية" loading={stats.loading} />
          <StatsCard label="قيد التنفيذ" value={stats.pending} icon={Clock3} color="amber" suffix="عملية" loading={stats.loading} />
          <StatsCard label="مكتملة" value={stats.completed} icon={CheckCheck} color="emerald" suffix="عملية" loading={stats.loading} />
          <StatsCard label="المبلغ المعلق" value={stats.pendingAmount} icon={Coins} color="violet" suffix="USD" loading={stats.loading} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={load} />
          ) : items.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="لا توجد معاملات" description="ابدأ بإضافة معاملة جديدة" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-right text-xs font-black text-slate-600">
                      <th className="whitespace-nowrap px-4 py-3">الإجراءات</th>
                      <th className="whitespace-nowrap px-4 py-3">المرجع والموظف</th>
                      <th className="whitespace-nowrap px-4 py-3">العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">مصدر الأموال</th>
                      <th className="whitespace-nowrap px-4 py-3">مبلغ العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">مبلغ المصدر</th>
                      <th className="whitespace-nowrap px-4 py-3">العمولة</th>
                      <th className="whitespace-nowrap px-4 py-3">نوع العملية</th>
                      <th className="whitespace-nowrap px-4 py-3">الحالة</th>
                      <th className="whitespace-nowrap px-4 py-3">التاريخ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((operation) => (
                      <TransactionRow
                        key={operation.id}
                        operation={operation}
                        busy={busy}
                        onView={() => setSelectedId(operation.id)}
                        onDelete={() => setConfirmDelete(operation)}
                        onComplete={() => handleComplete(operation)}
                        onCancel={() => setConfirmCancel(operation)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 px-4 py-3">
                <Pagination
                  currentPage={meta.current_page}
                  lastPage={meta.last_page}
                  total={meta.total}
                  perPage={meta.per_page}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedId && (
          <TransactionDetailsPanel data={selectedData} loading={selectedLoading} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            open={!!confirmDelete}
            title="حذف العملية"
            message={`هل أنت متأكد من حذف العملية "${confirmDelete.reference_number}"؟`}
            confirmLabel="حذف"
            confirmColor="rose"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
            loading={busy}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmCancel && (
          <ConfirmDialog
            open={!!confirmCancel}
            title="إلغاء العملية"
            message={`هل أنت متأكد من إلغاء العملية "${confirmCancel.reference_number}"؟`}
            confirmLabel="إلغاء العملية"
            confirmColor="rose"
            onConfirm={handleCancel}
            onCancel={() => setConfirmCancel(null)}
            loading={busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color, suffix, loading }) {
  const colorStyles = {
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", border: "hover:border-blue-300", glow: "hover:shadow-blue-100", gradient: "hover:from-blue-50/70" },
    emerald: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", border: "hover:border-emerald-300", glow: "hover:shadow-emerald-100", gradient: "hover:from-emerald-50/70" },
    rose: { iconBg: "bg-rose-50", iconText: "text-rose-600", border: "hover:border-rose-300", glow: "hover:shadow-rose-100", gradient: "hover:from-rose-50/70" },
    violet: { iconBg: "bg-violet-50", iconText: "text-violet-600", border: "hover:border-violet-300", glow: "hover:shadow-violet-100", gradient: "hover:from-violet-50/70" },
    amber: { iconBg: "bg-amber-50", iconText: "text-amber-600", border: "hover:border-amber-300", glow: "hover:shadow-amber-100", gradient: "hover:from-amber-50/70" },
  };

  const currentColor = colorStyles[color] || colorStyles.blue;
  const displayValue = formatCompactNumber(Number(value || 0));

  if (loading) {
    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${currentColor.border} ${currentColor.glow} bg-gradient-to-l from-transparent to-white ${currentColor.gradient}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <span className="text-sm font-bold text-slate-500">{label}</span>
          <span className="mt-3 block max-w-full truncate text-2xl font-black text-slate-900 transition group-hover:text-slate-950 sm:text-3xl" dir="ltr" title={String(value)}>
            {displayValue}
          </span>
          <span className="mt-2 block text-xs text-slate-400">{suffix}</span>
        </div>

        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${currentColor.iconBg} ${currentColor.iconText} group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function close(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative w-44" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border px-4 text-sm font-black transition ${
          open ? "border-slate-300 bg-white text-slate-950 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        <span>{selected?.label || placeholder}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/70"
          >
            {options.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer rounded-xl px-3 py-2.5 text-right text-sm font-bold transition ${
                  value === option.value ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TransactionRow({ operation, onView, onDelete, onComplete, onCancel, busy }) {
  const meta = getOperationType(operation);
  const statusMeta = getStatusMeta(operation.status);
  const Icon = meta.icon;
  const isPending = operation.status === "pending";

  return (
    <tr className="border-b border-slate-100 text-right transition hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onView} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" title="عرض التفاصيل">
            <Eye className="h-4 w-4" />
          </button>

          {isPending && (
            <>
              <button type="button" onClick={onComplete} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50" title="تحويل إلى مكتملة">
                <CheckCheck className="h-4 w-4" />
              </button>

              <button type="button" onClick={onCancel} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100 disabled:opacity-50" title="إلغاء العملية">
                <X className="h-4 w-4" />
              </button>
            </>
          )}

          <button type="button" onClick={onDelete} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50" title="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{operation.reference_number || "—"}</p>
        <p className="text-xs text-slate-500">{getCreatorName(operation)}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{getCustomerName(operation)}</p>
        <p className="text-xs text-slate-500">{operation.customer?.customer_code ? `#${operation.customer.customer_code}` : "—"}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{operation.supplier ? getSupplierName(operation) : getBoxName(operation)}</p>
        <p className="text-xs text-slate-500">{operation.supplier ? "تاجر" : "صندوق"}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">
          {formatMoney(operation.customer_amount)} {operation.customer_currency || "USD"}
        </p>
        <p className="text-xs text-slate-500">
          صافي: {formatMoney(operation.customer_net_amount || operation.customer_amount)}
          {operation.customer_amount_usd ? ` (≈ $${formatMoney(operation.customer_amount_usd)})` : ""}
        </p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">
          {formatMoney(operation.supplier_amount || operation.customer_amount)} {operation.supplier_currency || operation.customer_currency || "USD"}
        </p>
        <p className="text-xs text-slate-500">
          سعر الصرف {operation.supplier_exchange_rate || operation.customer_exchange_rate || "1"}
          {operation.supplier_amount_usd ? ` (≈ $${formatMoney(operation.supplier_amount_usd)})` : ""}
        </p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">{formatMoney(operation.commission_amount || 0)}</p>
        <p className="text-xs text-slate-500">{operation.commission_type === "percentage" ? "نسبة" : "ثابت"}</p>
      </td>

      <td className="px-4 py-3">
        <Badge color={meta.color} icon={Icon}>{meta.label}</Badge>
      </td>

      <td className="px-4 py-3">
        <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
      </td>

      <td className="px-4 py-3">
        <p className="text-xs text-slate-500">{formatDate(operation.transaction_date || operation.created_at)}</p>
        <p className="text-xs text-slate-400">{formatDate(operation.created_at)}</p>
      </td>
    </tr>
  );
}

function TransactionDetailsPanel({ data, loading, onClose }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (data?.reference_number) {
      navigator.clipboard.writeText(data.reference_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!data && !loading) return null;

  const meta = data ? getOperationType(data) : null;
  const statusMeta = data ? getStatusMeta(data.status) : null;
  const Icon = meta?.icon;

  return (
    <motion.div
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      exit={{ x: -400 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
      dir="rtl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg font-black text-slate-900">تفاصيل العملية</h2>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className={`rounded-2xl border ${meta?.borderColor} ${meta?.bgColor} p-6 text-center`}>
              <Badge color={statusMeta?.color} className="mb-3">{statusMeta?.label}</Badge>

              <div className="mb-2 flex items-center justify-center gap-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${meta?.bgColor} ${meta?.textColor}`}>
                  {Icon && <Icon className="h-6 w-6" />}
                </div>
              </div>

              <p className="mb-2 text-sm font-bold text-slate-600">{meta?.label}</p>

              <p className="text-4xl font-black text-slate-900" dir="ltr">
                {formatMoney(data?.customer_amount || 0)} {data?.customer_currency || "USD"}
              </p>

              <p className="mt-1 text-sm text-slate-500">صافي العميل: {formatMoney(data?.customer_net_amount || data?.customer_amount || 0)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-right">
                  <p className="text-xs font-bold text-slate-500">المرجع</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{data?.reference_number || "—"}</p>
                </div>

                <button type="button" onClick={handleCopy} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-slate-100">
                  {copied ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">معلومات العملية</h3>
              <InfoRow label="تاريخ العملية" value={formatDate(data?.transaction_date || data?.created_at)} />
              <InfoRow label="الموظف المنفذ" value={getCreatorName(data)} />
              <InfoRow label="العميل" value={getCustomerName(data)} />
              <InfoRow label="مصدر الأموال" value={data?.supplier ? getSupplierName(data) : getBoxName(data)} />
              <InfoRow label="نوع المصدر" value={data?.supplier ? "تاجر" : "صندوق"} />
              <InfoRow
                label="مبلغ العميل"
                value={`${formatMoney(data?.customer_amount || 0)} ${data?.customer_currency || "USD"}${
                  data?.customer_amount_usd ? ` (≈ $${formatMoney(data.customer_amount_usd)})` : ""
                }`}
              />
              <InfoRow label="سعر صرف العميل" value={data?.customer_exchange_rate || "1"} />
              <InfoRow
                label="مبلغ التاجر"
                value={`${formatMoney(data?.supplier_amount || 0)} ${data?.supplier_currency || "—"}${
                  data?.supplier_amount_usd ? ` (≈ $${formatMoney(data.supplier_amount_usd)})` : ""
                }`}
              />
              <InfoRow label="سعر صرف التاجر" value={data?.supplier_exchange_rate || "—"} />
              <InfoRow label="نوع العمولة" value={data?.commission_type === "percentage" ? "نسبة" : "ثابت"} />
              <InfoRow label="قيمة العمولة" value={`${formatMoney(data?.commission_amount || 0)} USD`} />
              <InfoRow label="الملاحظات" value={data?.notes || "—"} />
            </div>

            {data?.customer && <CustomerMiniCard title="بيانات العميل" customer={data.customer} />}
            {data?.supplier && <CustomerMiniCard title="بيانات التاجر" customer={data.supplier} />}
          </div>
        </>
      )}
    </motion.div>
  );
}

function CustomerMiniCard({ title, customer }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="mb-1 text-xs font-bold text-slate-500">{title}</p>
      <p className="mb-3 text-sm font-black text-slate-900">{customer?.name || "—"}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <UserRound className="h-3.5 w-3.5" />
          <span>{customer?.customer_code ? `#${customer.customer_code}` : customer?.id || "—"}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Building2 className="h-3.5 w-3.5" />
          <span>{customer?.type === "supplier" ? "تاجر" : "عميل"}</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-left text-xs font-black text-slate-900">{value}</span>
    </div>
  );
}

export default TransactionsPage;
