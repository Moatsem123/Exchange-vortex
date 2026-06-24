import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  UsersRound,
  UserRoundCheck,
  UserPlus,
  Plus,
  Filter,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  X,
  ChevronDown,
  Loader2,
  CalendarDays,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet,
  MoreHorizontal,
  Check,
  Search,
  Building2,
  TrendingUp,
  DollarSign,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import ScrollReveal from "../shared/ScrollReveal";
import { useToast } from "../shared/Toast";
import customersService from "../services/customers";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  extractApiError,
  formatDate,
  formatMoney,
  formatRelative,
  getAmountSign,
  getTransactionTypeMeta,
  unwrapList,
} from "../shared/helpers";

const PER_PAGE = 5;

const TYPE_META = {
  customer: { label: "عميل", color: "teal", icon: UserRoundCheck },
  supplier: { label: "مورد", color: "violet", icon: Building2 },
};

const TYPE_OPTIONS = [
  { value: "", label: "نوع العميل" },
  { value: "customer", label: "عميل" },
  { value: "supplier", label: "مورد" },
];

const STATUS_OPTIONS = [
  { value: "", label: "الحالة" },
  { value: "active", label: "نشط" },
  { value: "inactive", label: "موقوف" },
  { value: "deleted", label: "محذوف" },
];

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.customer;
}

function collectPermissionKeys(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectPermissionKeys(item));
  if (typeof value === "string") return [value];

  if (typeof value === "object") {
    return [
      value.name,
      value.key,
      value.slug,
      value.code,
      value.permission,
      ...(Array.isArray(value.permissions) ? collectPermissionKeys(value.permissions) : []),
    ].filter(Boolean);
  }

  return [];
}

function normalizePermissions(res) {
  const data = res?.data?.data ?? res?.data ?? res ?? [];
  return collectPermissionKeys(data);
}

function isThisMonth(date) {
  if (!date) return false;

  const d = new Date(date);
  const now = new Date();

  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function normalizeBalance(res) {
  const data = res?.data ?? res ?? {};

  if (data?.balance_usd !== undefined) return Number(data.balance_usd) || 0;
  if (data?.current_balance !== undefined) return Number(data.current_balance) || 0;
  if (data?.amount !== undefined) return Number(data.amount) || 0;

  if (Array.isArray(data?.balances)) {
    return data.balances.reduce((sum, b) => sum + Number(b.amount || b.balance || 0), 0);
  }

  if (Array.isArray(data)) {
    return data.reduce((sum, b) => sum + Number(b.amount || b.balance || 0), 0);
  }

  return 0;
}

function getCustomerBalance(customer, balancesMap) {
  if (balancesMap[customer.id] !== undefined) return balancesMap[customer.id];

  if (customer?.balance_usd !== undefined) return Number(customer.balance_usd) || 0;
  if (customer?.current_balance !== undefined) return Number(customer.current_balance) || 0;

  if (typeof customer?.balance === "number" || typeof customer?.balance === "string") {
    return Number(customer.balance) || 0;
  }

  return 0;
}

function friendlyCustomerFieldError(field, message) {
  const text = String(message || "").toLowerCase();

  if (field === "customer_code") {
    if (
      text.includes("مستخدمة") ||
      text.includes("موجود") ||
      text.includes("taken") ||
      text.includes("unique") ||
      text.includes("already")
    ) {
      return "هذا الكود موجود مسبقًا";
    }

    if (text.includes("required") || text.includes("مطلوب") || text.includes("فارغ")) {
      return "الرجاء إدخال كود العميل";
    }

    return "تحقق من كود العميل";
  }

  if (field === "name") {
    if (
      text.includes("مستخدمة") ||
      text.includes("موجود") ||
      text.includes("taken") ||
      text.includes("unique") ||
      text.includes("already")
    ) {
      return "هذا الاسم موجود مسبقًا، الرجاء تغييره";
    }

    if (text.includes("required") || text.includes("مطلوب") || text.includes("فارغ")) {
      return "الرجاء إدخال اسم العميل";
    }

    return "تحقق من اسم العميل";
  }

  if (field === "type") {
    return "الرجاء اختيار التصنيف";
  }

  if (field === "category") {
    return "تصنيف العميل غير صحيح";
  }

  if (field === "balance_usd") {
    return "الرصيد الابتدائي غير صحيح";
  }

  if (field === "is_active") {
    return "حالة العميل غير صحيحة";
  }

  if (field === "note") {
    return "تحقق من الملاحظات";
  }

  return message || "القيمة غير صحيحة";
}

function mapCustomerValidationErrors(err) {
  const apiErrors = err?.response?.data?.errors;

  if (!apiErrors || typeof apiErrors !== "object") return null;

  const mapped = {};

  Object.keys(apiErrors).forEach((field) => {
    const firstMessage = Array.isArray(apiErrors[field]) ? apiErrors[field][0] : apiErrors[field];
    mapped[field] = friendlyCustomerFieldError(field, firstMessage);
  });

  return mapped;
}

function normalizeCustomerName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function checkDuplicateCustomerName(name, ignoreId = null) {
  const normalizedName = normalizeCustomerName(name);

  if (!normalizedName) return false;

  const res = await customersService.list({
    search: name,
    per_page: 100,
    with_trashed: true,
  });

  const { items } = unwrapList(res);

  return items.some((customer) => {
    const sameName = normalizeCustomerName(customer.name) === normalizedName;
    const sameId = ignoreId && String(customer.id) === String(ignoreId);

    return sameName && !sameId;
  });
}

function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const detailsRef = useRef(null);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [balancesMap, setBalancesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisMonth: 0,
    totalBalance: 0,
    loading: true,
  });

  const [selectedId, setSelectedId] = useState(searchParams.get("id") || null);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(searchParams.get("action") === "add");
  const [editCustomer, setEditCustomer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmForce, setConfirmForce] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [permissions, setPermissions] = useState(() =>
    collectPermissionKeys(user?.permissions || user?.role?.permissions || [])
  );
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const withTrashed = statusFilter === "deleted";

  useEffect(() => {
    const localPermissions = collectPermissionKeys(user?.permissions || user?.role?.permissions || []);

    if (localPermissions.length > 0) {
      setPermissions(localPermissions);
      return;
    }

    let cancelled = false;
    setPermissionsLoading(true);

    api
      .get("/permissions")
      .then((res) => {
        if (!cancelled) setPermissions(normalizePermissions(res));
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  const loadBalancesForItems = useCallback(async (customers) => {
    if (!customers.length) {
      setBalancesMap({});
      return;
    }

    setBalancesLoading(true);

    const result = {};

    await Promise.all(
      customers.map(async (customer) => {
        try {
          const res = await customersService.balance(customer.id);
          result[customer.id] = normalizeBalance(res);
        } catch {
          result[customer.id] = Number(customer.balance_usd || customer.current_balance || 0) || 0;
        }
      })
    );

    setBalancesMap(result);
    setBalancesLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await customersService.list({
        page,
        per_page: PER_PAGE,
        with_trashed: withTrashed,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
      });

      let { items: list, meta: m } = unwrapList(res);

      if (statusFilter === "" || statusFilter === "active") {
        list = list.filter((c) => !c.deleted_at && c.is_active !== false);
      }

      if (statusFilter === "inactive") {
        list = list.filter((c) => !c.deleted_at && c.is_active === false);
      }

      if (statusFilter === "deleted") {
        list = list.filter((c) => !!c.deleted_at);
      }

      setItems(list);
      setMeta({
        total: Number(m?.total ?? list.length),
        current_page: Number(m?.current_page ?? page),
        last_page: Number(m?.last_page ?? 1),
        per_page: Number(m?.per_page ?? PER_PAGE),
      });

      loadBalancesForItems(list);
    } catch (err) {
      setError(err);
      setItems([]);
      setBalancesMap({});
    } finally {
      setLoading(false);
    }
  }, [page, withTrashed, search, typeFilter, statusFilter, loadBalancesForItems]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStats = useCallback(async () => {
    setStats((s) => ({ ...s, loading: true }));

    try {
      const [activeRes, allRes, sampleRes] = await Promise.all([
        customersService.list({ per_page: 1, with_trashed: false }).catch(() => null),
        customersService.list({ per_page: 1, with_trashed: true }).catch(() => null),
        customersService.list({ per_page: 50, with_trashed: true }).catch(() => null),
      ]);

      const active = unwrapList(activeRes);
      const all = unwrapList(allRes);
      const sample = unwrapList(sampleRes).items || [];

      const activeTotal = Number(active.meta?.total ?? active.items.length ?? 0);
      const allTotal = Number(all.meta?.total ?? all.items.length ?? activeTotal);

      let totalBalance = 0;

      await Promise.all(
        sample
          .filter((c) => !c.deleted_at)
          .map(async (customer) => {
            try {
              const res = await customersService.balance(customer.id);
              totalBalance += normalizeBalance(res);
            } catch {
              totalBalance += Number(customer.balance_usd || customer.current_balance || 0) || 0;
            }
          })
      );

      setStats({
        total: allTotal || activeTotal,
        active: activeTotal,
        newThisMonth: sample.filter((c) => !c.deleted_at && isThisMonth(c.created_at)).length,
        totalBalance,
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

    let cancelled = false;
    setSelectedLoading(true);

    (async () => {
      try {
        const [customerRes, balanceRes, transactionsRes] = await Promise.all([
          customersService.show(selectedId).catch(() => null),
          customersService.balance(selectedId).catch(() => null),
          customersService.transactions(selectedId, { per_page: 6 }).catch(() => null),
        ]);

        if (cancelled) return;

        setSelectedData({
          customer: customerRes?.data ?? customerRes ?? null,
          balance: normalizeBalance(balanceRes),
          transactions: unwrapList(transactionsRes).items || [],
        });
      } finally {
        if (!cancelled) setSelectedLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [selectedId]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    if (selectedId) next.set("id", String(selectedId));
    else {
      next.delete("id");
      next.delete("action");
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [selectedId, searchParams, setSearchParams]);

  async function handleCreate(payload) {
    setBusy(true);
    setFormErrors({});

    try {
      const nameExists = await checkDuplicateCustomerName(payload.name);

      if (nameExists) {
        setFormErrors({
          name: "هذا الاسم موجود مسبقًا، الرجاء تغييره",
        });
        return;
      }

      await customersService.create(payload);
      toast.success(payload.type === "supplier" ? "تمت إضافة المورد بنجاح" : "تمت إضافة العميل بنجاح");
      setOpenAdd(false);
      await Promise.all([load(), loadStats()]);
    } catch (err) {
      const validationErrors = mapCustomerValidationErrors(err);

      if (validationErrors) {
        setFormErrors(validationErrors);
        return;
      }

      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id, payload) {
    setBusy(true);
    setFormErrors({});

    try {
      const nameExists = await checkDuplicateCustomerName(payload.name, id);

      if (nameExists) {
        setFormErrors({
          name: "هذا الاسم موجود مسبقًا، الرجاء تغييره",
        });
        return;
      }

      await customersService.update(id, payload);
      toast.success("تم تحديث البيانات");
      setEditCustomer(null);
      await Promise.all([load(), loadStats()]);

      if (String(selectedId) === String(id)) {
        setSelectedId(null);
        setTimeout(() => setSelectedId(String(id)), 0);
      }
    } catch (err) {
      const validationErrors = mapCustomerValidationErrors(err);

      if (validationErrors) {
        setFormErrors(validationErrors);
        return;
      }

      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;

    setBusy(true);

    try {
      await customersService.remove(confirmDelete.id);
      toast.success("تم النقل إلى الأرشيف");

      if (String(selectedId) === String(confirmDelete.id)) setSelectedId(null);

      setConfirmDelete(null);
      await Promise.all([load(), loadStats()]);
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
      await customersService.restore(confirmRestore.id);
      toast.success("تمت الاستعادة");
      setConfirmRestore(null);
      await Promise.all([load(), loadStats()]);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForceDelete() {
    if (!confirmForce) return;

    setBusy(true);

    try {
      await customersService.forceDelete(confirmForce.id);
      toast.success("تم الحذف نهائيًا");

      if (String(selectedId) === String(confirmForce.id)) setSelectedId(null);

      setConfirmForce(null);
      await Promise.all([load(), loadStats()]);
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const tableTotalBalance = useMemo(
    () => items.reduce((sum, c) => sum + getCustomerBalance(c, balancesMap), 0),
    [items, balancesMap]
  );

  const statCards = [
    {
      title: "إجمالي العملاء",
      value: stats.total,
      icon: UsersRound,
      color: "amber",
      note: "كل العملاء والموردين",
    },
    {
      title: "النشطون",
      value: stats.active,
      icon: TrendingUp,
      color: "blue",
      note: "نشطون وغير محذوفين",
    },
    {
      title: "الجدد هذا الشهر",
      value: stats.newThisMonth,
      icon: UserPlus,
      color: "violet",
      note: "مسجلون خلال الشهر الحالي",
    },
    {
      title: "إجمالي الأرصدة",
      value: stats.totalBalance || tableTotalBalance,
      prefix: "$",
      icon: DollarSign,
      color: "emerald",
      note: "حسب الأرصدة المتاحة",
      decimals: 2,
    },
  ];

  return (
    <div className="relative z-0 isolate space-y-5">
      <div className="relative z-20 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 pt-2 sm:w-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
            <UsersRound className="h-6 w-6" />
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">العملاء</h1>
            <p className="text-xs text-slate-500 sm:text-sm">إدارة ومتابعة العملاء والموردين</p>
          </div>
        </div>

        <div className="relative z-20 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormErrors({});
              setOpenAdd(true);
            }}
            disabled={permissionsLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "hsl(179, 87%, 28%)" }}
          >
            <Plus className="h-4 w-4" />
            إضافة عميل
          </button>

          <FilterDropdown value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} />
          <FilterDropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("");
              setStatusFilter("");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-xs font-black text-teal-700 transition hover:bg-teal-100"
          >
            <Filter className="h-4 w-4" />
            تصفية
          </button>
        </div>
      </div>

      <section className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4 [&>*]:relative [&>*]:!z-0">
        {statCards.map((card, index) => (
          <StatCard
            key={card.title}
            {...card}
            loading={stats.loading || balancesLoading}
            delay={index * 0.06}
          />
        ))}
      </section>

      <ScrollReveal>
        <div className="relative min-w-0 z-0 ep-card-static overflow-visible">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو كود العميل..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-right text-sm font-bold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>

            <div className="text-right">
              <h3 className="text-base font-black text-slate-900">قائمة العملاء</h3>
              <p className="mt-1 text-[11px] font-bold text-slate-400">
                {loading ? "جارٍ التحميل..." : `${meta.total ?? items.length} سجل`}
              </p>
            </div>
          </div>

          {error && !loading ? (
            <ErrorState title="تعذّر تحميل العملاء" description={extractApiError(error)} onRetry={load} />
          ) : loading ? (
            <TableSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="لا توجد بيانات"
              description="لم يتم العثور على عملاء أو موردين مطابقين للبحث أو الفلاتر"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="ep-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th className="text-right">العميل</th>
                      <th className="text-right">كود العميل</th>
                      <th className="text-right">التصنيف</th>
                      <th className="text-right">الرصيد</th>
                      <th className="text-right">الحالة</th>
                      <th className="text-right">آخر معاملة</th>
                      <th className="text-center">إجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((customer) => {
                      const typeMeta = getTypeMeta(customer.type);
                      const selected = String(selectedId) === String(customer.id);
                      const balance = getCustomerBalance(customer, balancesMap);

                      return (
                        <motion.tr
                          key={customer.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedId(String(customer.id))}
                          className={`ep-row cursor-pointer ${selected ? "bg-teal-50/70" : ""}`}
                        >
                          <td>
                            <div className="flex min-w-[250px] items-center justify-start gap-3 text-right" dir="rtl">
                              <DefaultAvatar customer={customer} size="md" />

                              <div className="min-w-0 flex-1 text-right">
                                <p className="font-black text-slate-900">{customer.name}</p>

                                <p className="mt-0.5 truncate text-[11px] text-slate-500" dir="rtl">
                                  {customer.note || "—"}
                                </p>

                                <div className="mt-1 inline-flex">
                                  <Badge color={typeMeta.color}>{typeMeta.label}</Badge>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span dir="ltr" className="font-mono text-xs text-slate-700">
                              {customer.customer_code || "—"}
                            </span>
                          </td>

                          <td>
                            <Badge color={typeMeta.color}>{typeMeta.label}</Badge>
                          </td>

                          <td>
                            <span
                              dir="ltr"
                              className={[
                                "font-mono text-xs font-black",
                                balance > 0 ? "text-emerald-600" : balance < 0 ? "text-rose-600" : "text-slate-700",
                              ].join(" ")}
                            >
                              {balance > 0 ? "+" : ""}
                              {formatMoney(balance)} USD
                            </span>
                          </td>

                          <td>
                            {customer.deleted_at ? (
                              <Badge color="rose" dot>
                                محذوف
                              </Badge>
                            ) : customer.is_active === false ? (
                              <Badge color="amber" dot>
                                موقوف
                              </Badge>
                            ) : (
                              <Badge color="emerald" dot>
                                نشط
                              </Badge>
                            )}
                          </td>

                          <td className="text-xs text-slate-500">
                            {formatRelative(customer.last_transaction_at || customer.updated_at || customer.created_at)}
                          </td>

                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <IconBtn icon={Eye} onClick={() => setSelectedId(String(customer.id))} color="teal" />

                              {!customer.deleted_at && (
                                <>
                                  <IconBtn
                                    icon={Edit3}
                                    onClick={() => {
                                      setFormErrors({});
                                      setEditCustomer(customer);
                                    }}
                                  />
                                  <IconBtn icon={Trash2} onClick={() => setConfirmDelete(customer)} color="rose" />
                                </>
                              )}

                              {customer.deleted_at && (
                                <>
                                  <IconBtn icon={RotateCcw} onClick={() => setConfirmRestore(customer)} color="emerald" />
                                  {isAdmin && (
                                    <IconBtn icon={Trash2} onClick={() => setConfirmForce(customer)} color="rose" />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200">
                <CustomerPagination
                  current={meta.current_page || page}
                  last={meta.last_page || 1}
                  perPage={meta.per_page || PER_PAGE}
                  count={items.length}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </ScrollReveal>

      <div ref={detailsRef}>
        <AnimatePresence>
          {selectedId && (
            <CustomerDetailPanel
              key={selectedId}
              data={selectedData}
              loading={selectedLoading}
              onClose={() => setSelectedId(null)}
              onEdit={(customer) => {
                setFormErrors({});
                setEditCustomer(customer);
              }}
              onDelete={(customer) => setConfirmDelete(customer)}
              onRestore={(customer) => setConfirmRestore(customer)}
            />
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={openAdd}
        onClose={() => {
          if (!busy) {
            setFormErrors({});
            setOpenAdd(false);
          }
        }}
        title="إضافة عميل جديد"
        subtitle="أدخل بيانات العميل الأساسية"
        icon={UserPlus}
        size="md"
      >
        <CustomerForm
          onSubmit={handleCreate}
          loading={busy}
          errors={formErrors}
          onClearError={(key) => setFormErrors((prev) => ({ ...prev, [key]: "" }))}
          onCancel={() => {
            setFormErrors({});
            setOpenAdd(false);
          }}
        />
      </Modal>

      <Modal
        open={!!editCustomer}
        onClose={() => {
          if (!busy) {
            setFormErrors({});
            setEditCustomer(null);
          }
        }}
        title="تعديل العميل"
        subtitle={editCustomer?.name}
        icon={Edit3}
        size="md"
      >
        {editCustomer && (
          <CustomerForm
            initial={editCustomer}
            onSubmit={(payload) => handleUpdate(editCustomer.id, payload)}
            loading={busy}
            errors={formErrors}
            onClearError={(key) => setFormErrors((prev) => ({ ...prev, [key]: "" }))}
            onCancel={() => {
              setFormErrors({});
              setEditCustomer(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => !busy && setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف العميل"
        description={`سيتم نقل "${confirmDelete?.name || ""}" إلى الأرشيف ويمكن استعادته لاحقًا.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirmRestore}
        onClose={() => !busy && setConfirmRestore(null)}
        onConfirm={handleRestore}
        title="استعادة العميل"
        description={`هل تريد استعادة "${confirmRestore?.name || ""}" من الأرشيف؟`}
        confirmText="استعادة"
        loading={busy}
        variant="success"
      />

      <ConfirmDialog
        open={!!confirmForce}
        onClose={() => !busy && setConfirmForce(null)}
        onConfirm={handleForceDelete}
        title="حذف نهائي"
        description={`سيتم حذف "${confirmForce?.name || ""}" نهائيًا ولا يمكن التراجع.`}
        confirmText="حذف نهائي"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function CustomerPagination({ current, last, perPage, count, onChange }) {
  const safeCurrent = Number(current || 1);
  const safeLast = Math.max(Number(last || 1), 1);

  const start = count > 0 ? (safeCurrent - 1) * perPage + 1 : 0;
  const end = count > 0 ? start + count - 1 : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="text-[11px] font-bold text-slate-500">
        {count > 0 ? `عرض من ${start} إلى ${end}` : "لا توجد بيانات"}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(safeCurrent - 1)}
          disabled={safeCurrent <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ‹
        </button>

        {Array.from({ length: safeLast }).map((_, index) => {
          const pageNumber = index + 1;
          const active = pageNumber === safeCurrent;

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onChange(pageNumber)}
              className={[
                "flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-black transition",
                active
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onChange(safeCurrent + 1)}
          disabled={safeCurrent >= safeLast}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function FilterDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((option) => String(option.value) === String(value));
  const label = selected?.label || options[0]?.label || "الكل";
  const menuOptions = options.filter((option) => option.value !== "");

  useEffect(() => {
    function close(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className={open ? "relative z-30" : "relative z-10"}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={[
          "flex h-11 min-w-[150px] cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition",
          open || value
            ? "border-slate-400 bg-slate-50 shadow-[0_0_0_3px_rgba(15,23,42,0.06)]"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
      >
        <ChevronDown className={["h-4 w-4 text-slate-400 transition", open ? "rotate-180 text-slate-700" : ""].join(" ")} />
        <span>{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute min-w-0 right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-2xl"
          >
            {menuOptions.map((option) => {
              const active = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition",
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {active ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="h-3.5 w-3.5" />}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DefaultAvatar({ customer, size = "md" }) {
  const name = customer?.name || "عميل";
  const firstLetter = name.trim().charAt(0) || "ع";

  const sizes = {
    md: "h-11 w-11 text-sm",
    lg: "h-20 w-20 text-2xl",
  };

  return (
    <div className="relative shrink-0">
      <div
        className={[
          "flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-teal-500 to-slate-800 font-black text-white shadow-md",
          sizes[size] || sizes.md,
        ].join(" ")}
      >
        {firstLetter}
      </div>

      {!customer?.deleted_at && (
        <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, color = "slate", disabled }) {
  const palette = {
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95 disabled:opacity-40 ${palette[color]}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function CustomerDetailPanel({ data, loading, onClose, onEdit, onDelete, onRestore }) {
  const transactions = data?.transactions || [];

  const totalIn = useMemo(
    () =>
      transactions
        .filter((t) => ["receive", "deposit"].includes(t.type))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions]
  );

  const totalOut = useMemo(
    () =>
      transactions
        .filter((t) => ["send", "withdraw", "withdrawal"].includes(t.type))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions]
  );

  if (loading && !data) {
    return (
      <div className="ep-card-static min-w-0 overflow-hidden p-6">
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ تحميل التفاصيل...
        </div>
      </div>
    );
  }

  if (!data?.customer) return null;

  const customer = data.customer;
  const typeMeta = getTypeMeta(customer.type);

  return (
    <ScrollReveal>
      <div className="ep-card-static min-w-0 overflow-hidden">
        <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1.1fr_1fr_1.2fr]">
          <section className="order-3 xl:order-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">{transactions.length} حركة</span>
              <h4 className="text-sm font-black text-slate-900">آخر النشاطات</h4>
            </div>

            {transactions.length === 0 ? (
              <div className="flex min-w-0 overflow-hidden min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                <ArrowRightLeft className="mb-2 h-6 w-6 text-slate-400" />
                <p className="text-xs font-black text-slate-700">لا توجد معاملات</p>
                <p className="mt-1 text-[10px] text-slate-400">لم يتم تسجيل حركات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 6).map((transaction) => {
                  const type = getTransactionTypeMeta(transaction.type);
                  const sign = getAmountSign(transaction.type);

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5"
                    >
                      <span
                        dir="ltr"
                        className={sign === "-" ? "text-xs font-black text-rose-600" : "text-xs font-black text-emerald-600"}
                      >
                        {sign}
                        {formatMoney(transaction.amount)} {transaction.currency_code || "USD"}
                      </span>

                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{type.label}</p>
                        <p className="text-[10px] text-slate-400">{formatRelative(transaction.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="order-2 xl:order-2">
            <h4 className="mb-3 text-sm font-black text-slate-900">تفاصيل الحساب</h4>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="عدد المعاملات" value={transactions.length} icon={ArrowRightLeft} color="violet" />
              <MiniStat label="إجمالي السحوبات" value={formatMoney(totalOut)} icon={ArrowUpRight} color="rose" />
              <MiniStat label="إجمالي الإيداعات" value={formatMoney(totalIn)} icon={ArrowDownLeft} color="emerald" />
              <MiniStat label="الرصيد الحالي" value={`${formatMoney(data.balance || 0)} USD`} icon={Wallet} color="teal" />
            </div>
          </section>

          <section className="order-1 xl:order-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {!customer.deleted_at ? (
                  <>
                    <IconBtn icon={Edit3} onClick={() => onEdit(customer)} />
                    <IconBtn icon={Trash2} onClick={() => onDelete(customer)} color="rose" />
                  </>
                ) : (
                  <IconBtn icon={RotateCcw} onClick={() => onRestore(customer)} color="emerald" />
                )}

                <IconBtn icon={X} onClick={onClose} />
              </div>

              <h4 className="text-sm font-black text-slate-900">بيانات الحساب</h4>
            </div>

            <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-5 text-right" dir="rtl">
                <DefaultAvatar customer={customer} size="lg" />

                <div className="min-w-0 flex-1 text-right">
                  <p className="text-xl font-black text-slate-900">{customer.name}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge color={typeMeta.color}>{typeMeta.label}</Badge>

                    {customer.deleted_at ? (
                      <Badge color="rose" dot>
                        محذوف
                      </Badge>
                    ) : customer.is_active === false ? (
                      <Badge color="amber" dot>
                        موقوف
                      </Badge>
                    ) : (
                      <Badge color="emerald" dot>
                        نشط
                      </Badge>
                    )}
                  </div>

                  <p className="mt-3 font-mono text-[12px] text-slate-500" dir="ltr">
                    {customer.customer_code || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ProfileTile label="التصنيف" value={typeMeta.label} icon={typeMeta.icon} />
              <ProfileTile label="تاريخ التسجيل" value={formatDate(customer.created_at)} icon={CalendarDays} />
              <ProfileTile label="كود العميل" value={customer.customer_code || `#${customer.id}`} icon={MoreHorizontal} />
            </div>
          </section>
        </div>
      </div>
    </ScrollReveal>
  );
}

function MiniStat({ label, value, icon: Icon, color = "teal" }) {
  const palette = {
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-right">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${palette[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ProfileTile({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
      <div className="text-right">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xs font-black text-slate-900">{value || "—"}</p>
      </div>

      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="ep-skeleton h-14" />
      ))}
    </div>
  );
}

function CustomerForm({ initial, onSubmit, loading, onCancel, errors = {}, onClearError }) {
  const [form, setForm] = useState({
    customer_code: initial?.customer_code || "",
    name: initial?.name || "",
    type: initial?.type || "customer",
    balance_usd: initial?.balance_usd || "",
    note: initial?.note || "",
    is_active: initial?.is_active !== false,
  });

  const [localErrors, setLocalErrors] = useState({});

  const fieldErrors = {
    ...errors,
    ...localErrors,
  };

  function clearFieldError(key) {
    setLocalErrors((prev) => ({ ...prev, [key]: "" }));
    onClearError?.(key);
  }

  function validateForm() {
    const nextErrors = {};

    if (!String(form.name || "").trim()) {
      nextErrors.name = "الرجاء إدخال اسم العميل";
    }

    if (!String(form.customer_code || "").trim()) {
      nextErrors.customer_code = "الرجاء إدخال كود العميل";
    }

    if (!form.type) {
      nextErrors.type = "الرجاء اختيار التصنيف";
    }

    if (form.balance_usd !== "" && Number.isNaN(Number(form.balance_usd))) {
      nextErrors.balance_usd = "الرصيد الابتدائي يجب أن يكون رقمًا صحيحًا";
    }

    if (form.balance_usd !== "" && Number(form.balance_usd) < 0) {
      nextErrors.balance_usd = "الرصيد الابتدائي لا يمكن أن يكون أقل من صفر";
    }

    setLocalErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      customer_code: form.customer_code.trim(),
      name: form.name.trim(),
      type: form.type,
      note: form.note.trim(),
     category: form.type === "supplier" ? "company" : "regular",
      balance_usd: form.balance_usd === "" ? 0 : Number(form.balance_usd),
      is_active: form.is_active,
    };

    if (!payload.note) delete payload.note;

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم" error={fieldErrors.name}>
          <input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              clearFieldError("name");
            }}
            className={[
              "ep-input",
              fieldErrors.name ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "",
            ].join(" ")}
            placeholder="اسم العميل"
            disabled={loading}
          />
        </Field>

        <Field label="كود العميل" error={fieldErrors.customer_code}>
          <input
            value={form.customer_code}
            onChange={(e) => {
              setForm({ ...form, customer_code: e.target.value });
              clearFieldError("customer_code");
            }}
            className={[
              "ep-input",
              fieldErrors.customer_code ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "",
            ].join(" ")}
            placeholder="335"
            dir="ltr"
            disabled={loading}
          />
        </Field>

        <Field label="التصنيف" error={fieldErrors.type || fieldErrors.category}>
          <select
            value={form.type}
            onChange={(e) => {
              setForm({ ...form, type: e.target.value });
              clearFieldError("type");
              clearFieldError("category");
            }}
            className={[
              "ep-input appearance-none",
              fieldErrors.type || fieldErrors.category
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10"
                : "",
            ].join(" ")}
            disabled={loading}
          >
            <option value="customer">عميل</option>
            <option value="supplier">مورد</option>
          </select>
        </Field>

        <Field label="الرصيد الابتدائي" error={fieldErrors.balance_usd}>
          <input
            type="number"
            step="0.01"
            value={form.balance_usd}
            onChange={(e) => {
              setForm({ ...form, balance_usd: e.target.value });
              clearFieldError("balance_usd");
            }}
            className={[
              "ep-input",
              fieldErrors.balance_usd ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "",
            ].join(" ")}
            placeholder="0.00"
            dir="ltr"
            disabled={loading}
          />
        </Field>

        <Field label="الحالة" error={fieldErrors.is_active}>
          <select
            value={form.is_active ? "1" : "0"}
            onChange={(e) => {
              setForm({ ...form, is_active: e.target.value === "1" });
              clearFieldError("is_active");
            }}
            className={[
              "ep-input appearance-none",
              fieldErrors.is_active ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "",
            ].join(" ")}
            disabled={loading}
          >
            <option value="1">نشط</option>
            <option value="0">موقوف</option>
          </select>
        </Field>
      </div>

      <Field label="ملاحظات" error={fieldErrors.note}>
        <textarea
          value={form.note}
          onChange={(e) => {
            setForm({ ...form, note: e.target.value });
            clearFieldError("note");
          }}
          className={[
            "ep-input min-h-24 resize-none py-3",
            fieldErrors.note ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : "",
          ].join(" ")}
          placeholder="ملاحظات اختيارية..."
          disabled={loading}
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">
          إلغاء
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
          style={{ background: "hsl(179, 87%, 28%)" }}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {initial ? "حفظ التعديلات" : "حفظ العميل"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, error }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>

      {children}

      {error && (
        <p className="mt-1.5 text-right text-[11px] font-black text-rose-600">
          {error}
        </p>
      )}
    </label>
  );
}

export default CustomersPage;