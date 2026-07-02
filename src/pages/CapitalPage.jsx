import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  Minus,
  ArrowRightLeft,
  RefreshCw,
  Loader2,
  DollarSign,
  PiggyBank,
  Building2,
  CalendarDays,
  FileText,
  Search,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import capitalService from "../services/capital";
import boxesService from "../services/boxes";
import { extractApiError, formatDate, formatMoney, unwrapList } from "../shared/helpers";

const PER_PAGE = 20;

const BOX_TYPE_OPTIONS = [
  { value: "turkish", label: "صناديق تركيا" },
  { value: "local_bank_wallet", label: "البنوك والمحافظ الرقمية" },
  { value: "usdt_wallet", label: "المحافظ الإلكترونية" },
];

const INITIAL_FORM = {
  amount: "",
  currency: "USD",
  exchange_rate: "1.0000",
  transaction_date: new Date().toISOString().split("T")[0],
  notes: "",
  box_type: "turkish",
  box_id: "",
};

const ACTIONS = {
  deposit: {
    title: "إيداع رأس مال",
    subtitle: "إضافة رصيد إلى رأس مال الشركة",
    icon: Plus,
  },
  withdraw: {
    title: "سحب رأس مال",
    subtitle: "سحب مبلغ من رأس المال الحر",
    icon: Minus,
  },
  transfer: {
    title: "تحويل رأس مال إلى صندوق",
    subtitle: "نقل مبلغ من رأس المال الحر إلى صندوق تشغيلي",
    icon: ArrowRightLeft,
  },
};

function unwrapPayload(res) {
  const data = res?.data || res || {};
  return data?.data || data || {};
}

function normalizeList(res) {
  const normalized = unwrapList(res);

  if (Array.isArray(normalized)) return normalized;
  if (Array.isArray(normalized?.items)) return normalized.items;
  if (Array.isArray(normalized?.data)) return normalized.data;
  if (Array.isArray(res?.data)) return res.data;

  return [];
}

function normalizeTransactions(res) {
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

function getBoxTypeLabel(type) {
  return BOX_TYPE_OPTIONS.find((item) => item.value === type)?.label || "كل الصناديق";
}

function getTransactionTypeLabel(type) {
  const labels = {
    deposit: "إيداع",
    withdraw: "سحب",
    transfer_to_box: "تحويل إلى صندوق",
    transfer: "تحويل",
    expense: "مصروف",
  };

  return labels[type] || type || "—";
}

function getTransactionBadgeColor(type) {
  if (type === "deposit") return "emerald";
  if (type === "withdraw") return "rose";
  if (type === "transfer_to_box" || type === "transfer") return "teal";
  if (type === "expense") return "amber";
  return "slate";
}

function getBoxLabel(box) {
  if (!box) return "—";

  const typeLabel = {
    turkish: "صندوق تركيا",
    local_bank_wallet: "بنك/محفظة",
    usdt_wallet: "محفظة إلكترونية",
  }[box.type] || box.type || "صندوق";

  return `${box.name || `#${box.id}`} - ${typeLabel}`;
}

function getAmountClass(value) {
  const amount = Number(value || 0);

  if (amount > 0) return "text-emerald-700";
  if (amount < 0) return "text-rose-700";

  return "text-slate-700";
}

function getTransferAmountUsd(form) {
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

export default function CapitalPage() {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [boxes, setBoxes] = useState([]);

  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [actionType, setActionType] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const activeAction = actionType ? ACTIONS[actionType] : null;

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return transactions;

    return transactions.filter((item) => {
      const boxName = item?.box?.name || "";

      return (
        String(item.id || "").includes(term) ||
        String(item.type || "").toLowerCase().includes(term) ||
        String(item.notes || "").toLowerCase().includes(term) ||
        boxName.toLowerCase().includes(term)
      );
    });
  }, [transactions, search]);

  const loadBoxes = useCallback(async () => {
    try {
      const res = await boxesService.list({ per_page: 100 });
      setBoxes(normalizeList(res));
    } catch {
      setBoxes([]);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setError(null);

    try {
      const res = await capitalService.dashboard();
      setSummary(unwrapPayload(res));
    } catch (err) {
      setError(err);
      setSummary(null);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);

    try {
      const res = await capitalService.transactions({
        page,
        per_page: PER_PAGE,
      });

      const normalized = normalizeTransactions(res);

      setTransactions(normalized.items);
      setMeta({
        total: Number(normalized.meta?.total ?? normalized.items.length),
        current_page: Number(normalized.meta?.current_page ?? page),
        last_page: Number(normalized.meta?.last_page ?? 1),
        per_page: Number(normalized.meta?.per_page ?? PER_PAGE),
      });
    } catch {
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [page]);

  async function loadAll() {
    setLoading(true);

    await Promise.all([loadSummary(), loadTransactions(), loadBoxes()]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function openAction(type) {
    setActionType(type);
    setForm(INITIAL_FORM);
    setFormErrors({});
  }

  function closeAction() {
    if (busy) return;

    setActionType(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.amount || Number(form.amount) <= 0) {
      nextErrors.amount = "أدخل مبلغ صحيح";
    }

    if (!form.transaction_date) {
      nextErrors.transaction_date = "اختر تاريخ الحركة";
    }

    if (actionType === "transfer" && !form.box_type) {
      nextErrors.box_type = "اختر نوع الصندوق";
    }

    if (actionType === "transfer" && !form.box_id) {
      nextErrors.box_id = "اختر الصندوق";
    }

    if (actionType === "transfer" && !form.currency) {
      nextErrors.currency = "حدد عملة الصندوق";
    }

    if (actionType === "transfer" && (!form.exchange_rate || Number(form.exchange_rate) <= 0)) {
      nextErrors.exchange_rate = "أدخل سعر صرف صحيح";
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function submitAction(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setBusy(true);
    setFormErrors({});

    const amountUsd = actionType === "transfer" ? getTransferAmountUsd(form) : Number(form.amount);

    const transferInfo =
      actionType === "transfer"
        ? [
            `TRANSFER_ORIGINAL: ${form.amount} ${form.currency}`,
            `TRANSFER_RATE: ${form.exchange_rate}`,
            `BOX_TYPE: ${form.box_type}`,
          ].join(" | ")
        : null;

    const payload = {
      amount: Number(amountUsd.toFixed(2)),
      transaction_date: form.transaction_date,
      notes: [form.notes?.trim() || null, transferInfo].filter(Boolean).join(" | ") || null,
    };

    if (actionType === "transfer") {
      payload.box_id = Number(form.box_id);
    }

    try {
      if (actionType === "deposit") {
        await capitalService.deposit(payload);
        toast.success("تم إيداع رأس المال");
      }

      if (actionType === "withdraw") {
        await capitalService.withdraw(payload);
        toast.success("تم سحب رأس المال");
      }

      if (actionType === "transfer") {
        await capitalService.transferToBox(payload);
        toast.success("تم تحويل رأس المال إلى الصندوق");
      }

      closeAction();
      await loadAll();
    } catch (err) {
      setFormErrors(mapValidationErrors(err));
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const capitalBalance = Number(summary?.capital_balance || summary?.account?.balance_usd || 0);
  const freeCapital = Number(summary?.free_capital || summary?.account?.free_balance_usd || 0);
  const boxesTotal = Number(summary?.boxes_total_balance || 0);
  const monthlyExpenses = Number(summary?.monthly_expenses || 0);
  const yearlyExpenses = Number(summary?.yearly_expenses || 0);

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
              <PiggyBank className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <h1 className="break-words text-xl font-black leading-8 text-slate-950 sm:text-2xl">
                رأس المال
              </h1>
              <p className="mt-1 max-w-full break-words text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                إدارة رأس مال الشركة، الإيداعات، السحوبات، والتحويل إلى الصناديق
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:items-center xl:justify-end">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading}
              className="ep-btn ep-btn-ghost h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span className="truncate">تحديث</span>
            </button>

            <button
              type="button"
              onClick={() => openAction("deposit")}
              className="ep-btn ep-btn-primary h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">إيداع</span>
            </button>

            <button
              type="button"
              onClick={() => openAction("withdraw")}
              className="ep-btn h-11 min-w-0 justify-center border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-700 hover:bg-rose-100 sm:px-4 sm:text-sm"
            >
              <Minus className="h-4 w-4 shrink-0" />
              <span className="truncate">سحب</span>
            </button>

            <button
              type="button"
              onClick={() => openAction("transfer")}
              className="ep-btn h-11 min-w-0 justify-center border border-teal-200 bg-teal-50 px-3 text-xs font-black text-teal-700 hover:bg-teal-100 sm:px-4 sm:text-sm"
            >
              <ArrowRightLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">تحويل لصندوق</span>
            </button>
          </div>
        </div>
      </section>

      {error && !loading ? (
        <ErrorState
          title="تعذّر تحميل رأس المال"
          description={extractApiError(error)}
          onRetry={loadAll}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي رأس المال"
              value={capitalBalance}
              prefix="$"
              icon={DollarSign}
              color="emerald"
              decimals={2}
            />

            <StatCard
              title="رأس المال الحر"
              value={freeCapital}
              prefix="$"
              icon={Wallet}
              color="teal"
              decimals={2}
            />

            <StatCard
              title="أرصدة الصناديق"
              value={boxesTotal}
              prefix="$"
              icon={Building2}
              color="violet"
              decimals={2}
            />

            <StatCard
              title="مصروفات السنة"
              value={yearlyExpenses}
              prefix="$"
              icon={CalendarDays}
              color="amber"
              decimals={2}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge color="teal">معادلة رأس المال</Badge>

                <div className="min-w-0 text-right">
                  <h3 className="truncate text-base font-black text-slate-900">الوضع المالي الحالي</h3>
                  <p className="text-xs leading-6 text-slate-500">
                    رأس المال الكلي = رأس المال الحر + الأرصدة المحولة للصناديق
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoBox label="رأس المال الكلي" value={capitalBalance} color="emerald" />
                <InfoBox label="رأس المال الحر" value={freeCapital} color="teal" />
                <InfoBox label="الصناديق" value={boxesTotal} color="violet" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="text-right">
                <h3 className="text-base font-black text-slate-900">مصروفات الشهر</h3>
                <p className="text-xs leading-6 text-slate-500">المصروفات المسجلة خلال الشهر الحالي</p>
              </div>

              <p dir="ltr" className="mt-6 truncate font-mono text-3xl font-black text-rose-700">
                ${formatMoney(monthlyExpenses)}
              </p>
            </div>
          </section>

          <section className="ep-card-static min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <Badge color="teal">{filteredTransactions.length} حركة</Badge>

              <div className="min-w-0 text-right">
                <h3 className="truncate text-base font-black text-slate-900">سجل حركات رأس المال</h3>
                <p className="text-xs text-slate-500">كل الإيداعات والسحوبات والتحويلات</p>
              </div>
            </div>

            <div className="border-b border-slate-100 p-4">
              <label className="block max-w-xl">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">بحث</span>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث بالحركة أو الملاحظات أو الصندوق..."
                    className="ep-input pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>

            {transactionsLoading ? (
              <div className="space-y-2 p-4 sm:p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ep-skeleton h-14" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-6 sm:p-8">
                <EmptyState
                  icon={Wallet}
                  title="لا توجد حركات رأس مال"
                  description="ابدأ بإيداع رأس مال حتى تظهر الحركات هنا"
                  action={
                    <button type="button" onClick={() => openAction("deposit")} className="ep-btn ep-btn-primary">
                      <Plus className="h-4 w-4" />
                      إيداع رأس مال
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                <div className="max-w-full overflow-x-auto">
                  <table className="ep-table min-w-[900px]">
                    <thead>
                      <tr>
                        <th>الحركة</th>
                        <th>المبلغ</th>
                        <th>قبل</th>
                        <th>بعد</th>
                        <th>الصندوق</th>
                        <th>التاريخ</th>
                        <th>ملاحظات</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTransactions.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <Badge color={getTransactionBadgeColor(item.type)}>
                              {getTransactionTypeLabel(item.type)}
                            </Badge>
                          </td>

                          <td dir="ltr" className={`font-mono font-black ${getAmountClass(item.amount)}`}>
                            {formatMoney(Number(item.amount || 0))}
                          </td>

                          <td dir="ltr" className="font-mono font-bold text-slate-700">
                            {formatMoney(Number(item.balance_before || 0))}
                          </td>

                          <td dir="ltr" className="font-mono font-bold text-slate-700">
                            {formatMoney(Number(item.balance_after || 0))}
                          </td>

                          <td>{item.box ? getBoxLabel(item.box) : "—"}</td>

                          <td>{item.transaction_date ? formatDate(item.transaction_date) : "—"}</td>

                          <td className="max-w-[260px] truncate">{item.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100">
                  <Pagination
                    current={meta.current_page || page}
                    last={meta.last_page || 1}
                    total={meta.total || filteredTransactions.length}
                    perPage={meta.per_page || PER_PAGE}
                    onChange={setPage}
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}

      <Modal
        open={!!actionType}
        onClose={closeAction}
        title={activeAction?.title || ""}
        subtitle={activeAction?.subtitle || ""}
        icon={activeAction?.icon || Wallet}
        size="md"
      >
        <CapitalForm
          actionType={actionType}
          form={form}
          setForm={setForm}
          boxes={boxes}
          errors={formErrors}
          loading={busy}
          onSubmit={submitAction}
          onCancel={closeAction}
        />
      </Modal>
    </div>
  );
}

function InfoBox({ label, value, color }) {
  const colorMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  };

  return (
    <div className={`rounded-2xl border p-4 text-right ${colorMap[color] || colorMap.teal}`}>
      <p className="text-xs font-black opacity-75">{label}</p>
      <p dir="ltr" className="mt-2 truncate font-mono text-2xl font-black">
        ${formatMoney(Number(value || 0))}
      </p>
    </div>
  );
}

function CapitalForm({ actionType, form, setForm, boxes, errors, loading, onSubmit, onCancel }) {
  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const filteredBoxes =
    actionType === "transfer"
      ? boxes.filter((box) => !form.box_type || box.type === form.box_type)
      : boxes;

  const selectedBox = boxes.find((box) => String(box.id) === String(form.box_id));
  const transferAmountUsd = getTransferAmountUsd(form);

  function handleBoxTypeChange(value) {
    setForm((prev) => ({
      ...prev,
      box_type: value,
      box_id: "",
      currency: "USD",
      exchange_rate: "1.0000",
    }));
  }

  function handleBoxChange(value) {
    const box = boxes.find((item) => String(item.id) === String(value));
    const currency = box?.currency || "USD";

    setForm((prev) => ({
      ...prev,
      box_id: value,
      currency,
      exchange_rate: currency === "USD" ? "1.0000" : prev.exchange_rate || "1.0000",
    }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {actionType === "transfer" && (
        <>
          <Field label="نوع الصندوق" required error={errors.box_type}>
            <select
              value={form.box_type}
              onChange={(e) => handleBoxTypeChange(e.target.value)}
              className="ep-input appearance-none"
            >
              {BOX_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الصندوق" required error={errors.box_id}>
            <select
              value={form.box_id}
              onChange={(e) => handleBoxChange(e.target.value)}
              className="ep-input appearance-none"
            >
              <option value="">اختر من {getBoxTypeLabel(form.box_type)}...</option>

              {filteredBoxes.map((box) => (
                <option key={box.id} value={box.id}>
                  {box.name || `#${box.id}`} - {box.currency || "USD"}
                </option>
              ))}
            </select>

            {selectedBox && (
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                الرصيد الحالي: {selectedBox.currency || "USD"}{" "}
                {formatMoney(Number(selectedBox.current_balance || 0))}
              </p>
            )}
          </Field>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label={actionType === "transfer" ? `المبلغ (${form.currency})` : "المبلغ بالدولار"}
          required
          error={errors.amount}
        >
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

        {actionType === "transfer" ? (
          <Field label="عملة الصندوق" required error={errors.currency}>
            <input
              value={form.currency}
              readOnly
              className="ep-input bg-slate-50 font-bold text-slate-500"
            />
          </Field>
        ) : (
          <Field label="تاريخ الحركة" required error={errors.transaction_date}>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => update("transaction_date", e.target.value)}
              className="ep-input"
            />
          </Field>
        )}

        {actionType === "transfer" && (
          <>
            <Field label="سعر الصرف مقابل الدولار" required error={errors.exchange_rate}>
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

            <Field label="تاريخ الحركة" required error={errors.transaction_date}>
              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) => update("transaction_date", e.target.value)}
                className="ep-input"
              />
            </Field>
          </>
        )}
      </div>

      {actionType === "transfer" && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DollarSign className="h-5 w-5 shrink-0 text-teal-700" />

            <div className="min-w-0 text-right">
              <p className="text-xs font-black text-teal-800">
                القيمة التي ستخصم من رأس المال الحر
              </p>
              <p dir="ltr" className="mt-1 truncate font-mono text-lg font-black text-teal-900">
                ${formatMoney(transferAmountUsd)}
              </p>
            </div>
          </div>
        </div>
      )}

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

      {errors.amount && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {errors.amount}
        </div>
      )}

      {errors.box_id && String(errors.box_id).includes("غير موجودة") && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          الصندوق المختار غير موجود. اختر صندوقاً من القائمة.
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-start">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost h-11 justify-center">
          إلغاء
        </button>

        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary h-11 justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          حفظ
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>

      {children}

      {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
    </label>
  );
}