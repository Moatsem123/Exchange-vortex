/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
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
  Send,
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
import { useAuth } from "../context/AuthContext";
import operationsService from "../services/operations";
import dashboardService from "../services/dashboard";
import boxesService from "../services/boxes";
import { extractApiError, formatCompactNumber, formatDate, formatMoney, unwrapList } from "../shared/helpers";
import {
  describePendingReasons,
  getCustomerDirectionMeta,
  getCustomerSettlementMeta,
  getOperationDirection,
  getOperationStatusMeta,
  getSupplierFulfillmentMeta,
  getSupplierSettlementMeta,
  moneyWithCurrency,
  SETTLEMENT_DIRECTION_LABELS,
  summarizeObligationsByType,
  supplierSettlementTotals,
} from "../shared/operationWorkflow";

const PER_PAGE = 10;

const STATUS_META = {
  completed: { label: "مكتملة", color: "emerald" },
  pending: { label: "معلقة", color: "amber" },
  cancelled: { label: "ملغاة", color: "rose" },
};

const TYPE_OPTIONS = [
  { value: "", label: "نوع العملية" },
  { value: "supplier", label: "مصدر الأموال: المورد" },
  { value: "box", label: "مصدر الأموال: الصندوق" },
  { value: "transfer", label: "تحويل بين حسابات" },
];

const STATUS_OPTIONS = [
  { value: "", label: "كل الحالات" },
  { value: "pending", label: "معلقة" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

const CUSTOMER_SETTLEMENT_OPTIONS = [
  { value: "", label: "تسوية العميل" },
  { value: "pending", label: "غير مسددة" },
  { value: "completed", label: "مسددة" },
];

const SUPPLIER_FULFILLMENT_OPTIONS = [
  { value: "", label: "تنفيذ المورد" },
  { value: "pending", label: "لم ينفذ" },
  { value: "completed", label: "نفذ" },
];

const SUPPLIER_SETTLEMENT_OPTIONS = [
  { value: "", label: "تسوية المورد" },
  { value: "unsettled", label: "غير مسدد" },
  { value: "partially_settled", label: "مسدد جزئياً" },
  { value: "settled", label: "تمت التسوية" },
];

function unwrapPayload(res) {
  return res?.data?.data || res?.data || res || {};
}

function getStatusMeta(status) {
  return getOperationStatusMeta(status) || STATUS_META.pending;
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
      label: "مصدر الأموال: المورد",
      color: "violet",
      icon: Building2,
      bgColor: "bg-violet-50",
      textColor: "text-violet-600",
      borderColor: "border-violet-200",
    };
  }

  return {
    key: "box",
    label: "مصدر الأموال: الصندوق",
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
    operation?.customer_direction,
    operation?.customer_settlement_status,
    operation?.supplier_fulfillment_status,
    operation?.supplier_settlement_status,
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

function getCustomerSettlementFilterValue(operation) {
  return operation?.customer_settlement_status || "pending";
}

function getSupplierFulfillmentFilterValue(operation) {
  if (!operation?.supplier_id && !operation?.supplier) return "";
  return operation?.supplier_fulfillment_status || "pending";
}

function getSupplierSettlementFilterValue(operation) {
  if (!operation?.supplier_id && !operation?.supplier) return "";
  return operation?.supplier_settlement_status || "unsettled";
}

function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { hasPermission } = useAuth();

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
  const [customerSettlementInput, setCustomerSettlementInput] = useState("");
  const [supplierFulfillmentInput, setSupplierFulfillmentInput] = useState("");
  const [supplierSettlementInput, setSupplierSettlementInput] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerSettlementFilter, setCustomerSettlementFilter] = useState("");
  const [supplierFulfillmentFilter, setSupplierFulfillmentFilter] = useState("");
  const [supplierSettlementFilter, setSupplierSettlementFilter] = useState("");
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
  const [customerSettlementAction, setCustomerSettlementAction] = useState(null);
  const [supplierFulfillmentAction, setSupplierFulfillmentAction] = useState(null);
  const [supplierSettlementAction, setSupplierSettlementAction] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [busy, setBusy] = useState(false);

  const canEditOperation = hasPermission?.([
    "transaction.update",
    "transaction.create",
    "operation.update",
    "operation.complete",
  ]);
  const canDeleteOperation = hasPermission?.(["transaction.delete", "operation.cancel", "operation.delete"]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await operationsService.list({
        page:
          search ||
          typeFilter ||
          statusFilter ||
          customerSettlementFilter ||
          supplierFulfillmentFilter ||
          supplierSettlementFilter
            ? 1
            : page,
        per_page:
          search ||
          typeFilter ||
          statusFilter ||
          customerSettlementFilter ||
          supplierFulfillmentFilter ||
          supplierSettlementFilter
            ? 100
            : PER_PAGE,
        ...(statusFilter && { status: statusFilter }),
      });

      const { items: list, meta: m } = unwrapList(res);
      const term = search.trim().toLowerCase();

      const filteredList = list.filter((operation) => {
        const passSearch = term ? getSearchText(operation).includes(term) : true;
        const passType = matchesType(operation, typeFilter);
        const passStatus = statusFilter ? operation.status === statusFilter : true;
        const passCustomerSettlement = customerSettlementFilter
          ? getCustomerSettlementFilterValue(operation) === customerSettlementFilter
          : true;
        const passSupplierFulfillment = supplierFulfillmentFilter
          ? getSupplierFulfillmentFilterValue(operation) === supplierFulfillmentFilter
          : true;
        const passSupplierSettlement = supplierSettlementFilter
          ? getSupplierSettlementFilterValue(operation) === supplierSettlementFilter
          : true;

        return (
          passSearch &&
          passType &&
          passStatus &&
          passCustomerSettlement &&
          passSupplierFulfillment &&
          passSupplierSettlement
        );
      });

      const hasLocalFilters =
        search ||
        typeFilter ||
        statusFilter ||
        customerSettlementFilter ||
        supplierFulfillmentFilter ||
        supplierSettlementFilter;

      setItems(filteredList);
      setMeta({
        total: hasLocalFilters ? filteredList.length : Number(m?.total ?? filteredList.length),
        current_page: hasLocalFilters ? 1 : Number(m?.current_page ?? page),
        last_page: hasLocalFilters ? 1 : Number(m?.last_page ?? 1),
        per_page: Number(m?.per_page ?? PER_PAGE),
      });
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    typeFilter,
    statusFilter,
    customerSettlementFilter,
    supplierFulfillmentFilter,
    supplierSettlementFilter,
    page,
  ]);

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
    boxesService
      .list({ per_page: 100 })
      .then((res) => setBoxes(unwrapList(res).items))
      .catch(() => setBoxes([]));
  }, []);

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

  async function handleCustomerSettlementSubmit(payload) {
    if (!customerSettlementAction) return;

    setBusy(true);

    try {
      await operationsService.settleCustomer(customerSettlementAction.id, payload);
      toast.success("تم تسجيل تسوية العميل");
      setCustomerSettlementAction(null);
      await refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSupplierFulfillmentSubmit(operation) {
    if (!operation) return;

    setBusy(true);

    try {
      await operationsService.fulfillSupplier(operation.id, {
        supplier_fulfillment_status: "completed",
      });
      toast.success("تم تسجيل تنفيذ المورد للعملية");
      setSupplierFulfillmentAction(null);
      await refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSupplierSettlementSubmit(payload) {
    if (!supplierSettlementAction) return;

    setBusy(true);

    try {
      await operationsService.settleSupplier(supplierSettlementAction.id, payload);
      toast.success("تم تسجيل تسوية المورد");
      setSupplierSettlementAction(null);
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
    setCustomerSettlementFilter(customerSettlementInput);
    setSupplierFulfillmentFilter(supplierFulfillmentInput);
    setSupplierSettlementFilter(supplierSettlementInput);
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
    setCustomerSettlementInput("");
    setSupplierFulfillmentInput("");
    setSupplierSettlementInput("");
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setCustomerSettlementFilter("");
    setSupplierFulfillmentFilter("");
    setSupplierSettlementFilter("");
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
              <h1 className="text-2xl font-black text-slate-900">العمليات</h1>
              <p className="mt-1 text-sm text-slate-500">عرض حالة العميل والمورد والتسويات النقدية لكل عملية</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/add-operation")}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-lg shadow-teal-500/20 transition hover:shadow-xl hover:shadow-teal-500/30"
              style={{ background: "hsl(179, 87%, 28%)" }}
            >
              <Plus className="h-4 w-4" />
              إضافة عملية
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
            <FilterSelect
              value={customerSettlementInput}
              onChange={(value) => {
                setCustomerSettlementInput(value);
                setCustomerSettlementFilter(value);
                setPage(1);
              }}
              options={CUSTOMER_SETTLEMENT_OPTIONS}
              placeholder="تسوية العميل"
            />
            <FilterSelect
              value={supplierFulfillmentInput}
              onChange={(value) => {
                setSupplierFulfillmentInput(value);
                setSupplierFulfillmentFilter(value);
                setPage(1);
              }}
              options={SUPPLIER_FULFILLMENT_OPTIONS}
              placeholder="تنفيذ المورد"
            />
            <FilterSelect
              value={supplierSettlementInput}
              onChange={(value) => {
                setSupplierSettlementInput(value);
                setSupplierSettlementFilter(value);
                setPage(1);
              }}
              options={SUPPLIER_SETTLEMENT_OPTIONS}
              placeholder="تسوية المورد"
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
                placeholder="ابحث عن عملية، عميل، مورد، صندوق، مرجع..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm font-bold text-slate-900 transition placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="إجمالي العمليات" value={stats.total} icon={ArrowRightLeft} color="blue" suffix="عملية" loading={stats.loading} />
          <StatsCard label="معلقة" value={stats.pending} icon={Clock3} color="amber" suffix="عملية" loading={stats.loading} />
          <StatsCard label="مكتملة" value={stats.completed} icon={CheckCheck} color="emerald" suffix="عملية" loading={stats.loading} />
          <StatsCard label="مبالغ عمليات معلقة" value={stats.pendingAmount} icon={Coins} color="violet" suffix="USD" loading={stats.loading} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={load} />
          ) : items.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="لا توجد عمليات" description="ابدأ بإضافة عملية جديدة" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-right text-xs font-black text-slate-600">
                      <th className="whitespace-nowrap px-4 py-3">الإجراءات</th>
                      <th className="whitespace-nowrap px-4 py-3">المرجع والموظف</th>
                      <th className="whitespace-nowrap px-4 py-3">العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">المورد / الصندوق</th>
                      <th className="whitespace-nowrap px-4 py-3">الاتجاه</th>
                      <th className="whitespace-nowrap px-4 py-3">مبلغ العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">مبلغ المصدر</th>
                      <th className="whitespace-nowrap px-4 py-3">العمولة</th>
                      <th className="whitespace-nowrap px-4 py-3">الحالة</th>
                      <th className="whitespace-nowrap px-4 py-3">تسوية العميل</th>
                      <th className="whitespace-nowrap px-4 py-3">تنفيذ المورد</th>
                      <th className="whitespace-nowrap px-4 py-3">تسوية المورد</th>
                      <th className="whitespace-nowrap px-4 py-3">التاريخ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((operation) => (
                      <TransactionRow
                        key={operation.id}
                        operation={operation}
                        busy={busy}
                        canEdit={canEditOperation}
                        canDelete={canDeleteOperation}
                        onView={() => setSelectedId(operation.id)}
                        onDelete={() => setConfirmDelete(operation)}
                        onComplete={() => handleComplete(operation)}
                        onCancel={() => setConfirmCancel(operation)}
                        onSettleCustomer={() => setCustomerSettlementAction(operation)}
                        onFulfillSupplier={() => setSupplierFulfillmentAction(operation)}
                        onSettleSupplier={() => setSupplierSettlementAction(operation)}
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

      <CustomerSettlementModal
        operation={customerSettlementAction}
        boxes={boxes}
        loading={busy}
        onClose={() => setCustomerSettlementAction(null)}
        onSubmit={handleCustomerSettlementSubmit}
      />

      <SupplierFulfillmentModal
        operation={supplierFulfillmentAction}
        loading={busy}
        onClose={() => setSupplierFulfillmentAction(null)}
        onConfirm={handleSupplierFulfillmentSubmit}
      />

      <SupplierSettlementModal
        operation={supplierSettlementAction}
        boxes={boxes}
        loading={busy}
        onClose={() => setSupplierSettlementAction(null)}
        onSubmit={handleSupplierSettlementSubmit}
      />

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            open={!!confirmDelete}
            title="حذف العملية"
            description={`هل أنت متأكد من حذف العملية "${confirmDelete.reference_number}"؟ قد يؤثر ذلك على الأرصدة المرتبطة.`}
            confirmText="حذف"
            variant="danger"
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(null)}
            loading={busy}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmCancel && (
          <ConfirmDialog
            open={!!confirmCancel}
            title="إلغاء العملية"
            description={`هل أنت متأكد من إلغاء العملية "${confirmCancel.reference_number}"؟ لن يمكن متابعة تسوياتها بعد الإلغاء.`}
            confirmText="إلغاء العملية"
            variant="danger"
            onConfirm={handleCancel}
            onClose={() => setConfirmCancel(null)}
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

function TransactionRow({
  operation,
  onView,
  onDelete,
  onComplete,
  onCancel,
  onSettleCustomer,
  onFulfillSupplier,
  onSettleSupplier,
  busy,
  canEdit,
  canDelete,
}) {
  const meta = getOperationType(operation);
  const statusMeta = getStatusMeta(operation.status);
  const direction = getOperationDirection(operation);
  const directionMeta = getCustomerDirectionMeta(direction);
  const customerSettlementMeta = getCustomerSettlementMeta(operation.customer_settlement_status, direction);
  const supplierFulfillmentMeta = getSupplierFulfillmentMeta(operation.supplier_fulfillment_status);
  const supplierSettlementMeta = getSupplierSettlementMeta(operation.supplier_settlement_status);
  const isPending = operation.status === "pending";
  const hasSupplier = !!(operation.supplier_id || operation.supplier);
  const canSettleCustomer = canEdit && operation.status !== "cancelled" && operation.customer_settlement_status !== "completed";
  const canFulfillSupplier = canEdit && hasSupplier && operation.status !== "cancelled" && operation.supplier_fulfillment_status !== "completed";
  const canSettleSupplier =
    canEdit &&
    hasSupplier &&
    operation.status !== "cancelled" &&
    operation.supplier_fulfillment_status === "completed" &&
    operation.supplier_settlement_status !== "settled";
  const canCompleteCommercially =
    canEdit &&
    isPending &&
    operation.customer_settlement_status === "completed" &&
    (!hasSupplier || operation.supplier_fulfillment_status === "completed");

  return (
    <tr className="border-b border-slate-100 text-right transition hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onView} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" title="عرض التفاصيل">
            <Eye className="h-4 w-4" />
          </button>

          {isPending && canEdit && (
            <>
              {canSettleCustomer && (
                <button type="button" onClick={onSettleCustomer} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-600 transition hover:bg-teal-100 disabled:opacity-50" title="تسجيل تسوية العميل">
                  <Wallet className="h-4 w-4" />
                </button>
              )}

              {canFulfillSupplier && (
                <button type="button" onClick={onFulfillSupplier} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-600 transition hover:bg-violet-100 disabled:opacity-50" title="تسجيل تنفيذ المورد">
                  <Send className="h-4 w-4" />
                </button>
              )}

              {canCompleteCommercially && (
                <button type="button" onClick={onComplete} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50" title="إكمال العملية حسب قواعد العمل">
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}

              <button type="button" onClick={onCancel} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100 disabled:opacity-50" title="إلغاء العملية">
                <X className="h-4 w-4" />
              </button>
            </>
          )}

          {canSettleSupplier && (
            <button type="button" onClick={onSettleSupplier} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 disabled:opacity-50" title="تسجيل تسوية المورد">
              <Building2 className="h-4 w-4" />
            </button>
          )}

          {canDelete && (
            <button type="button" onClick={onDelete} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50" title="حذف">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
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
        <p className="text-xs text-slate-500">{operation.supplier ? "مورد" : "صندوق"}</p>
      </td>

      <td className="px-4 py-3">
        <Badge color="blue">{directionMeta.shortLabel}</Badge>
        <p className="mt-1 text-[11px] text-slate-500">{directionMeta.cashImpact}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">
          {formatMoney(operation.customer_amount)} {operation.customer_currency || "USD"}
        </p>
        <p className="text-xs text-slate-500">صافي: {formatMoney(operation.customer_net_amount || operation.customer_amount)}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">
          {formatMoney(operation.supplier_amount || operation.customer_amount)} {operation.supplier_currency || operation.customer_currency || "USD"}
        </p>
        <p className="text-xs text-slate-500">سعر الصرف {operation.supplier_exchange_rate || operation.customer_exchange_rate || "1"}</p>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-black text-slate-900" dir="ltr">{formatMoney(operation.commission_amount || 0)}</p>
        <p className="text-xs text-slate-500">{operation.commission_type === "percentage" ? "نسبة" : "ثابت"}</p>
      </td>

      <td className="px-4 py-3">
        <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
        <p className="mt-1 text-[11px] text-slate-500">{meta.label}</p>
      </td>

      <td className="px-4 py-3">
        <Badge color={customerSettlementMeta.color}>{customerSettlementMeta.label}</Badge>
      </td>

      <td className="px-4 py-3">
        {hasSupplier ? (
          <Badge color={supplierFulfillmentMeta.color}>{supplierFulfillmentMeta.shortLabel}</Badge>
        ) : (
          <span className="text-xs font-bold text-slate-400">لا يوجد مورد</span>
        )}
      </td>

      <td className="px-4 py-3">
        {hasSupplier ? (
          <Badge color={supplierSettlementMeta.color}>{supplierSettlementMeta.label}</Badge>
        ) : (
          <span className="text-xs font-bold text-slate-400">لا يوجد مورد</span>
        )}
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
  const direction = data ? getOperationDirection(data) : "customer_pays_intermediary";
  const directionMeta = getCustomerDirectionMeta(direction);
  const customerSettlementMeta = data ? getCustomerSettlementMeta(data.customer_settlement_status, direction) : null;
  const supplierFulfillmentMeta = data ? getSupplierFulfillmentMeta(data.supplier_fulfillment_status) : null;
  const supplierSettlementMeta = data ? getSupplierSettlementMeta(data.supplier_settlement_status) : null;
  const pendingReasons = data ? describePendingReasons(data) : [];
  const receivables = data ? summarizeObligationsByType(data, "receivable") : [];
  const payables = data ? summarizeObligationsByType(data, "payable") : [];
  const supplierTotals = data ? supplierSettlementTotals(data) : null;
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

            {pendingReasons.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-right">
                <p className="mb-2 text-sm font-black text-amber-900">
                  {data?.status === "completed" ? "الوضع المالي للعملية" : "سبب تعليق العملية"}
                </p>

                <div className="space-y-1.5">
                  {pendingReasons.map((reason) => (
                    <p key={reason} className="text-xs font-bold text-amber-800">{reason}</p>
                  ))}
                </div>
              </div>
            )}

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
              <h3 className="text-sm font-black text-slate-900">ملخص العملية</h3>
              <InfoRow label="تاريخ العملية" value={formatDate(data?.transaction_date || data?.created_at)} />
              <InfoRow label="الموظف المنفذ" value={getCreatorName(data)} />
              <InfoRow label="العميل" value={getCustomerName(data)} />
              <InfoRow label="المورد" value={data?.supplier ? getSupplierName(data) : "لا يوجد مورد"} />
              <InfoRow label="العمولة" value={moneyWithCurrency(data?.commission_amount || 0, data?.commission_currency || "USD")} />
              <InfoRow label="نوع العمولة" value={data?.commission_type === "percentage" ? "نسبة" : "ثابت"} />
              <InfoRow label="الملاحظات" value={data?.notes || "—"} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">حالة العميل المالية</h3>
              <InfoRow label="الاتجاه" value={directionMeta.label} />
              <InfoRow label="المبلغ" value={moneyWithCurrency(data?.customer_amount || 0, data?.customer_currency || "USD")} />
              <InfoRow label="صافي العميل" value={moneyWithCurrency(data?.customer_net_amount || data?.customer_amount || 0, data?.customer_currency || "USD")} />
              <InfoRow label="سعر الصرف" value={data?.customer_exchange_rate || "1"} />
              <InfoRow label="الحالة" value={customerSettlementMeta?.fullLabel || "—"} />
              <InfoRow label="تاريخ التسوية" value={formatDate(data?.customer_settled_at)} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">تنفيذ المورد</h3>
              <InfoRow label="المورد" value={data?.supplier ? getSupplierName(data) : "لا يوجد مورد"} />
              <InfoRow label="المبلغ" value={data?.supplier ? moneyWithCurrency(data?.supplier_amount || 0, data?.supplier_currency || "USD") : "—"} />
              <InfoRow label="سعر الصرف" value={data?.supplier_exchange_rate || "—"} />
              <InfoRow label="الحالة" value={data?.supplier ? supplierFulfillmentMeta?.label : "لا يوجد مورد"} />
              <InfoRow label="تاريخ التنفيذ" value={formatDate(data?.supplier_fulfilled_at)} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">تسوية المورد</h3>
              <InfoRow label="الحالة" value={data?.supplier ? supplierSettlementMeta?.label : "لا يوجد مورد"} />
              <InfoRow label="أصل المستحق للمورد" value={data?.supplier ? moneyWithCurrency(supplierTotals?.original || 0, supplierTotals?.currency) : "—"} />
              <InfoRow label="تمت تسويته" value={data?.supplier ? moneyWithCurrency(supplierTotals?.settled || 0, supplierTotals?.currency) : "—"} />
              <InfoRow label="المتبقي علينا" value={data?.supplier ? moneyWithCurrency(supplierTotals?.remaining || 0, supplierTotals?.currency) : "—"} />
            </div>

            <FinancialPosition receivables={receivables} payables={payables} />

            <SettlementHistory settlements={data?.settlements || []} />

            {data?.customer && <CustomerMiniCard title="بيانات العميل" customer={data.customer} />}
            {data?.supplier && <CustomerMiniCard title="بيانات المورد" customer={data.supplier} />}
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
          <span>{customer?.type === "supplier" ? "مورد" : "عميل"}</span>
        </div>
      </div>
    </div>
  );
}

function FinancialPosition({ receivables, payables }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-900">الوضع المالي</h3>

      <ObligationSummary title="المبالغ المستحقة لنا" items={receivables} empty="لا توجد مبالغ مستحقة لنا ظاهرة في بيانات العملية" />
      <ObligationSummary title="المبالغ المستحقة علينا" items={payables} empty="لا توجد مبالغ مستحقة علينا ظاهرة في بيانات العملية" />
    </div>
  );
}

function ObligationSummary({ title, items, empty }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-right">
      <p className="mb-3 text-xs font-black text-slate-600">{title}</p>

      {items.length === 0 ? (
        <p className="text-[11px] font-bold text-slate-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={`${item.role}-${item.currency}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
              <span className="font-mono text-xs font-black text-slate-900" dir="ltr">
                {moneyWithCurrency(item.remaining, item.currency)}
              </span>
              <span className="text-xs font-bold text-slate-600">{item.roleLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettlementHistory({ settlements }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-900">سجل التسويات</h3>

      {!settlements.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-right">
          <p className="text-[11px] font-bold text-slate-400">
            لا يوجد سجل تسويات في استجابة تفاصيل العملية الحالية
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {settlements.map((settlement) => (
            <div key={settlement.id} className="rounded-xl border border-slate-200 bg-white p-3 text-right">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-black text-slate-900" dir="ltr">
                  {moneyWithCurrency(settlement.amount, settlement.currency)}
                </span>
                <Badge color={settlement.direction === "cash_in" ? "emerald" : "rose"}>
                  {SETTLEMENT_DIRECTION_LABELS[settlement.direction] || settlement.direction}
                </Badge>
              </div>
              <p className="text-[11px] font-bold text-slate-500">{formatDate(settlement.settlement_date || settlement.created_at)}</p>
              {settlement.notes && <p className="mt-1 text-[11px] text-slate-500">{settlement.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerSettlementModal({ operation, boxes, loading, onClose, onSubmit }) {
  const existingDirection = getOperationDirection(operation);
  const [direction, setDirection] = useState(
    existingDirection === "unspecified" ? "customer_pays_intermediary" : existingDirection
  );
  const directionMeta = getCustomerDirectionMeta(direction);
  const [boxId, setBoxId] = useState("");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const nextDirection = getOperationDirection(operation);
    setDirection(nextDirection === "unspecified" ? "customer_pays_intermediary" : nextDirection);
    setBoxId("");
    setSettlementDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  }, [operation?.id]);

  if (!operation) return null;

  const matchingBoxes = boxes.filter(
    (box) => String(box.currency || "USD").toUpperCase() === String(operation.customer_currency || "USD").toUpperCase()
  );

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      customer_direction: direction,
      customer_settlement_status: "completed",
      box_id: Number(boxId),
      settlement_date: settlementDate || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <WorkflowModal title="تسجيل تسوية العميل" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImpactBox
          lines={[
            `سيتم تسجيل ${directionMeta.settlementLabel} بمبلغ ${moneyWithCurrency(operation.customer_amount, operation.customer_currency)}.`,
            directionMeta.cashImpact,
          ]}
        />

        <ModalField label="اتجاه التسوية" required>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={existingDirection !== "unspecified"}
            className="ep-input appearance-none disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="customer_pays_intermediary">العميل يرسل أموالاً</option>
            <option value="intermediary_pays_customer">العميل يستلم أموالاً</option>
          </select>
        </ModalField>

        <ModalField label="الصندوق" required>
          <select value={boxId} onChange={(e) => setBoxId(e.target.value)} required className="ep-input appearance-none">
            <option value="">اختر صندوقاً بعملة {operation.customer_currency || "USD"}</option>
            {matchingBoxes.map((box) => (
              <option key={box.id} value={box.id}>
                {box.name} - {box.currency || "USD"} - {formatMoney(box.current_balance || 0)}
              </option>
            ))}
          </select>
        </ModalField>

        <ModalField label="تاريخ التسوية">
          <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="ep-input" />
        </ModalField>

        <ModalField label="ملاحظات">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="ep-input resize-none py-3" />
        </ModalField>

        <ModalActions loading={loading} onClose={onClose} confirmText="تسجيل التسوية" />
      </form>
    </WorkflowModal>
  );
}

function SupplierFulfillmentModal({ operation, loading, onClose, onConfirm }) {
  if (!operation) return null;

  return (
    <WorkflowModal title="تسجيل تنفيذ المورد" onClose={onClose}>
      <div className="space-y-4">
        <ImpactBox
          lines={[
            `سيتم تسجيل أن المورد "${getSupplierName(operation)}" نفذ العملية.`,
            `سيظهر مستحق علينا للمورد بقيمة ${moneyWithCurrency(operation.supplier_amount, operation.supplier_currency)} حتى تتم التسوية النقدية.`,
          ]}
        />

        <ModalActions loading={loading} onClose={onClose} onConfirm={() => onConfirm(operation)} confirmText="تأكيد التنفيذ" />
      </div>
    </WorkflowModal>
  );
}

function SupplierSettlementModal({ operation, boxes, loading, onClose, onSubmit }) {
  const totals = supplierSettlementTotals(operation);
  const [amount, setAmount] = useState("");
  const [boxId, setBoxId] = useState("");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setAmount(operation ? String(totals.remaining || "") : "");
    setBoxId("");
    setSettlementDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  }, [operation?.id]);

  if (!operation) return null;

  const matchingBoxes = boxes.filter(
    (box) => String(box.currency || "USD").toUpperCase() === String(totals.currency || "USD").toUpperCase()
  );

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      amount: Number(amount),
      box_id: Number(boxId),
      operation_obligation_id: totals.obligationId || undefined,
      settlement_date: settlementDate || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <WorkflowModal title="تسجيل تسوية المورد" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ImpactBox
          lines={[
            `المستحق للمورد: ${moneyWithCurrency(totals.original, totals.currency)}.`,
            `تمت تسويته: ${moneyWithCurrency(totals.settled, totals.currency)}. المتبقي: ${moneyWithCurrency(totals.remaining, totals.currency)}.`,
            "سيتم خصم مبلغ التسوية من الصندوق المختار.",
          ]}
        />

        <ModalField label="مبلغ التسوية" required>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={totals.remaining || undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="ep-input"
          />
        </ModalField>

        <ModalField label="الصندوق" required>
          <select value={boxId} onChange={(e) => setBoxId(e.target.value)} required className="ep-input appearance-none">
            <option value="">اختر صندوقاً بعملة {totals.currency || "USD"}</option>
            {matchingBoxes.map((box) => (
              <option key={box.id} value={box.id}>
                {box.name} - {box.currency || "USD"} - {formatMoney(box.current_balance || 0)}
              </option>
            ))}
          </select>
        </ModalField>

        <ModalField label="تاريخ التسوية">
          <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="ep-input" />
        </ModalField>

        <ModalField label="ملاحظات">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="ep-input resize-none py-3" />
        </ModalField>

        <ModalActions loading={loading} onClose={onClose} confirmText="تسجيل التسوية" />
      </form>
    </WorkflowModal>
  );
}

function WorkflowModal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      >
        <motion.div
          className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          onMouseDown={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-black text-slate-900">{title}</h3>
          </div>

          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ImpactBox({ lines }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right">
      <p className="mb-2 text-xs font-black text-amber-900">الأثر المالي</p>
      <div className="space-y-1.5">
        {lines.map((line) => (
          <p key={line} className="text-xs font-bold text-amber-800">{line}</p>
        ))}
      </div>
    </div>
  );
}

function ModalField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function ModalActions({ loading, onClose, onConfirm, confirmText }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <button type="button" onClick={onClose} disabled={loading} className="ep-btn ep-btn-ghost h-11 flex-1">
        إلغاء
      </button>
      <button type={onConfirm ? "button" : "submit"} onClick={onConfirm} disabled={loading} className="ep-btn ep-btn-primary h-11 flex-1">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
        {confirmText}
      </button>
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
