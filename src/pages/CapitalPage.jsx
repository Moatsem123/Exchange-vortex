/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Minus,
  PiggyBank,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import { useToast } from "../shared/Toast";
import { useAuth } from "../context/AuthContext";
import capitalService from "../services/capital";
import { extractApiError, formatDate, formatMoney } from "../shared/helpers";
import { getCapitalAccountTypeLabel, getCapitalMovementMeta } from "../shared/capitalTypes";

const INITIAL_ACCOUNT_FORM = {
  type: "own",
  name: "",
  amount: "",
  currency: "USD",
  transaction_date: new Date().toISOString().split("T")[0],
  reference_number: "",
  notes: "",
};

const INITIAL_MOVEMENT_FORM = {
  type: "top_up",
  amount: "",
  transaction_date: new Date().toISOString().split("T")[0],
  reference_number: "",
  notes: "",
};

function unwrapPayload(res) {
  const data = res?.data || res || {};
  return data?.data || data || {};
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

function money(value, currency = "USD") {
  return `${formatMoney(Number(value || 0))} ${currency || "USD"}`;
}

function accountTypeColor(type) {
  return type === "own" || type === "owner" ? "teal" : "violet";
}

function movementAmountClass(value) {
  return Number(value || 0) < 0 ? "text-rose-700" : "text-emerald-700";
}

function movementSign(value) {
  return Number(value || 0) < 0 ? "" : "+";
}

function userLabel(user) {
  return user?.name || user?.email || "—";
}

function canEditMovement(type) {
  return ["initial_deposit", "top_up", "withdrawal"].includes(type);
}

export default function CapitalPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState(INITIAL_ACCOUNT_FORM);
  const [accountErrors, setAccountErrors] = useState({});

  const [movementAccount, setMovementAccount] = useState(null);
  const [movementForm, setMovementForm] = useState(INITIAL_MOVEMENT_FORM);
  const [movementErrors, setMovementErrors] = useState({});

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  const [editMovement, setEditMovement] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_MOVEMENT_FORM);
  const [editErrors, setEditErrors] = useState({});

  const [pending, setPending] = useState(null);

  const canCreateAccount = hasPermission(["capital.account.create", "capital.movement.create"]);
  const canCreateMovementPermission = hasPermission(["capital.movement.create"]);
  const canUpdateMovementPermission = hasPermission(["capital.movement.update"]);
  const canDeleteMovementPermission = hasPermission(["capital.movement.delete"]);

  const currencies = useMemo(() => {
    const list = [
      ...summaries.map((item) => item.currency),
      ...accounts.map((item) => item.currency),
    ].filter(Boolean);

    return Array.from(new Set(list)).sort();
  }, [accounts, summaries]);

  const activeSummary = useMemo(
    () =>
      summaries.find((item) => item.currency === selectedCurrency) || {
        currency: selectedCurrency,
        own_capital: 0,
        investor_capital: 0,
        total_capital: 0,
      },
    [summaries, selectedCurrency]
  );

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return accounts
      .filter((account) => !selectedCurrency || account.currency === selectedCurrency)
      .filter((account) => {
        if (!term) return true;

        return (
          String(account.name || "").toLowerCase().includes(term) ||
          String(account.type || "").toLowerCase().includes(term) ||
          String(account.currency || "").toLowerCase().includes(term)
        );
      });
  }, [accounts, search, selectedCurrency]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await capitalService.accounts();
      const payload = unwrapPayload(res);
      const nextSummaries = Array.isArray(payload.summaries) ? payload.summaries : [];
      const nextAccounts = Array.isArray(payload.accounts) ? payload.accounts : [];
      const nextCurrencies = Array.from(
        new Set([
          ...nextSummaries.map((item) => item.currency),
          ...nextAccounts.map((item) => item.currency),
        ].filter(Boolean))
      );

      setSummaries(nextSummaries);
      setAccounts(nextAccounts);
      setSelectedCurrency((current) => (nextCurrencies.includes(current) ? current : nextCurrencies[0] || "USD"));
    } catch (err) {
      setError(err);
      setSummaries([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadDetails(account) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetails(null);

    try {
      const res = await capitalService.showAccount(account.id, { currency: account.currency });
      setDetails(unwrapPayload(res));
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setDetailsLoading(false);
    }
  }

  function openAccountModal() {
    setAccountForm({
      ...INITIAL_ACCOUNT_FORM,
      currency: selectedCurrency || "USD",
    });
    setAccountErrors({});
    setAccountModalOpen(true);
  }

  function openMovementModal(account, type = "top_up") {
    setMovementAccount(account);
    setMovementForm({
      ...INITIAL_MOVEMENT_FORM,
      type,
    });
    setMovementErrors({});
  }

  function openEditMovement(movement) {
    setEditMovement(movement);
    setEditForm({
      type: movement.type,
      amount: String(movement.absolute_amount ?? Math.abs(Number(movement.amount || 0))),
      transaction_date: movement.transaction_date || new Date().toISOString().split("T")[0],
      reference_number: movement.reference_number || "",
      notes: movement.notes || movement.statement || "",
    });
    setEditErrors({});
  }

  function validateAccountForm() {
    const errors = {};

    if (!accountForm.type) errors.type = "اختر نوع رأس المال";
    if (accountForm.type === "investor" && !accountForm.name.trim()) errors.name = "اكتب اسم المستثمر أو الشركة";
    if (!accountForm.amount || Number(accountForm.amount) <= 0) errors.amount = "أدخل مبلغ صحيح";
    if (!accountForm.currency.trim()) errors.currency = "أدخل العملة";
    if (!accountForm.transaction_date) errors.transaction_date = "اختر تاريخ الحركة";

    setAccountErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function validateMovementForm(form, setErrors) {
    const errors = {};

    if (!form.type) errors.type = "اختر نوع الحركة";
    if (!form.amount || Number(form.amount) <= 0) errors.amount = "أدخل مبلغ صحيح";
    if (!form.transaction_date) errors.transaction_date = "اختر تاريخ الحركة";

    setErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function submitAccount(e) {
    e.preventDefault();

    if (!validateAccountForm()) return;

    const payload = {
      ...accountForm,
      amount: Number(accountForm.amount),
      name: accountForm.type === "investor" ? accountForm.name.trim() : null,
      notes: accountForm.notes.trim() || null,
      statement: accountForm.notes.trim() || null,
      reference_number: accountForm.reference_number.trim() || null,
    };

    const target = accountForm.type === "investor" ? accountForm.name.trim() : "رأس مالي الخاص";

    setPending({
      type: "account",
      payload,
      message: `هل أنت متأكد من إضافة ${money(payload.amount, payload.currency)} إلى ${target}؟`,
    });
  }

  function submitMovement(e) {
    e.preventDefault();

    if (!validateMovementForm(movementForm, setMovementErrors)) return;

    const payload = {
      ...movementForm,
      amount: Number(movementForm.amount),
      notes: movementForm.notes.trim() || null,
      statement: movementForm.notes.trim() || null,
      reference_number: movementForm.reference_number.trim() || null,
    };
    const isWithdrawal = payload.type === "withdrawal";

    setPending({
      type: "movement",
      account: movementAccount,
      payload,
      message: isWithdrawal
        ? `هل أنت متأكد من سحب ${money(payload.amount, movementAccount.currency)} من ${movementAccount.name}؟`
        : `هل أنت متأكد من إضافة ${money(payload.amount, movementAccount.currency)} إلى ${movementAccount.name}؟`,
    });
  }

  function submitEdit(e) {
    e.preventDefault();

    if (!validateMovementForm(editForm, setEditErrors)) return;

    const payload = {
      amount: Number(editForm.amount),
      transaction_date: editForm.transaction_date,
      notes: editForm.notes.trim() || null,
      statement: editForm.notes.trim() || null,
      reference_number: editForm.reference_number.trim() || null,
    };

    setPending({
      type: "edit",
      movement: editMovement,
      payload,
      message: "سيتم إعادة احتساب أثر هذه الحركة على رصيد حساب رأس المال بعد التعديل.",
    });
  }

  function requestDeleteMovement(movement) {
    setPending({
      type: "delete",
      movement,
      message: `هل أنت متأكد من حذف حركة ${getCapitalMovementMeta(movement.type).label} بقيمة ${money(movement.absolute_amount ?? Math.abs(Number(movement.amount || 0)), movement.currency)}؟ سيتم عكس الأثر المالي لهذه الحركة من رصيد رأس المال.`,
    });
  }

  async function refreshAfterMutation(accountId = details?.account?.id) {
    await loadAccounts();

    if (accountId) {
      const current = accounts.find((account) => Number(account.id) === Number(accountId)) || details?.account;

      if (current) {
        await loadDetails(current);
      }
    }
  }

  async function confirmPending() {
    if (!pending) return;

    setBusy(true);

    try {
      if (pending.type === "account") {
        await capitalService.createAccount(pending.payload);
        toast.success("تم حفظ رأس المال");
        setAccountModalOpen(false);
        setAccountForm(INITIAL_ACCOUNT_FORM);
      }

      if (pending.type === "movement") {
        await capitalService.createMovement(pending.account.id, pending.payload);
        toast.success("تم حفظ حركة رأس المال");
        setMovementAccount(null);
        setMovementForm(INITIAL_MOVEMENT_FORM);
      }

      if (pending.type === "edit") {
        await capitalService.updateMovement(pending.movement.id, pending.payload);
        toast.success("تم تعديل حركة رأس المال");
        setEditMovement(null);
      }

      if (pending.type === "delete") {
        await capitalService.deleteMovement(pending.movement.id);
        toast.success("تم حذف حركة رأس المال");
      }

      await refreshAfterMutation(pending.account?.id || details?.account?.id);
      setPending(null);
    } catch (err) {
      const errors = mapValidationErrors(err);

      if (pending.type === "account") setAccountErrors(errors);
      if (pending.type === "movement") setMovementErrors(errors);
      if (pending.type === "edit") setEditErrors(errors);

      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

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
                إدارة رأس المال
              </h1>
              <p className="mt-1 max-w-full break-words text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                متابعة رأس مالي الخاص ورأس مال المستثمرين كسجلات منفصلة مع سجل حركات لكل حساب
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              className="ep-btn ep-btn-ghost h-11 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span className="truncate">تحديث</span>
            </button>

            {canCreateAccount && (
              <button
                type="button"
                onClick={openAccountModal}
                className="ep-btn ep-btn-primary h-11 justify-center px-3 text-xs sm:px-4 sm:text-sm"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">إضافة رأس مال</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {error && !loading ? (
        <ErrorState title="تعذّر تحميل رأس المال" description={extractApiError(error)} onRetry={loadAccounts} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="رأس مالي الخاص"
              value={activeSummary.own_capital}
              suffix={` ${activeSummary.currency}`}
              icon={Wallet}
              color="teal"
              decimals={2}
            />

            <StatCard
              title="رأس مال المستثمرين"
              value={activeSummary.investor_capital}
              suffix={` ${activeSummary.currency}`}
              icon={PiggyBank}
              color="violet"
              decimals={2}
            />

            <StatCard
              title="إجمالي رأس المال"
              value={activeSummary.total_capital}
              suffix={` ${activeSummary.currency}`}
              icon={FileText}
              color="emerald"
              decimals={2}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block text-right">
                <span className="mb-2 block text-xs font-bold text-slate-500">العملة</span>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="ep-input appearance-none"
                >
                  {(currencies.length ? currencies : ["USD"]).map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="ep-card-static min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <Badge color="teal">{filteredAccounts.length} حساب</Badge>

              <div className="min-w-0 text-right">
                <h3 className="truncate text-base font-black text-slate-900">حسابات رأس المال</h3>
                <p className="text-xs text-slate-500">كل صف يمثل مالك رأس مال واحد، والحركات تظهر من عرض التفاصيل</p>
              </div>
            </div>

            <div className="border-b border-slate-100 p-4">
              <label className="block max-w-xl">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">بحث</span>
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث باسم المستثمر أو العملة..."
                    className="ep-input pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>

            {loading ? (
              <div className="space-y-2 p-4 sm:p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ep-skeleton h-14" />
                ))}
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-6 sm:p-8">
                <EmptyState
                  icon={PiggyBank}
                  title="لا توجد حسابات رأس مال"
                  description="أضف رأس مال خاص أو رأس مال استثماري حتى يظهر هنا"
                  action={
                    canCreateAccount ? (
                      <button type="button" onClick={openAccountModal} className="ep-btn ep-btn-primary">
                        <Plus className="h-4 w-4" />
                        إضافة رأس مال
                      </button>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="ep-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>النوع</th>
                      <th>الرصيد الحالي</th>
                      <th>العملة</th>
                      <th>آخر حركة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.id}>
                        <td className="font-black text-slate-900">{account.name}</td>
                        <td>
                          <Badge color={accountTypeColor(account.type)}>
                            {getCapitalAccountTypeLabel(account.type)}
                          </Badge>
                        </td>
                        <td dir="ltr" className="font-mono font-black text-slate-900">
                          {money(account.current_balance, account.currency)}
                        </td>
                        <td>{account.currency}</td>
                        <td>{account.last_movement_date ? formatDate(account.last_movement_date) : "—"}</td>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            {canCreateMovementPermission && (
                              <>
                                <ActionButton
                                  icon={Plus}
                                  label="إضافة أموال"
                                  color="emerald"
                                  onClick={() => openMovementModal(account, "top_up")}
                                />
                                <ActionButton
                                  icon={Minus}
                                  label="سحب أموال"
                                  color="rose"
                                  onClick={() => openMovementModal(account, "withdrawal")}
                                />
                              </>
                            )}
                            <ActionButton
                              icon={Eye}
                              label="عرض التفاصيل"
                              color="teal"
                              onClick={() => loadDetails(account)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={accountModalOpen}
        onClose={() => !busy && setAccountModalOpen(false)}
        title="إضافة رأس مال"
        subtitle="اختر رأس مال خاص أو رأس مال استثماري"
        icon={Plus}
        size="md"
      >
        <AccountForm
          form={accountForm}
          setForm={setAccountForm}
          errors={accountErrors}
          loading={busy}
          onSubmit={submitAccount}
          onCancel={() => setAccountModalOpen(false)}
        />
      </Modal>

      <Modal
        open={!!movementAccount}
        onClose={() => !busy && setMovementAccount(null)}
        title={movementForm.type === "withdrawal" ? "سحب أموال" : "إضافة أموال"}
        subtitle={movementAccount?.name}
        icon={movementForm.type === "withdrawal" ? Minus : Plus}
        size="md"
      >
        <MovementForm
          form={movementForm}
          setForm={setMovementForm}
          account={movementAccount}
          errors={movementErrors}
          loading={busy}
          onSubmit={submitMovement}
          onCancel={() => setMovementAccount(null)}
        />
      </Modal>

      <Modal
        open={detailsOpen}
        onClose={() => !busy && setDetailsOpen(false)}
        title={details?.account?.name || "كشف حساب رأس المال"}
        subtitle={details?.account ? getCapitalAccountTypeLabel(details.account.type) : ""}
        icon={Eye}
        size="xl"
      >
        <AccountDetails
          details={details}
          loading={detailsLoading}
          canCreate={canCreateMovementPermission}
          canUpdate={canUpdateMovementPermission}
          canDelete={canDeleteMovementPermission}
          onAdd={(account) => openMovementModal(account, "top_up")}
          onWithdraw={(account) => openMovementModal(account, "withdrawal")}
          onEdit={openEditMovement}
          onDelete={requestDeleteMovement}
        />
      </Modal>

      <Modal
        open={!!editMovement}
        onClose={() => !busy && setEditMovement(null)}
        title="تعديل حركة رأس مال"
        subtitle="سيتم إعادة احتساب الرصيد بعد الحفظ"
        icon={Edit2}
        size="md"
      >
        <EditMovementForm
          form={editForm}
          setForm={setEditForm}
          movement={editMovement}
          errors={editErrors}
          loading={busy}
          onSubmit={submitEdit}
          onCancel={() => setEditMovement(null)}
        />
      </Modal>

      <Modal
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        title="تأكيد الحركة المالية"
        subtitle="سيتم تحديث الرصيد من الباكند بعد التنفيذ"
        icon={FileText}
        size="sm"
      >
        <div className="space-y-4 text-right">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-900">
            {pending?.message}
          </p>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-start">
            <button type="button" onClick={() => setPending(null)} disabled={busy} className="ep-btn ep-btn-ghost h-11 justify-center">
              إلغاء
            </button>
            <button type="button" onClick={confirmPending} disabled={busy} className="ep-btn ep-btn-primary h-11 justify-center">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              تأكيد
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ActionButton({ icon: Icon, label, color, onClick, disabled = false }) {
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    teal: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${colors[color] || colors.slate}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function AccountForm({ form, setForm, errors, loading, onSubmit, onCancel }) {
  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="نوع رأس المال" required error={errors.type}>
        <select value={form.type} onChange={(e) => update("type", e.target.value)} className="ep-input appearance-none">
          <option value="own">رأس مالي الخاص</option>
          <option value="investor">رأس مال استثماري</option>
        </select>
      </Field>

      {form.type === "investor" && (
        <Field label="المستثمر / الشركة" required error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="مثال: محل ذهب"
            className="ep-input"
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="المبلغ" required error={errors.amount}>
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

        <Field label="العملة" required error={errors.currency}>
          <input value={form.currency} onChange={(e) => update("currency", e.target.value.toUpperCase())} className="ep-input" />
        </Field>

        <Field label="تاريخ الحركة" required error={errors.transaction_date}>
          <input type="date" value={form.transaction_date} onChange={(e) => update("transaction_date", e.target.value)} className="ep-input" />
        </Field>

        <Field label="رقم المرجع" error={errors.reference_number}>
          <input value={form.reference_number} onChange={(e) => update("reference_number", e.target.value)} className="ep-input" />
        </Field>
      </div>

      <Field label="الملاحظة" error={errors.notes || errors.statement}>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="استثمار أولي، زيادة رأس المال..."
          className="ep-input resize-none py-3"
          style={{ height: "auto" }}
        />
      </Field>

      <FormActions loading={loading} onCancel={onCancel} />
    </form>
  );
}

function MovementForm({ form, setForm, account, errors, loading, onSubmit, onCancel }) {
  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
        <p className="text-xs font-bold text-slate-500">الحساب</p>
        <p className="mt-1 font-black text-slate-900">{account?.name}</p>
        <p dir="ltr" className="mt-1 font-mono text-sm font-bold text-slate-600">
          {money(account?.current_balance, account?.currency)}
        </p>
      </div>

      <Field label="نوع الحركة" required error={errors.type}>
        <select value={form.type} onChange={(e) => update("type", e.target.value)} className="ep-input appearance-none">
          <option value="top_up">إضافة</option>
          <option value="withdrawal">سحب</option>
        </select>
      </Field>

      <MovementFields form={form} setForm={setForm} currency={account?.currency} errors={errors} />

      <FormActions loading={loading} onCancel={onCancel} />
    </form>
  );
}

function EditMovementForm({ form, setForm, movement, errors, loading, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-900">
        سيتم إعادة احتساب الأثر المالي للحركة بعد التعديل.
      </div>

      <MovementFields form={form} setForm={setForm} currency={movement?.currency} errors={errors} />

      <FormActions loading={loading} onCancel={onCancel} />
    </form>
  );
}

function MovementFields({ form, setForm, currency, errors }) {
  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={`المبلغ (${currency || "USD"})`} required error={errors.amount}>
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

        <Field label="تاريخ الحركة" required error={errors.transaction_date}>
          <input type="date" value={form.transaction_date} onChange={(e) => update("transaction_date", e.target.value)} className="ep-input" />
        </Field>

        <Field label="رقم المرجع" error={errors.reference_number}>
          <input value={form.reference_number} onChange={(e) => update("reference_number", e.target.value)} className="ep-input" />
        </Field>
      </div>

      <Field label="الملاحظة" error={errors.notes || errors.statement}>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="الملاحظة أو البيان..."
          className="ep-input resize-none py-3"
          style={{ height: "auto" }}
        />
      </Field>
    </>
  );
}

function AccountDetails({ details, loading, canCreate, canUpdate, canDelete, onAdd, onWithdraw, onEdit, onDelete }) {
  const account = details?.account;
  const movements = Array.isArray(details?.movements) ? details.movements : [];

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ep-skeleton h-14" />
        ))}
      </div>
    );
  }

  if (!account) {
    return <EmptyState icon={FileText} title="لا توجد بيانات" description="تعذّر تحميل كشف الحساب" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right md:col-span-2">
          <Badge color={accountTypeColor(account.type)}>{getCapitalAccountTypeLabel(account.type)}</Badge>
          <h3 className="mt-3 text-lg font-black text-slate-950">{account.name}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">سجل الحركات الخاص بهذا الحساب فقط</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right text-emerald-900">
          <p className="text-xs font-black opacity-75">الرصيد الحالي</p>
          <p dir="ltr" className="mt-2 truncate font-mono text-2xl font-black">
            {money(account.current_balance, account.currency)}
          </p>
        </div>
      </div>

      {canCreate && (
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Plus} label="إضافة أموال" color="emerald" onClick={() => onAdd(account)} />
          <ActionButton icon={Minus} label="سحب أموال" color="rose" onClick={() => onWithdraw(account)} />
        </div>
      )}

      {movements.length === 0 ? (
        <EmptyState icon={CalendarDays} title="لا توجد حركات" description="لم تسجل أي حركة على هذا الحساب بعد" />
      ) : (
        <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="ep-table min-w-[900px]">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحركة</th>
                <th>المبلغ</th>
                <th>الرصيد بعد الحركة</th>
                <th>الملاحظة</th>
                <th>أنشأها</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {movements.map((movement) => {
                const meta = getCapitalMovementMeta(movement.type);
                const editable = canEditMovement(movement.type);

                return (
                  <tr key={movement.id}>
                    <td>{movement.transaction_date ? formatDate(movement.transaction_date) : "—"}</td>
                    <td>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </td>
                    <td dir="ltr" className={`font-mono font-black ${movementAmountClass(movement.amount)}`}>
                      {movementSign(movement.amount)}
                      {money(movement.amount, movement.currency)}
                    </td>
                    <td dir="ltr" className="font-mono font-bold text-slate-700">
                      {money(movement.balance_after, movement.currency)}
                    </td>
                    <td className="max-w-[260px] truncate">{movement.notes || movement.statement || "—"}</td>
                    <td>{userLabel(movement.created_by)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {canUpdate && editable && (
                          <ActionButton icon={Edit2} label="تعديل" color="slate" onClick={() => onEdit(movement)} />
                        )}
                        {canDelete && editable && (
                          <ActionButton icon={Trash2} label="حذف" color="rose" onClick={() => onDelete(movement)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormActions({ loading, onCancel }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-start">
      <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost h-11 justify-center">
        إلغاء
      </button>
      <button type="submit" disabled={loading} className="ep-btn ep-btn-primary h-11 justify-center">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        حفظ
      </button>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="block min-w-0 text-right">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>

      {children}

      {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
    </label>
  );
}
