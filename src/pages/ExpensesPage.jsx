import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReceiptText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Edit3,
  Trash2,
  Loader2,
  CalendarDays,
  DollarSign,
  Tags,
  FileText,
  X,
  Coins,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import expensesService from "../services/expenses";
import currenciesService from "../services/currencies";
import { extractApiError, formatDate, formatMoney, unwrapList } from "../shared/helpers";

const PER_PAGE = 20;

const CATEGORY_OPTIONS = [
  { value: "", label: "كل التصنيفات" },
  { value: "vehicle", label: "مركبات" },
  { value: "rent", label: "إيجار" },
  { value: "salary", label: "رواتب" },
  { value: "utilities", label: "خدمات" },
  { value: "office", label: "مكتبيات" },
  { value: "internet", label: "إنترنت واتصالات" },
  { value: "taxes", label: "ضرائب ورسوم" },
  { value: "other", label: "أخرى" },
];

function today() {
  return new Date().toISOString().split("T")[0];
}

const INITIAL_FORM = {
  title: "",
  category: "other",
  amount: "",
  currency: "USD",
  exchange_rate: "1.0000",
  expense_date: today(),
  notes: "",
};

function normalizeResponse(res) {
  const normalized = unwrapList(res);

  if (Array.isArray(normalized)) {
    return {
      items: normalized,
      meta: {
        total: normalized.length,
        current_page: 1,
        last_page: 1,
        per_page: PER_PAGE,
      },
    };
  }

  return {
    items: normalized.items || normalized.data || res?.data || [],
    meta: normalized.meta || res?.meta || {
      total: normalized.items?.length || 0,
      current_page: 1,
      last_page: 1,
      per_page: PER_PAGE,
    },
  };
}

function normalizeCurrencies(res) {
  const normalized = unwrapList(res);

  if (Array.isArray(normalized)) return normalized;
  if (Array.isArray(normalized?.items)) return normalized.items;
  if (Array.isArray(normalized?.data)) return normalized.data;
  if (Array.isArray(res?.data)) return res.data;

  return [];
}

function getCategoryLabel(value) {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value || "—";
}

function getExpenseAmount(item) {
  return Number(item?.amount || item?.total || 0) || 0;
}

function getExpenseDate(item) {
  return item?.expense_date || item?.date || item?.created_at || null;
}

function getAmountInUsd(form) {
  const amount = Number(form.amount || 0);
  const rate = Number(form.exchange_rate || 1);

  if (!amount || amount <= 0) return 0;
  if (!rate || rate <= 0) return amount;

  return amount / rate;
}

function mapValidationErrors(err) {
  const apiErrors = err?.response?.data?.errors;

  if (!apiErrors || typeof apiErrors !== "object") return {};

  const mapped = {};

  Object.keys(apiErrors).forEach((key) => {
    mapped[key] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
  });

  return mapped;
}

export default function ExpensesPage() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [currencies, setCurrencies] = useState([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      return (
        item?.title?.toLowerCase?.().includes(term) ||
        item?.notes?.toLowerCase?.().includes(term) ||
        item?.category?.toLowerCase?.().includes(term)
      );
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const totalAmount = filteredItems.reduce((sum, item) => sum + getExpenseAmount(item), 0);
    const categoriesCount = new Set(filteredItems.map((item) => item.category || "other")).size;
    const average = filteredItems.length ? totalAmount / filteredItems.length : 0;

    return {
      totalAmount,
      count: filteredItems.length,
      categoriesCount,
      average,
    };
  }, [filteredItems]);

  const loadCurrencies = useCallback(async () => {
    try {
      const res = await currenciesService.list({ is_active: true });
      const list = normalizeCurrencies(res);

      setCurrencies(list);
    } catch {
      setCurrencies([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await expensesService.list({
        page,
        per_page: PER_PAGE,
        ...(category && { category }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const normalized = normalizeResponse(res);

      setItems(normalized.items);
      setMeta({
        total: Number(normalized.meta?.total ?? normalized.items.length),
        current_page: Number(normalized.meta?.current_page ?? page),
        last_page: Number(normalized.meta?.last_page ?? 1),
        per_page: Number(normalized.meta?.per_page ?? PER_PAGE),
      });
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, dateFrom, dateTo]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [category, dateFrom, dateTo]);

  function openCreate() {
    setEditing(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      title: item.title || "",
      category: item.category || "other",
      amount: item.amount ?? "",
      currency: "USD",
      exchange_rate: "1.0000",
      expense_date: item.expense_date || today(),
      notes: item.notes || "",
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "أدخل عنوان المصروف";
    if (!form.category) nextErrors.category = "اختر التصنيف";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "أدخل مبلغ صحيح";
    if (!form.currency) nextErrors.currency = "اختر عملة المصروف";

    if (!form.exchange_rate || Number(form.exchange_rate) <= 0) {
      nextErrors.exchange_rate = "أدخل سعر صرف صحيح";
    }

    if (!form.expense_date) nextErrors.expense_date = "اختر تاريخ المصروف";

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function submitForm(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setBusy(true);
    setFormErrors({});

    const amountUsd = getAmountInUsd(form);

    const originalInfo =
      form.currency !== "USD"
        ? `ORIGINAL_EXPENSE: ${form.amount} ${form.currency} | EXPENSE_RATE: ${form.exchange_rate}`
        : null;

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount: Number(amountUsd.toFixed(2)),
      expense_date: form.expense_date,
      notes: [form.notes?.trim() || null, originalInfo].filter(Boolean).join(" | ") || null,
    };

    try {
      if (editing) {
        await expensesService.update(editing.id, payload);
        toast.success("تم تحديث المصروف بنجاح");
      } else {
        await expensesService.create(payload);
        toast.success("تم إضافة المصروف بنجاح");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      await load();
    } catch (err) {
      const validation = mapValidationErrors(err);
      setFormErrors(validation);
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteExpense() {
    if (!confirmDelete) return;

    setBusy(true);

    try {
      await expensesService.remove(confirmDelete.id);
      toast.success("تم حذف المصروف بنجاح");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
              <ReceiptText className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <h1 className="break-words text-xl font-black leading-8 text-slate-950 sm:text-2xl">
                المصروفات
              </h1>
              <p className="mt-1 max-w-full break-words text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                إدارة مصروفات المالك والشركة ومتابعة أثرها على رأس المال
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="ep-btn ep-btn-ghost h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span className="truncate">تحديث</span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="ep-btn ep-btn-primary h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">إضافة مصروف</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي المصروفات"
          value={stats.totalAmount}
          prefix="$"
          icon={DollarSign}
          color="rose"
          decimals={2}
        />

        <StatCard
          title="عدد المصروفات"
          value={stats.count}
          icon={ReceiptText}
          color="teal"
          note="مصروف"
        />

        <StatCard
          title="عدد التصنيفات"
          value={stats.categoriesCount}
          icon={Tags}
          color="violet"
          note="تصنيف"
        />

        <StatCard
          title="متوسط المصروف"
          value={stats.average}
          prefix="$"
          icon={CalendarDays}
          color="amber"
          decimals={2}
        />
      </section>

      <section className="ep-card-static p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Filter className="h-5 w-5 shrink-0 text-slate-400" />

          <div className="min-w-0 text-right">
            <h3 className="truncate text-base font-black text-slate-900">فلترة المصروفات</h3>
            <p className="text-xs leading-6 text-slate-500">ابحث حسب العنوان أو التصنيف أو الفترة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="block sm:col-span-2 xl:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">بحث</span>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مصروف..."
                className="ep-input pr-10"
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">التصنيف</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ep-input appearance-none"
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">من تاريخ</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ep-input"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">إلى تاريخ</span>
            <input
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ep-input"
            />
          </label>
        </div>

        {(search || category || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            مسح الفلاتر
          </button>
        )}
      </section>

      {error && !loading ? (
        <ErrorState
          title="تعذّر تحميل المصروفات"
          description={extractApiError(error)}
          onRetry={load}
        />
      ) : (
        <section className="ep-card-static min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <Badge color="rose">{filteredItems.length} مصروف</Badge>

            <div className="min-w-0 text-right">
              <h3 className="truncate text-base font-black text-slate-900">سجل المصروفات</h3>
              <p className="text-xs text-slate-500">كل المصروفات المسجلة في النظام</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-4 sm:p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="ep-skeleton h-14" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 sm:p-8">
              <EmptyState
                icon={ReceiptText}
                title="لا توجد مصروفات"
                description="لم يتم تسجيل أي مصروفات حتى الآن"
                action={
                  <button type="button" onClick={openCreate} className="ep-btn ep-btn-primary">
                    <Plus className="h-4 w-4" />
                    إضافة أول مصروف
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <div className="max-w-full overflow-x-auto">
                <table className="ep-table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>العنوان</th>
                      <th>التصنيف</th>
                      <th>المبلغ</th>
                      <th>تاريخ المصروف</th>
                      <th>ملاحظات</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <div className="min-w-0 text-right">
                              <p className="truncate font-black text-slate-900">{item.title || "—"}</p>
                              <p className="text-[11px] text-slate-400">#{item.id}</p>
                            </div>

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
                              <ReceiptText className="h-5 w-5" />
                            </div>
                          </div>
                        </td>

                        <td>
                          <Badge color="violet">{getCategoryLabel(item.category)}</Badge>
                        </td>

                        <td dir="ltr" className="font-mono font-black text-rose-700">
                          {formatMoney(getExpenseAmount(item))}
                        </td>

                        <td>{getExpenseDate(item) ? formatDate(getExpenseDate(item)) : "—"}</td>

                        <td className="max-w-[220px] truncate">{item.notes || "—"}</td>

                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDelete(item)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100">
                <Pagination
                  current={meta.current_page || page}
                  last={meta.last_page || 1}
                  total={meta.total || filteredItems.length}
                  perPage={meta.per_page || PER_PAGE}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </section>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          if (!busy) {
            setFormOpen(false);
            setEditing(null);
            setForm(INITIAL_FORM);
            setFormErrors({});
          }
        }}
        title={editing ? "تعديل المصروف" : "إضافة مصروف جديد"}
        subtitle={editing ? editing.title : "أدخل بيانات المصروف"}
        icon={ReceiptText}
        size="md"
      >
        <ExpenseForm
          form={form}
          setForm={setForm}
          errors={formErrors}
          loading={busy}
          currencies={currencies}
          amountUsd={getAmountInUsd(form)}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
            setForm(INITIAL_FORM);
            setFormErrors({});
          }}
          onSubmit={submitForm}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => !busy && setConfirmDelete(null)}
        onConfirm={deleteExpense}
        title="حذف المصروف"
        description={`هل تريد حذف المصروف "${confirmDelete?.title || ""}"؟`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function ExpenseForm({
  form,
  setForm,
  errors,
  loading,
  currencies,
  amountUsd,
  onCancel,
  onSubmit,
}) {
  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleCurrencyChange(code) {
    const selectedCurrency = currencies.find((item) => item.code === code);

    setForm((prev) => ({
      ...prev,
      currency: code,
      exchange_rate: String(selectedCurrency?.rate_to_usd || selectedCurrency?.exchange_rate || 1),
    }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="عنوان المصروف" required error={errors.title}>
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="مثال: أكل، صيانة، إيجار..."
          className="ep-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="التصنيف" required error={errors.category}>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="ep-input appearance-none"
          >
            {CATEGORY_OPTIONS.filter((item) => item.value).map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="عملة المصروف" required error={errors.currency}>
          <select
            value={form.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="ep-input appearance-none"
          >
            {currencies.length === 0 && <option value="USD">USD - الدولار الأمريكي</option>}

            {currencies.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.name_ar || item.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`المبلغ (${form.currency})`} required error={errors.amount}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className="ep-input"
          />
        </Field>

        <Field label="سعر الصرف" required error={errors.exchange_rate}>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={form.exchange_rate}
            onChange={(e) => update("exchange_rate", e.target.value)}
            placeholder="1.0000"
            inputMode="decimal"
            className="ep-input"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Coins className="h-5 w-5 shrink-0 text-teal-700" />

          <div className="min-w-0 text-right">
            <p className="text-xs font-black text-teal-800">القيمة التي ستخصم من رأس المال</p>
            <p dir="ltr" className="mt-1 truncate font-mono text-lg font-black text-teal-900">
              ${formatMoney(amountUsd)}
            </p>
          </div>
        </div>
      </div>

      <Field label="تاريخ المصروف" required error={errors.expense_date}>
        <input
          type="date"
          value={form.expense_date}
          onChange={(e) => update("expense_date", e.target.value)}
          className="ep-input"
        />
      </Field>

      <Field label="ملاحظات" error={errors.notes}>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="ملاحظات اختيارية..."
          className="ep-input resize-none py-3"
          style={{ height: "auto" }}
        />
      </Field>

      {errors.amount && String(errors.amount).includes("رأس المال") && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          لا يمكن إضافة المصروف قبل توفر رصيد كافٍ في رأس المال الحر.
        </div>
      )}

      <div className="flex items-center justify-start gap-2 pt-2">
        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          حفظ
        </button>

        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">
          إلغاء
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>

      {children}

      {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
    </label>
  );
}