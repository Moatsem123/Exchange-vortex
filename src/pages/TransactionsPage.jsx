import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  Download,
  Eye,
  Filter,
  Hash,
  Loader2,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  Wallet,
  X,
} from "lucide-react";

import transactionsService from "../services/transactions";

const TYPE_TABS = [
  { key: "all", label: "الكل" },
  { key: "receive", label: "استلام" },
  { key: "deliver", label: "تسليم" },
];

const STATUS_OPTIONS = [
  { key: "all", label: "جميع الحالات" },
  { key: "completed", label: "مكتمل" },
  { key: "pending", label: "معلق" },
  { key: "cancelled", label: "ملغى" },
];

// # Helpers
function mapTxn(t) {
  return {
    id: t.id,
    code: t.code || t.reference || `TXN-${t.id}`,
    customer: t.customer?.name || t.customer_name || "—",
    customerEmail: t.customer?.email || t.customer?.phone || "",
    amount: Number(t.amount ?? 0),
    currency: t.currency || t.currency_code || "—",
    type: t.type || (t.is_receive ? "receive" : "deliver"),
    status: t.status || "completed",
    note: t.note || t.description || "",
    createdAt: t.created_at || t.date || null,
    _raw: t,
  };
}

function formatAmount(n) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function formatRelative(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 86400 * 7) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString("ar");
  } catch {
    return "—";
  }
}

const STATUS_STYLES = {
  completed: { label: "مكتمل", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending: { label: "معلق", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  cancelled: { label: "ملغى", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [viewTxn, setViewTxn] = useState(null);
  const [deleteTxn, setDeleteTxn] = useState(null);

  const focusedId = searchParams.get("id");

  // # Fetch with debounce + cancel
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page,
          per_page: 10,
          ...(search.trim() && { search: search.trim() }),
          ...(type !== "all" && { type }),
          ...(status !== "all" && { status }),
        };

        const res = await transactionsService.list(params);
        if (id !== requestId.current) return;

        const list = Array.isArray(res) ? res : res.data || [];
        setItems(list.map(mapTxn));
        if (res.meta) setMeta({ ...meta, ...res.meta });
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err.response?.data?.message || "تعذر تحميل الحركات");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, search ? 350 : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, status, page]);

  const stats = useMemo(() => {
    const received = items.filter((t) => t.type === "receive").reduce((a, b) => a + b.amount, 0);
    const delivered = items.filter((t) => t.type === "deliver").reduce((a, b) => a + b.amount, 0);
    const pending = items.filter((t) => t.status === "pending").length;
    return {
      total: meta.total || items.length,
      received,
      delivered,
      pending,
    };
  }, [items, meta.total]);

  async function handleConfirmDelete() {
    if (!deleteTxn) return;
    try {
      await transactionsService.remove(deleteTxn.id);
      setItems((prev) => prev.filter((t) => t.id !== deleteTxn.id));
      setDeleteTxn(null);
    } catch (err) {
      alert(err.response?.data?.message || "فشل حذف الحركة");
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      <ViewTxnModal txn={viewTxn} onClose={() => setViewTxn(null)} />
      <DeleteConfirmModal
        txn={deleteTxn}
        onClose={() => setDeleteTxn(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* # Header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="text-right">
          <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
            الحركات
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            إدارة جميع عمليات الاستلام والتسليم
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_16px_-8px_rgba(30,41,59,0.18)] sm:text-sm"
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            تصدير
          </button>
          <button
            type="button"
            onClick={() => navigate("/add-transaction")}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-slate-700 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة عملية
          </button>
        </div>
      </motion.div>

      {/* # Stat cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Activity}
          label="إجمالي الحركات"
          value={stats.total}
          color="slate"
          delay={0}
        />
        <StatTile
          icon={ArrowDownLeft}
          label="استلام (الصفحة)"
          value={`$${formatAmount(stats.received)}`}
          color="emerald"
          delay={0.05}
        />
        <StatTile
          icon={ArrowUpRight}
          label="تسليم (الصفحة)"
          value={`$${formatAmount(stats.delivered)}`}
          color="rose"
          delay={0.1}
        />
        <StatTile
          icon={Wallet}
          label="حركات معلقة"
          value={stats.pending}
          color="amber"
          delay={0.15}
        />
      </section>

      {/* # Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-slate-700" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث برقم الحركة، اسم العميل، رقم الجوال..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-10 text-right text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-slate-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,41,59,0.08)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/60 p-1">
              {TYPE_TABS.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setType(t.key);
                      setPage(1);
                    }}
                    className={[
                      "rounded-lg px-3 py-2 text-[11px] font-bold transition-all duration-200 sm:text-xs",
                      active
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-900",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-right text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-500 sm:text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* # Table */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-5 py-4 font-bold">رقم الحركة</th>
                <th className="px-5 py-4 font-bold">العميل</th>
                <th className="px-5 py-4 font-bold">النوع</th>
                <th className="px-5 py-4 font-bold">المبلغ</th>
                <th className="px-5 py-4 font-bold">الحالة</th>
                <th className="px-5 py-4 font-bold">التاريخ</th>
                <th className="px-5 py-4 text-center font-bold">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.tr
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        <p className="text-xs font-bold">جارٍ تحميل الحركات...</p>
                      </div>
                    </td>
                  </motion.tr>
                )}

                {!loading && error && (
                  <motion.tr
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-rose-600">
                        <AlertTriangle className="h-6 w-6" />
                        <p className="text-xs font-bold">{error}</p>
                      </div>
                    </td>
                  </motion.tr>
                )}

                {!loading && !error && items.length === 0 && (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Search className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">لا توجد حركات</p>
                        <p className="text-xs">جرّب تعديل البحث أو الفلتر</p>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>

              {!loading &&
                !error &&
                items.map((t, index) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    index={index}
                    highlighted={String(t.id) === focusedId}
                    onView={() => setViewTxn(t)}
                    onDelete={() => setDeleteTxn(t)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* # Pagination */}
        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:flex-row">
            <span>
              عرض {(meta.current_page - 1) * meta.per_page + 1} إلى{" "}
              {(meta.current_page - 1) * meta.per_page + items.length} من{" "}
              <span className="font-black text-slate-900">{meta.total}</span> حركة
            </span>

            <Pagination
              current={meta.current_page || page}
              last={meta.last_page || 1}
              onChange={setPage}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// # Stat tile
function StatTile({ icon: Icon, label, value, color = "slate", delay = 0 }) {
  const palette = {
    slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  };
  const c = palette[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-shadow duration-300 hover:shadow-[0_14px_30px_-16px_rgba(30,41,59,0.20)]"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.bg} ${c.border} ${c.text} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 sm:text-xs">{label}</p>
          <p className="mt-2 text-lg font-black text-slate-900 sm:text-2xl tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// # Table row
function TxnRow({ txn, index, highlighted, onView, onDelete }) {
  const isReceive = txn.type === "receive";
  const status = STATUS_STYLES[txn.status] || STATUS_STYLES.completed;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={[
        "group border-b border-slate-100 transition-all duration-300 hover:bg-teal-50/40",
        highlighted ? "bg-teal-50/60" : "",
      ].join(" ")}
    >
      <td className="px-5 py-4">
        <span dir="ltr" className="font-mono text-xs font-bold text-slate-700 transition-colors group-hover:text-teal-700">
          {txn.code}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="text-right">
          <p className="font-bold text-slate-900">{txn.customer}</p>
          {txn.customerEmail && (
            <p className="mt-0.5 text-[11px] text-slate-400">{txn.customerEmail}</p>
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition-all duration-300 group-hover:scale-105",
            isReceive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {isReceive ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {isReceive ? "استلام" : "تسليم"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="font-black text-slate-900 tabular-nums">
          {txn.currency} {formatAmount(txn.amount)}
        </div>
      </td>

      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${status.bg} ${status.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      <td className="px-5 py-4 text-slate-500">
        <span className="text-xs">{formatRelative(txn.createdAt)}</span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/50 hover:bg-teal-50 hover:text-teal-700 hover:shadow-[0_6px_18px_-4px_rgba(45,212,191,0.40)] active:scale-95"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-[0_6px_18px_-4px_rgba(244,63,94,0.30)] active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// # Pagination
function Pagination({ current, last, onChange }) {
  if (last <= 1) return null;

  const pages = [];
  const max = Math.min(last, 5);
  let start = Math.max(1, current - 2);
  const end = Math.min(last, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={[
            "h-9 min-w-9 rounded-lg px-3 text-xs font-bold transition-all duration-200",
            p === current
              ? "bg-slate-800 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
          ].join(" ")}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={current === last}
        onClick={() => onChange(current + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}

// # View modal
function ViewTxnModal({ txn, onClose }) {
  return (
    <AnimatePresence>
      {txn && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-l from-slate-50 to-white px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">تفاصيل الحركة</p>
                  <p dir="ltr" className="font-mono text-sm font-black text-slate-900">{txn.code}</p>
                </div>
              </div>

              <div className="space-y-2 p-5">
                <DetailRow icon={UserIcon} label="العميل" value={txn.customer} />
                <DetailRow icon={Hash} label="المعرف" value={`#${txn.id}`} />
                <DetailRow
                  icon={txn.type === "receive" ? ArrowDownLeft : ArrowUpRight}
                  label="النوع"
                  value={txn.type === "receive" ? "استلام" : "تسليم"}
                />
                <DetailRow
                  icon={Coins}
                  label="المبلغ"
                  value={`${txn.currency} ${formatAmount(txn.amount)}`}
                />
                <DetailRow
                  icon={CreditCard}
                  label="الحالة"
                  value={STATUS_STYLES[txn.status]?.label || txn.status}
                />
                <DetailRow icon={CalendarDays} label="التاريخ" value={formatRelative(txn.createdAt)} />
                {txn.note && <DetailRow icon={Activity} label="ملاحظة" value={txn.note} />}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-2.5">
      <div className="text-right">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

// # Delete confirm modal
function DeleteConfirmModal({ txn, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {txn && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <motion.div
                  initial={{ rotate: -180, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  <AlertTriangle className="h-7 w-7" />
                </motion.div>
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-slate-900">حذف الحركة</h3>
                <p className="mt-2 text-xs text-slate-500">
                  سيتم حذف الحركة <span dir="ltr" className="font-mono font-black text-slate-700">{txn.code}</span> نهائيًا.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  حذف نهائي
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TransactionsPage;