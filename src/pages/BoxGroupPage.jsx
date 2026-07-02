import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Coins,
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  Eye,
  ArrowRightLeft,
  SlidersHorizontal,
  ClipboardList,
} from "lucide-react";

import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import boxesService from "../services/boxes";
import operationsService from "../services/operations";
import { extractApiError } from "../shared/helpers";
import { useToast } from "../shared/Toast";

const CURRENCIES = ["USD", "EUR", "ILS", "TRY", "USDT", "GBP"];

const GROUPS = {
  turkish: {
    apiType: "turkish",
    title: "صناديق تركيا",
    subtitle: "إدارة حسابات برق والطير والحسابات التركية",
    addText: "إضافة حساب تركي",
    icon: Coins,
  },
  "local-bank-wallet": {
    apiType: "local_bank_wallet",
    title: "البنوك والمحافظ الرقمية",
    subtitle: "إدارة البنوك والمحافظ مثل بنك فلسطين وجوال باي",
    addText: "إضافة بنك أو محفظة",
    icon: Building2,
  },
  "usdt-wallet": {
    apiType: "usdt_wallet",
    title: "المحافظ الإلكترونية",
    subtitle: "إدارة Binance ومحافظ USDT والحسابات الإلكترونية",
    addText: "إضافة محفظة إلكترونية",
    icon: Wallet,
  },
};

const INITIAL_FORM = {
  name: "",
  current_balance: "",
  currency: "USD",
  account_identifier: "",
  status: "active",
  notes: "",
};

const INITIAL_BALANCE = {
  operation_type: "add",
  amount: "",
  notes: "",
};

const INITIAL_ADJUSTMENT = {
  adjustment_type: "increase",
  amount: "",
  reason: "",
};

function unwrapList(res) {
  return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getIdentifierLabel(type) {
  if (type === "turkish") return "رقم الحساب / الكود";
  if (type === "local_bank_wallet") return "رقم الحساب أو رقم المحفظة";
  if (type === "usdt_wallet") return "رقم المحفظة";
  return "رقم الحساب";
}

function getIdentifierPlaceholder(type) {
  if (type === "turkish") return "مثال: كود برق أو رقم حساب الطير";
  if (type === "local_bank_wallet") return "مثال: رقم حساب بنك فلسطين أو رقم جوال باي";
  if (type === "usdt_wallet") return "مثال: عنوان المحفظة أو UID";
  return "أدخل الرقم";
}

function getIdentifierValue(item) {
  return item.account_identifier || item.wallet_number || item.account_number || item.code || "لا يوجد رقم";
}

function getCustomerName(operation) {
  return operation.customer?.name || operation.customer_name || operation.to_customer?.name || operation.to_customer_name || "—";
}

function getOperationReference(operation) {
  return operation.reference_number || operation.reference || operation.code || `OP-${operation.id}`;
}

function mapAdjustmentApiErrors(err) {
  const apiErrors = err?.response?.data?.errors;

  if (!apiErrors || typeof apiErrors !== "object") return {};

  const mapped = {};

  Object.keys(apiErrors).forEach((key) => {
    const message = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];

    if (key === "adjustment_type") {
      mapped.adjustment_type = "اختر نوع التسوية رجاءً";
      return;
    }

    if (key === "amount") {
      const text = String(message || "");
      mapped.amount = text.includes("أكبر من صفر")
        ? "مبلغ التسوية لازم يكون أكبر من صفر"
        : "أضف مبلغ التسوية رجاءً";
      return;
    }

    if (key === "reason") {
      mapped.reason = "اكتب سبب التسوية رجاءً";
      return;
    }

    mapped[key] = message || "القيمة غير صحيحة";
  });

  return mapped;
}

function BoxGroupPage() {
  const toast = useToast();
  const { type } = useParams();
  const group = GROUPS[type] || GROUPS.turkish;
  const Icon = group.icon;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceItem, setBalanceItem] = useState(null);
  const [balanceForm, setBalanceForm] = useState(INITIAL_BALANCE);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState(INITIAL_ADJUSTMENT);
  const [adjustErrors, setAdjustErrors] = useState({});

  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
  const [adjustmentsItem, setAdjustmentsItem] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  const [logsOpen, setLogsOpen] = useState(false);
  const [logsItem, setLogsItem] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [operationsOpen, setOperationsOpen] = useState(false);
  const [operationsItem, setOperationsItem] = useState(null);
  const [operations, setOperations] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      let res;

      if (group.apiType === "turkish") {
        res = await boxesService.listTurkish({ per_page: 100 });
      } else if (group.apiType === "local_bank_wallet") {
        res = await boxesService.listLocalBankWallets({ per_page: 100 });
      } else if (group.apiType === "usdt_wallet") {
        res = await boxesService.listUsdtWallets({ per_page: 100 });
      } else {
        res = await boxesService.list({ type: group.apiType, per_page: 100 });
      }

      setItems(unwrapList(res));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.current_balance || 0), 0);
  }, [items]);

  function updateAdjustField(field, value) {
    setAdjustForm((prev) => ({ ...prev, [field]: value }));

    setAdjustErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateAdjustment() {
    const validationErrors = {};

    if (!adjustForm.adjustment_type) {
      validationErrors.adjustment_type = "اختر نوع التسوية رجاءً";
    }

    if (!adjustForm.amount) {
      validationErrors.amount = "أضف مبلغ التسوية رجاءً";
    } else if (Number(adjustForm.amount) <= 0) {
      validationErrors.amount = "مبلغ التسوية لازم يكون أكبر من صفر";
    }

    if (!String(adjustForm.reason || "").trim()) {
      validationErrors.reason = "اكتب سبب التسوية رجاءً";
    }

    setAdjustErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  function openCreate() {
    setEditingItem(null);
    setForm(INITIAL_FORM);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      current_balance: item.current_balance || "",
      currency: item.currency || "USD",
      account_identifier: item.account_identifier || item.wallet_number || item.account_number || item.code || "",
      status: item.status || "active",
      notes: item.notes || "",
    });
    setFormOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const payload = {
        name: form.name,
        type: group.apiType,
        current_balance: Number(form.current_balance || 0),
        currency: form.currency,
        status: form.status,
        notes: form.notes || null,
        account_identifier: form.account_identifier || null,
      };

      if (editingItem) {
        await boxesService.update(editingItem.id, payload);
        toast.success("تم تحديث الحساب");
      } else {
        await boxesService.create(payload);
        toast.success("تم إضافة الحساب");
      }

      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openBalance(item) {
    setBalanceItem(item);
    setBalanceForm(INITIAL_BALANCE);
    setBalanceOpen(true);
  }

  async function submitBalance(e) {
    e.preventDefault();
    if (!balanceItem) return;

    setBusy(true);

    try {
      await boxesService.balance(balanceItem.id, {
        operation_type: balanceForm.operation_type,
        amount: Number(balanceForm.amount || 0),
        notes: balanceForm.notes || null,
      });

      toast.success("تم تعديل الرصيد");
      setBalanceOpen(false);
      load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openAdjust(item) {
    setAdjustItem(item);
    setAdjustForm(INITIAL_ADJUSTMENT);
    setAdjustErrors({});
    setAdjustOpen(true);
  }

  async function submitAdjustment(e) {
    e.preventDefault();
    if (!adjustItem) return;

    if (!validateAdjustment()) return;

    setBusy(true);

    try {
      await boxesService.adjust(adjustItem.id, {
        adjustment_type: adjustForm.adjustment_type,
        amount: Number(adjustForm.amount),
        reason: String(adjustForm.reason || "").trim(),
      });

      toast.success("تمت تسوية الصندوق");
      setAdjustOpen(false);
      setAdjustErrors({});
      load();
    } catch (err) {
      const fieldErrors = mapAdjustmentApiErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setAdjustErrors(fieldErrors);
        return;
      }

      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function openAdjustments(item) {
    setAdjustmentsItem(item);
    setAdjustmentsOpen(true);
    setAdjustments([]);
    setAdjustmentsLoading(true);

    try {
      const res = await boxesService.adjustments(item.id, { per_page: 50 });
      setAdjustments(unwrapList(res));
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setAdjustmentsLoading(false);
    }
  }

  async function openLogs(item) {
    setLogsItem(item);
    setLogsOpen(true);
    setLogs([]);
    setLogsLoading(true);

    try {
      const res = await boxesService.logs(item.id);
      setLogs(unwrapList(res));
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setLogsLoading(false);
    }
  }

  async function openOperations(item) {
    setOperationsItem(item);
    setOperationsOpen(true);
    setOperations([]);
    setOperationsLoading(true);

    try {
      const res = await operationsService.list({ box_id: item.id, per_page: 50 });
      setOperations(unwrapList(res));
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setOperationsLoading(false);
    }
  }

  async function removeItem() {
    if (!confirmDelete) return;

    setBusy(true);

    try {
      await boxesService.remove(confirmDelete.id);
      toast.success("تم حذف الحساب");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={group.title}
        subtitle={group.subtitle}
        icon={Icon}
        breadcrumb={
          <Link to="/boxes" className="inline-flex items-center gap-1 text-teal-700">
            <ArrowRight className="h-3.5 w-3.5" />
            رجوع للصناديق
          </Link>
        }
        actions={
          <button type="button" onClick={openCreate} className="ep-btn ep-btn-primary">
            <Plus className="h-4 w-4" />
            {group.addText}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="عدد الحسابات" value={items.length} icon={Package} />
        <StatCard title="الحسابات النشطة" value={items.filter((i) => i.status === "active").length} icon={Icon} />
        <StatCard title="إجمالي الرصيد" value={money(total)} icon={Wallet} />
      </div>

      <div className="ep-card-static overflow-hidden">
        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ep-skeleton h-52" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا يوجد حسابات" description={`أضف أول حساب داخل ${group.title}`} />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <AccountCard
                key={item.id}
                item={item}
                groupType={group.apiType}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
                onBalance={openBalance}
                onLogs={openLogs}
                onOperations={openOperations}
                onAdjust={openAdjust}
                onAdjustments={openAdjustments}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingItem ? "تعديل حساب" : group.addText} icon={Icon} size="lg">
        <form onSubmit={submitForm} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الحساب">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="ep-input"
                placeholder="مثال: برق، بنك فلسطين، Binance"
              />
            </Field>

            <Field label="الرصيد الابتدائي">
              <input
                type="number"
                step="0.0001"
                value={form.current_balance}
                onChange={(e) => setForm((p) => ({ ...p, current_balance: e.target.value }))}
                className="ep-input"
                disabled={!!editingItem}
              />
            </Field>

            <Field label="العملة">
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="ep-input"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={getIdentifierLabel(group.apiType)}>
              <input
                value={form.account_identifier}
                onChange={(e) => setForm((p) => ({ ...p, account_identifier: e.target.value }))}
                className="ep-input"
                placeholder={getIdentifierPlaceholder(group.apiType)}
              />
            </Field>

            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="ep-input"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </Field>
          </div>

          <Field label="ملاحظات">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="ep-input min-h-24"
              placeholder="اختياري"
            />
          </Field>

          <FormActions busy={busy} onCancel={() => setFormOpen(false)} />
        </form>
      </Modal>

      <Modal open={balanceOpen} onClose={() => setBalanceOpen(false)} title="تعديل الرصيد" subtitle={balanceItem?.name} icon={Wallet}>
        <form onSubmit={submitBalance} className="space-y-4">
          <Field label="نوع العملية">
            <select
              value={balanceForm.operation_type}
              onChange={(e) => setBalanceForm((p) => ({ ...p, operation_type: e.target.value }))}
              className="ep-input"
            >
              <option value="add">إضافة</option>
              <option value="subtract">خصم</option>
            </select>
          </Field>

          <Field label="المبلغ">
            <input
              required
              type="number"
              step="0.0001"
              value={balanceForm.amount}
              onChange={(e) => setBalanceForm((p) => ({ ...p, amount: e.target.value }))}
              className="ep-input"
            />
          </Field>

          <Field label="ملاحظات">
            <textarea
              value={balanceForm.notes}
              onChange={(e) => setBalanceForm((p) => ({ ...p, notes: e.target.value }))}
              className="ep-input min-h-24"
            />
          </Field>

          <FormActions busy={busy} onCancel={() => setBalanceOpen(false)} />
        </form>
      </Modal>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="تسوية فعلية للصندوق" subtitle={adjustItem?.name} icon={SlidersHorizontal}>
        <form onSubmit={submitAdjustment} className="space-y-4" noValidate>
          <Field label="نوع التسوية" error={adjustErrors.adjustment_type}>
            <select
              value={adjustForm.adjustment_type}
              onChange={(e) => updateAdjustField("adjustment_type", e.target.value)}
              className={`ep-input ${adjustErrors.adjustment_type ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
            >
              <option value="">اختر نوع التسوية</option>
              <option value="increase">زيادة الرصيد</option>
              <option value="decrease">خصم من الرصيد</option>
            </select>
          </Field>

          <Field label={`المبلغ${adjustItem?.currency ? ` (${adjustItem.currency})` : ""}`} error={adjustErrors.amount}>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={adjustForm.amount}
              onChange={(e) => updateAdjustField("amount", e.target.value)}
              className={`ep-input ${adjustErrors.amount ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
              placeholder="أدخل مبلغ التسوية"
            />
          </Field>

          <Field label="سبب التسوية" error={adjustErrors.reason}>
            <textarea
              value={adjustForm.reason}
              onChange={(e) => updateAdjustField("reason", e.target.value)}
              className={`ep-input min-h-24 ${adjustErrors.reason ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""}`}
              placeholder="مثال: فرق جرد يومي أو تصحيح رصيد فعلي"
            />
          </Field>

          <FormActions busy={busy} onCancel={() => setAdjustOpen(false)} />
        </form>
      </Modal>

      <Modal open={adjustmentsOpen} onClose={() => setAdjustmentsOpen(false)} title="سجل التسويات" subtitle={adjustmentsItem?.name} icon={ClipboardList} size="xl">
        {adjustmentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ep-skeleton h-12" />
            ))}
          </div>
        ) : adjustments.length === 0 ? (
          <EmptyState title="لا يوجد تسويات" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ep-table min-w-[900px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>قبل</th>
                  <th>بعد</th>
                  <th>السبب</th>
                  <th>المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adjustment) => {
                  const typeValue = adjustment.type || adjustment.adjustment_type || adjustment.operation_type;
                  const isIncrease = ["increase", "add"].includes(typeValue);

                  return (
                    <tr key={adjustment.id}>
                      <td>{adjustment.created_at ? new Date(adjustment.created_at).toLocaleString("ar") : "—"}</td>
                      <td>
                        <Badge color={isIncrease ? "emerald" : "rose"}>
                          {isIncrease ? "زيادة" : "خصم"}
                        </Badge>
                      </td>
                      <td dir="ltr" className="font-mono">{money(adjustment.amount)}</td>
                      <td dir="ltr" className="font-mono">{money(adjustment.balance_before)}</td>
                      <td dir="ltr" className="font-mono">{money(adjustment.balance_after)}</td>
                      <td>{adjustment.reason || adjustment.notes || "—"}</td>
                      <td>{adjustment.created_by_user?.name || adjustment.created_by?.name || adjustment.user?.name || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={logsOpen} onClose={() => setLogsOpen(false)} title="سجل الحركة" subtitle={logsItem?.name} icon={History} size="xl">
        {logsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ep-skeleton h-12" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState title="لا يوجد حركات" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ep-table min-w-[800px]">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>العملية</th>
                  <th>المبلغ</th>
                  <th>قبل</th>
                  <th>بعد</th>
                  <th>ملاحظات</th>
                  <th>المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleString("ar") : "—"}</td>
                    <td>
                      <Badge color={log.operation_type === "add" ? "emerald" : "rose"}>
                        {log.operation_type === "add" ? "إضافة" : "خصم"}
                      </Badge>
                    </td>
                    <td dir="ltr" className="font-mono">{money(log.amount)}</td>
                    <td dir="ltr" className="font-mono">{money(log.balance_before)}</td>
                    <td dir="ltr" className="font-mono">{money(log.balance_after)}</td>
                    <td>{log.notes || "—"}</td>
                    <td>{log.created_by_user?.name || log.created_by?.name || log.user?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal open={operationsOpen} onClose={() => setOperationsOpen(false)} title="عمليات الحساب" subtitle={operationsItem?.name} icon={ArrowRightLeft} size="xl">
        {operationsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ep-skeleton h-12" />
            ))}
          </div>
        ) : operations.length === 0 ? (
          <EmptyState title="لا توجد عمليات" description="لا يوجد عمليات مرتبطة بهذا الحساب حتى الآن" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ep-table min-w-[950px]">
              <thead>
                <tr>
                  <th>رقم العملية</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>مبلغ العميل</th>
                  <th>العمولة</th>
                  <th>الصافي</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const amount = Number(op.customer_amount || op.amount || 0);
                  const commission = Number(op.commission_amount || op.commission_rate || 0);
                  const net = amount - commission;

                  return (
                    <tr key={op.id}>
                      <td dir="ltr" className="font-mono text-xs font-bold">{getOperationReference(op)}</td>
                      <td className="text-xs text-slate-500">{op.transaction_date || op.created_at || "—"}</td>
                      <td className="font-bold text-slate-700">{getCustomerName(op)}</td>
                      <td dir="ltr" className="font-mono font-bold">{money(amount)} {op.customer_currency || op.currency || ""}</td>
                      <td dir="ltr" className="font-mono">{money(commission)}</td>
                      <td dir="ltr" className="font-mono font-black text-teal-700">{money(net)}</td>
                      <td>{op.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={removeItem}
        title="حذف الحساب"
        description="هل أنت متأكد من حذف هذا الحساب؟"
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function AccountCard({ item, groupType, onEdit, onDelete, onBalance, onLogs, onOperations, onAdjust, onAdjustments }) {
  return (
    <div
      onClick={() => onOperations(item)}
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onEdit(item)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50">
            <Pencil className="h-4 w-4" />
          </button>

          <button type="button" onClick={() => onDelete(item)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="text-right">
          <h3 className="font-black text-slate-900 hover:text-teal-700">{item.name}</h3>
          <p dir="ltr" className="mt-2 font-mono text-3xl font-black text-slate-900">{money(item.current_balance)}</p>
          <p className="text-xs font-bold text-slate-500">{item.currency}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-right">
        <p className="text-[11px] font-bold text-slate-500">{getIdentifierLabel(groupType)}</p>
        <p dir="ltr" className="mt-1 font-mono text-xs font-bold text-slate-700">{getIdentifierValue(item)}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Badge color={item.status === "active" ? "emerald" : "rose"} dot>
          {item.status === "active" ? "نشط" : "غير نشط"}
        </Badge>

        <span className="text-[11px] font-bold text-teal-600">اضغط لعرض العمليات</span>
      </div>

      {item.notes && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{item.notes}</div>}

      <div className="mt-5 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onOperations(item)} className="ep-btn ep-btn-ghost justify-center">
          <Eye className="h-4 w-4" />
          العمليات
        </button>

        <button type="button" onClick={() => onBalance(item)} className="ep-btn ep-btn-primary justify-center">
          <Wallet className="h-4 w-4" />
          رصيد
        </button>

        <button type="button" onClick={() => onAdjust(item)} className="ep-btn ep-btn-primary justify-center">
          <SlidersHorizontal className="h-4 w-4" />
          تسوية
        </button>

        <button type="button" onClick={() => onAdjustments(item)} className="ep-btn ep-btn-ghost justify-center">
          <ClipboardList className="h-4 w-4" />
          التسويات
        </button>

        <button type="button" onClick={() => onLogs(item)} className="ep-btn ep-btn-ghost col-span-2 justify-center">
          <History className="h-4 w-4" />
          السجل
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <p dir="ltr" className="mt-1 font-mono text-2xl font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
      {error && (
        <p className="mt-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">
          {error}
        </p>
      )}
    </label>
  );
}

function FormActions({ busy, onCancel }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="ep-btn ep-btn-ghost">
        إلغاء
      </button>
      <button type="submit" disabled={busy} className="ep-btn ep-btn-primary">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        حفظ
      </button>
    </div>
  );
}

export default BoxGroupPage;