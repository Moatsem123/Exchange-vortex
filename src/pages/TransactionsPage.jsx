import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Plus,
  Filter,
  ChevronDown,
  Download,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  MoreHorizontal,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  FileText,
  User,
  DollarSign,
  Copy,
  CheckCheck,
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Receipt,
  Printer,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import transactionsService from "../services/transactions";
import { useAuth } from "../context/AuthContext";
import {
  extractApiError,
  formatDate,
  formatMoney,
  formatRelative,
  unwrapList,
} from "../shared/helpers";

const PER_PAGE = 10;

const TX_TYPE_META = {
  receive: {
    label: "إيداع",
    color: "emerald",
    icon: ArrowDownLeft,
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    borderColor: "border-emerald-200",
  },
  send: {
    label: "سحب",
    color: "rose",
    icon: ArrowUpRight,
    bgColor: "bg-rose-50",
    textColor: "text-rose-600",
    borderColor: "border-rose-200",
  },
  transfer: {
    label: "تحويل",
    color: "blue",
    icon: ArrowRightLeft,
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    borderColor: "border-blue-200",
  },
  exchange: {
    label: "صرف",
    color: "amber",
    icon: Coins,
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
    borderColor: "border-amber-200",
  },
};

const STATUS_META = {
  completed: { label: "مكتملة", color: "emerald" },
  pending: { label: "قيد التنفيذ", color: "amber" },
  cancelled: { label: "ملغاة", color: "slate" },
};

const TYPE_OPTIONS = [
  { value: "", label: "نوع المعاملة" },
  { value: "receive", label: "إيداع" },
  { value: "send", label: "سحب" },
  { value: "transfer", label: "تحويل" },
  { value: "exchange", label: "صرف" },
];

const STATUS_OPTIONS = [
  { value: "", label: "الحالة" },
  { value: "completed", label: "مكتملة" },
  { value: "pending", label: "قيد التنفيذ" },
  { value: "cancelled", label: "ملغاة" },
];

function getTypeMeta(type) {
  return TX_TYPE_META[type] || TX_TYPE_META.receive;
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.completed;
}

function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();

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
    totalDeposits: 0,
    totalWithdrawals: 0,
    netMovement: 0,
    depositsChange: 0,
    withdrawalsChange: 0,
    netChange: 0,
    loading: true,
  });

  const [selectedId, setSelectedId] = useState(searchParams.get("id") || null);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [busy, setBusy] = useState(false);


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await transactionsService.list({
        page: search ? 1 : page,
        per_page: search ? 100 : PER_PAGE,
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const { items: list, meta: m } = unwrapList(res);
      const term = search.trim().toLowerCase();
      const filteredList = term
        ? list.filter((tx) => {
            const customerName = tx.customer?.name?.toLowerCase() || "";
            const customerPhone = tx.customer?.phone || "";
            const customerEmail = tx.customer?.email?.toLowerCase() || "";
            const reference = tx.reference_number?.toLowerCase() || "";
            const note = tx.note?.toLowerCase() || "";

            return (
              customerName.includes(term) ||
              customerPhone.includes(term) ||
              customerEmail.includes(term) ||
              reference.includes(term) ||
              note.includes(term)
            );
          })
        : list;

      setItems(filteredList);
      setMeta({
        total: search ? filteredList.length : Number(m?.total ?? filteredList.length),
        current_page: search ? 1 : Number(m?.current_page ?? page),
        last_page: search ? 1 : Number(m?.last_page ?? 1),
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
    setStats((s) => ({ ...s, loading: true }));

    try {
      const res = await transactionsService.dailySummary({});

      const data = res?.data?.data || res?.data || res;

      setStats({
        total: Number(data?.count || 0),
        totalDeposits: Number(data?.receive || 0),
        totalWithdrawals: Number(data?.send || 0),
        netMovement: Number(data?.net || 0),
        depositsChange: 12.6,
        withdrawalsChange: -8.3,
        netChange: 18.9,
        loading: false,
      });
    } catch {
      setStats((s) => ({ ...s, loading: false }));
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

    transactionsService
      .show(selectedId)
      .then((res) => {
        const tx = res?.data ?? res;
        setSelectedData(tx);
      })
      .catch(() => setSelectedData(null))
      .finally(() => setSelectedLoading(false));
  }, [selectedId]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await transactionsService.remove(confirmDelete.id);
      toast.success("تم حذف المعاملة");
      setConfirmDelete(null);
      if (selectedId && Number(selectedId) === confirmDelete.id) setSelectedId(null);
      load();
      loadStats();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!confirmRestore) return;
    setBusy(true);
    try {
      await transactionsService.restore(confirmRestore.id);
      toast.success("تم استعادة المعاملة");
      setConfirmRestore(null);
      load();
      loadStats();
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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/20">
              <ArrowRightLeft className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">المعاملات</h1>
              <p className="mt-1 text-sm text-slate-500">
                عرض وإدارة جميع معاملات الصرف والتحويل
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
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
              فلترة
            </button>

            <FilterSelect
              value={typeInput}
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
              placeholder="نوع المعاملة"
            />

            <FilterSelect
              value={statusInput}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              placeholder="الحالة"
            />

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
                placeholder="ابحث عن معاملة، عميل، مرجع..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-bold text-slate-900 transition placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="إجمالي الحركات"
            value={stats.total}
            icon={ArrowRightLeft}
            color="blue"
            trend={{ value: 14.2, direction: "up" }}
            suffix="معاملة"
            loading={stats.loading}
          />

          <StatsCard
            label="إيداعات"
            value={formatMoney(stats.totalDeposits)}
            icon={ArrowDownLeft}
            color="emerald"
            trend={{ value: stats.depositsChange, direction: stats.depositsChange >= 0 ? "up" : "down" }}
            suffix="USD"
            loading={stats.loading}
          />

          <StatsCard
            label="سحوبات"
            value={formatMoney(stats.totalWithdrawals)}
            icon={ArrowUpRight}
            color="rose"
            trend={{ value: Math.abs(stats.withdrawalsChange), direction: "down" }}
            suffix="USD"
            loading={stats.loading}
          />

          <StatsCard
            label="صافي الحركة"
            value={formatMoney(stats.netMovement)}
            icon={Coins}
            color="violet"
            trend={{ value: stats.netChange, direction: "up" }}
            suffix="USD"
            loading={stats.loading}
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={load} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="لا توجد معاملات"
              description="ابدأ بإضافة معاملة جديدة"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-right text-xs font-black text-slate-600">
                      <th className="whitespace-nowrap px-4 py-3">الإجراءات</th>
                      <th className="whitespace-nowrap px-4 py-3">التاريخ والوقت</th>
                      <th className="whitespace-nowrap px-4 py-3">المرجع والموظف</th>
                      <th className="whitespace-nowrap px-4 py-3">العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">المبلغ</th>
                      <th className="whitespace-nowrap px-4 py-3">نوع المعاملة</th>
                      <th className="whitespace-nowrap px-4 py-3">الحالة</th>
                      <th className="whitespace-nowrap px-4 py-3">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((tx) => (
                      <TransactionRow
                        key={tx.id}
                        transaction={tx}
                        onView={() => setSelectedId(tx.id)}
                        onDelete={() => setConfirmDelete(tx)}
                        onRestore={() => setConfirmRestore(tx)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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

      {/* Details Panel */}
      <AnimatePresence>
        {selectedId && (
          <TransactionDetailsPanel
            transactionId={selectedId}
            data={selectedData}
            loading={selectedLoading}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            open={!!confirmDelete}
            title="حذف المعاملة"
            message={`هل أنت متأكد من حذف المعاملة "${confirmDelete.reference_number}"؟`}
            confirmLabel="حذف"
            confirmColor="rose"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
            loading={busy}
          />
        )}

        {confirmRestore && (
          <ConfirmDialog
            open={!!confirmRestore}
            title="استعادة المعاملة"
            message={`هل تريد استعادة المعاملة "${confirmRestore.reference_number}"؟`}
            confirmLabel="استعادة"
            confirmColor="teal"
            onConfirm={handleRestore}
            onCancel={() => setConfirmRestore(null)}
            loading={busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color, trend, suffix, loading }) {
  const colorStyles = {
    blue: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-600",
      border: "hover:border-blue-300",
      glow: "hover:shadow-blue-100",
      gradient: "hover:from-blue-50/70",
    },
    emerald: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      border: "hover:border-emerald-300",
      glow: "hover:shadow-emerald-100",
      gradient: "hover:from-emerald-50/70",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      border: "hover:border-rose-300",
      glow: "hover:shadow-rose-100",
      gradient: "hover:from-rose-50/70",
    },
    violet: {
      iconBg: "bg-violet-50",
      iconText: "text-violet-600",
      border: "hover:border-violet-300",
      glow: "hover:shadow-violet-100",
      gradient: "hover:from-violet-50/70",
    },
    amber: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      border: "hover:border-amber-300",
      glow: "hover:shadow-amber-100",
      gradient: "hover:from-amber-50/70",
    },
  };

  const c = colorStyles[color] || colorStyles.blue;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
        transition-all duration-300 cursor-pointer
        hover:-translate-y-1 hover:shadow-xl
        ${c.border} ${c.glow}
        bg-gradient-to-l from-transparent to-white ${c.gradient}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="text-right flex-1">
          <span className="text-sm font-bold text-slate-500">
            {label}
          </span>

          <div className="mt-3">
            <span className="text-4xl font-black text-slate-900 transition group-hover:text-slate-950">
              {value}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-xs text-slate-400">
              {suffix}
            </span>
          </div>

          {trend && (
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <span className="text-xs text-slate-500">عن الفترة السابقة</span>
              <span
                className={`flex items-center gap-1 text-xs font-black ${
                  trend.direction === "up"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trend.value}%
              </span>
            </div>
          )}
        </div>

        <div
          className={`
            flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl
            border transition-all duration-300
            ${c.iconBg} ${c.iconText}
            group-hover:scale-110 group-hover:rotate-3
          `}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-44" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border px-4 text-sm font-black transition ${
          open
            ? "border-slate-300 bg-white text-slate-950 shadow-sm"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
            {options.filter((opt) => opt.value !== "").map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer rounded-xl px-3 py-2.5 text-right text-sm font-bold transition ${
                  value === opt.value
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TransactionRow({ transaction, onView, onDelete, onRestore }) {
  const meta = getTypeMeta(transaction.type);
  const statusMeta = getStatusMeta(transaction.status);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const amount = Number(transaction.amount || 0);
  const isPositive = transaction.type === "receive" || transaction.type === "exchange";
  const amountColor = isPositive ? "text-emerald-600" : "text-rose-600";
  const amountPrefix = isPositive ? "+" : "-";

  return (
    <tr className="border-b border-slate-100 text-right transition hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
          </button>

          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setShowActions(!showActions)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowActions(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-slate-500">{formatDate(transaction.created_at)}</p>
        <p className="text-xs text-slate-400">{new Date(transaction.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} ص</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{transaction.reference_number || "—"}</p>
        <p className="text-xs text-slate-500">{transaction.user?.name || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{transaction.customer?.name || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm font-black ${amountColor}`}>
          {amountPrefix}{formatMoney(Math.abs(amount))}
        </p>
        <p className="text-xs text-slate-500">{transaction.currency_code || "USD"}</p>
      </td>
      <td className="px-4 py-3">
        <Badge color={meta.color} icon={meta.icon}>
          {meta.label}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-slate-500">{formatDate(transaction.transaction_date || transaction.created_at)}</p>
      </td>
    </tr>
  );
}

function TransactionDetailsPanel({ transactionId, data, loading, onClose }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (data?.reference_number) {
      navigator.clipboard.writeText(data.reference_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!data && !loading) return null;

  const meta = data ? getTypeMeta(data.type) : null;
  const statusMeta = data ? getStatusMeta(data.status) : null;
  const isPositive = data?.type === "receive" || data?.type === "exchange";
  const amount = Number(data?.amount || 0);

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
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-black text-slate-900">تفاصيل المعاملة</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Amount Card */}
            <div className={`rounded-2xl border ${meta?.borderColor} ${meta?.bgColor} p-6 text-center`}>
              <Badge color={statusMeta?.color} className="mb-3">
                {statusMeta?.label}
              </Badge>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${meta?.bgColor} ${meta?.textColor}`}>
                  {meta && <meta.icon className="h-6 w-6" />}
                </div>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-2">{meta?.label}</p>
              <p className={`text-4xl font-black ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                {isPositive ? "+" : "-"}{formatMoney(Math.abs(amount))}
              </p>
              <p className="text-sm text-slate-500 mt-1">{data?.currency_code || "USD"}</p>
            </div>

            {/* Reference */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-right flex-1">
                  <p className="text-xs font-bold text-slate-500">المرجع</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{data?.reference_number || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                >
                  {copied ? <CheckCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">معلومات المعاملة</h3>
              
              <InfoRow label="رسوم المعاملة" value={`${formatMoney(data?.commission_amount || 0)} USD`} />
              <InfoRow label="المستفيد" value={data?.counterparty || "—"} />
              <InfoRow label="سعر الصرف" value={`1 USD = ${data?.exchange_rate || "1.0000"} ${data?.currency_code || "USD"}`} />
              <InfoRow label="المبلغ بـ USD" value={`${formatMoney(data?.amount_usd || 0)} USD`} />
              <InfoRow label="طريقة الدفع" value="نقدي" />
              <InfoRow label="الفرع الرئيسي" value={data?.branch || "—"} />
              <InfoRow label="القناة" value="—" />
              <InfoRow label="الموظف المنفذ" value={data?.user?.name || "—"} />
            </div>

            {/* Customer Info */}
            {data?.customer && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900">بيانات العميل</h3>
                
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-black text-slate-900 mb-3">{data.customer.name}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{data.customer.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{data.customer.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{data.customer.country || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>CUST-{data.customer.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-black text-teal-700 transition hover:bg-teal-100"
              >
                <Receipt className="h-4 w-4" />
                عرض الإيصال
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" />
                تحميل الإيصال
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-black text-slate-900">{value}</span>
    </div>
  );
}

export default TransactionsPage;