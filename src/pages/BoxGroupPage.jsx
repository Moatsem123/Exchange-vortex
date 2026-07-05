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
  if (Array.isArray(res)) return res;

  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.boxes)) return res.boxes;
  if (Array.isArray(res?.adjustments)) return res.adjustments;
  if (Array.isArray(res?.logs)) return res.logs;
  if (Array.isArray(res?.operations)) return res.operations;

  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.boxes)) return res.data.boxes;
  if (Array.isArray(res?.data?.adjustments)) return res.data.adjustments;
  if (Array.isArray(res?.data?.logs)) return res.data.logs;
  if (Array.isArray(res?.data?.operations)) return res.data.operations;

  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data;
  if (Array.isArray(res?.data?.data?.items)) return res.data.data.items;
  if (Array.isArray(res?.data?.data?.boxes)) return res.data.data.boxes;

  return [];
}

function normalizeBoxName(value) {
  return String(value || "")
    .trim()
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function inputClass(error, extra = "") {
  return `ep-input ${extra} ${
    error ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
  }`;
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

function mapBoxApiErrors(err) {
  const apiErrors = err?.response?.data?.errors;

  if (!apiErrors || typeof apiErrors !== "object") return {};

  const mapped = {};

  Object.keys(apiErrors).forEach((key) => {
    const message = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];

    if (key === "name") {
      mapped.name = message || "اسم الحساب موجود مسبقاً، اختر اسم مختلف";
      return;
    }

    if (key === "current_balance") {
      mapped.current_balance = message || "أضف الرصيد الابتدائي رجاءً";
      return;
    }

    if (key === "currency") {
      mapped.currency = message || "اختر العملة رجاءً";
      return;
    }

    if (key === "status") {
      mapped.status = message || "اختر حالة الحساب رجاءً";
      return;
    }

    if (key === "type") {
      mapped.type = message || "اختر نوع الصندوق رجاءً";
      return;
    }

    if (key === "account_identifier") {
      mapped.account_identifier = message || "رقم الحساب غير صحيح";
      return;
    }

    mapped[key] = message || "القيمة غير صحيحة";
  });

  return mapped;
}

function mapBalanceApiErrors(err) {
  const apiErrors = err?.response?.data?.errors;

  if (!apiErrors || typeof apiErrors !== "object") return {};

  const mapped = {};

  Object.keys(apiErrors).forEach((key) => {
    const message = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];

    if (key === "operation_type") {
      mapped.operation_type = "اختر نوع العملية رجاءً";
      return;
    }

    if (key === "amount") {
      mapped.amount = message || "أضف المبلغ رجاءً";
      return;
    }

    if (key === "notes") {
      mapped.notes = message || "الملاحظات غير صحيحة";
      return;
    }

    mapped[key] = message || "القيمة غير صحيحة";
  });

  return mapped;
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
      mapped.amount = message || "أضف مبلغ التسوية رجاءً";
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
  const [formErrors, setFormErrors] = useState({});

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceItem, setBalanceItem] = useState(null);
  const [balanceForm, setBalanceForm] = useState(INITIAL_BALANCE);
  const [balanceErrors, setBalanceErrors] = useState({});

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
        res = await boxesService.listTurkish({ per_page: 1000 });
      } else if (group.apiType === "local_bank_wallet") {
        res = await boxesService.listLocalBankWallets({ per_page: 1000 });
      } else if (group.apiType === "usdt_wallet") {
        res = await boxesService.listUsdtWallets({ per_page: 1000 });
      } else {
        res = await boxesService.list({ type: group.apiType, per_page: 1000 });
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

  function nameExistsInCurrentGroup(name) {
    const normalizedName = normalizeBoxName(name);

    return items.some((item) => {
      const sameName = normalizeBoxName(item.name) === normalizedName;
      const sameItem = editingItem ? String(item.id) === String(editingItem.id) : false;

      return sameName && !sameItem;
    });
  }

  function updateFormField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));

    setFormErrors((prev) => {
      const next = { ...prev };

      if (field === "name") {
        const name = String(value || "").trim();

        if (!name) {
          next.name = "أضف اسم الحساب رجاءً";
        } else if (nameExistsInCurrentGroup(name)) {
          next.name = "هذا الاسم موجود مسبقاً داخل هذا القسم، اختر اسم مختلف";
        } else {
          delete next.name;
        }
      }

      if (field === "current_balance" && !editingItem) {
        if (value === "" || value === null || value === undefined) {
          next.current_balance = "أضف الرصيد الابتدائي رجاءً";
        } else if (Number.isNaN(Number(value))) {
          next.current_balance = "الرصيد يجب أن يكون رقم صحيح";
        } else if (Number(value) <= 0) {
          next.current_balance = "الرصيد الابتدائي لازم يكون أكبر من صفر";
        } else {
          delete next.current_balance;
        }
      }

      if (field === "currency") {
        if (!value) next.currency = "اختر العملة رجاءً";
        else delete next.currency;
      }

      if (field === "status") {
        if (!value) next.status = "اختر حالة الحساب رجاءً";
        else delete next.status;
      }

      return next;
    });
  }

  function updateBalanceField(field, value) {
    setBalanceForm((prev) => ({ ...prev, [field]: value }));

    setBalanceErrors((prev) => {
      const next = { ...prev };

      if (field === "operation_type") {
        if (!value) next.operation_type = "اختر نوع العملية رجاءً";
        else delete next.operation_type;
      }

      if (field === "amount") {
        if (value === "" || value === null || value === undefined) {
          next.amount = "أضف المبلغ رجاءً";
        } else if (Number.isNaN(Number(value))) {
          next.amount = "المبلغ يجب أن يكون رقم صحيح";
        } else if (Number(value) <= 0) {
          next.amount = "المبلغ لازم يكون أكبر من صفر";
        } else {
          delete next.amount;
        }
      }

      return next;
    });
  }

  function updateAdjustField(field, value) {
    setAdjustForm((prev) => ({ ...prev, [field]: value }));

    setAdjustErrors((prev) => {
      const next = { ...prev };

      if (field === "adjustment_type") {
        if (!value) next.adjustment_type = "اختر نوع التسوية رجاءً";
        else delete next.adjustment_type;
      }

      if (field === "amount") {
        if (value === "" || value === null || value === undefined) {
          next.amount = "أضف مبلغ التسوية رجاءً";
        } else if (Number.isNaN(Number(value))) {
          next.amount = "مبلغ التسوية يجب أن يكون رقم صحيح";
        } else if (Number(value) <= 0) {
          next.amount = "مبلغ التسوية لازم يكون أكبر من صفر";
        } else {
          delete next.amount;
        }
      }

      if (field === "reason") {
        if (!String(value || "").trim()) next.reason = "اكتب سبب التسوية رجاءً";
        else delete next.reason;
      }

      return next;
    });
  }

  function validateBoxForm() {
    const validationErrors = {};
    const name = String(form.name || "").trim();

    if (!name) {
      validationErrors.name = "أضف اسم الحساب رجاءً";
    } else if (nameExistsInCurrentGroup(name)) {
      validationErrors.name = "هذا الاسم موجود مسبقاً داخل هذا القسم، اختر اسم مختلف";
    }

    if (!editingItem) {
      if (form.current_balance === "" || form.current_balance === null || form.current_balance === undefined) {
        validationErrors.current_balance = "أضف الرصيد الابتدائي رجاءً";
      } else if (Number.isNaN(Number(form.current_balance))) {
        validationErrors.current_balance = "الرصيد يجب أن يكون رقم صحيح";
      } else if (Number(form.current_balance) <= 0) {
        validationErrors.current_balance = "الرصيد الابتدائي لازم يكون أكبر من صفر";
      }
    }

    if (!form.currency) {
      validationErrors.currency = "اختر العملة رجاءً";
    }

    if (!form.status) {
      validationErrors.status = "اختر حالة الحساب رجاءً";
    }

    setFormErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  function validateBalance() {
    const validationErrors = {};

    if (!balanceForm.operation_type) {
      validationErrors.operation_type = "اختر نوع العملية رجاءً";
    }

    if (balanceForm.amount === "" || balanceForm.amount === null || balanceForm.amount === undefined) {
      validationErrors.amount = "أضف المبلغ رجاءً";
    } else if (Number.isNaN(Number(balanceForm.amount))) {
      validationErrors.amount = "المبلغ يجب أن يكون رقم صحيح";
    } else if (Number(balanceForm.amount) <= 0) {
      validationErrors.amount = "المبلغ لازم يكون أكبر من صفر";
    }

    setBalanceErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  function validateAdjustment() {
    const validationErrors = {};

    if (!adjustForm.adjustment_type) {
      validationErrors.adjustment_type = "اختر نوع التسوية رجاءً";
    }

    if (adjustForm.amount === "" || adjustForm.amount === null || adjustForm.amount === undefined) {
      validationErrors.amount = "أضف مبلغ التسوية رجاءً";
    } else if (Number.isNaN(Number(adjustForm.amount))) {
      validationErrors.amount = "مبلغ التسوية يجب أن يكون رقم صحيح";
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
    setFormErrors({});
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
    setFormErrors({});
    setFormOpen(true);
  }

  async function submitForm(e) {
    e.preventDefault();

    if (busy) return;
    if (!validateBoxForm()) return;

    setBusy(true);

    try {
      const payload = {
        name: String(form.name || "").trim(),
        type: group.apiType,
        current_balance: editingItem ? Number(editingItem.current_balance || 0) : Number(form.current_balance),
        currency: form.currency,
        status: form.status,
        notes: String(form.notes || "").trim() || null,
        account_identifier: String(form.account_identifier || "").trim() || null,
      };

      if (editingItem) {
        await boxesService.update(editingItem.id, payload);
        toast.success("تم تحديث الحساب");
      } else {
        await boxesService.create(payload);
        toast.success("تم إضافة الحساب");
      }

      setFormOpen(false);
      setFormErrors({});
      load();
    } catch (err) {
      const fieldErrors = mapBoxApiErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
        return;
      }

      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openBalance(item) {
    setBalanceItem(item);
    setBalanceForm(INITIAL_BALANCE);
    setBalanceErrors({});
    setBalanceOpen(true);
  }

  async function submitBalance(e) {
    e.preventDefault();
    if (!balanceItem) return;

    if (!validateBalance()) return;

    setBusy(true);

    try {
      await boxesService.balance(balanceItem.id, {
        operation_type: balanceForm.operation_type,
        amount: Number(balanceForm.amount),
        notes: String(balanceForm.notes || "").trim() || null,
      });

      toast.success("تم تعديل الرصيد");
      setBalanceOpen(false);
      setBalanceErrors({});
      load();
    } catch (err) {
      const fieldErrors = mapBalanceApiErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setBalanceErrors(fieldErrors);
        return;
      }

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
        <form onSubmit={submitForm} className="space-y-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الحساب" error={formErrors.name}>
              <input
                value={form.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                className={inputClass(formErrors.name)}
                placeholder="مثال: برق، بنك فلسطين، Binance"
              />
            </Field>

            <Field label="الرصيد الابتدائي" error={formErrors.current_balance}>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={form.current_balance}
                onChange={(e) => updateFormField("current_balance", e.target.value)}
                className={inputClass(formErrors.current_balance)}
                placeholder="أدخل الرصيد الابتدائي"
                disabled={!!editingItem}
              />
            </Field>

            <Field label="العملة" error={formErrors.currency}>
              <select
                value={form.currency}
                onChange={(e) => updateFormField("currency", e.target.value)}
                className={inputClass(formErrors.currency)}
              >
                <option value="">اختر العملة</option>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={getIdentifierLabel(group.apiType)} error={formErrors.account_identifier}>
              <input
                value={form.account_identifier}
                onChange={(e) => updateFormField("account_identifier", e.target.value)}
                className={inputClass(formErrors.account_identifier)}
                placeholder={getIdentifierPlaceholder(group.apiType)}
              />
            </Field>

            <Field label="الحالة" error={formErrors.status}>
              <select
                value={form.status}
                onChange={(e) => updateFormField("status", e.target.value)}
                className={inputClass(formErrors.status)}
              >
                <option value="">اختر الحالة</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </Field>
          </div>

          <Field label="ملاحظات" error={formErrors.notes}>
            <textarea
              value={form.notes}
              onChange={(e) => updateFormField("notes", e.target.value)}
              className={inputClass(formErrors.notes, "min-h-24")}
              placeholder="اختياري"
            />
          </Field>

          <FormActions busy={busy} onCancel={() => setFormOpen(false)} />
        </form>
      </Modal>

      <Modal open={balanceOpen} onClose={() => setBalanceOpen(false)} title="تعديل الرصيد" subtitle={balanceItem?.name} icon={Wallet}>
        <form onSubmit={submitBalance} className="space-y-4" noValidate>
          <Field label="نوع العملية" error={balanceErrors.operation_type}>
            <select
              value={balanceForm.operation_type}
              onChange={(e) => updateBalanceField("operation_type", e.target.value)}
              className={inputClass(balanceErrors.operation_type)}
            >
              <option value="">اختر نوع العملية</option>
              <option value="add">إضافة</option>
              <option value="subtract">خصم</option>
            </select>
          </Field>

          <Field label={`المبلغ${balanceItem?.currency ? ` (${balanceItem.currency})` : ""}`} error={balanceErrors.amount}>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={balanceForm.amount}
              onChange={(e) => updateBalanceField("amount", e.target.value)}
              className={inputClass(balanceErrors.amount)}
              placeholder="أدخل المبلغ"
            />
          </Field>

          <Field label="ملاحظات" error={balanceErrors.notes}>
            <textarea
              value={balanceForm.notes}
              onChange={(e) => updateBalanceField("notes", e.target.value)}
              className={inputClass(balanceErrors.notes, "min-h-24")}
              placeholder="اختياري"
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
              className={inputClass(adjustErrors.adjustment_type)}
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
              className={inputClass(adjustErrors.amount)}
              placeholder="أدخل مبلغ التسوية"
            />
          </Field>

          <Field label="سبب التسوية" error={adjustErrors.reason}>
            <textarea
              value={adjustForm.reason}
              onChange={(e) => updateAdjustField("reason", e.target.value)}
              className={inputClass(adjustErrors.reason, "min-h-24")}
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
                        <Badge color={isIncrease ? "emerald" : "rose"}>{isIncrease ? "زيادة" : "خصم"}</Badge>
                      </td>
                      <td dir="ltr" className="font-mono">{money(adjustment.amount)}</td>
                      <td dir="ltr" className="font-mono">{money(adjustment.balance_before)}</td>
                      <td dir="ltr" className="font-mono">{money(adjustment.balance_after)}</td>
                      <td>{adjustment.reason || adjustment.notes || "—"}</td>
                      <td>{adjustment.creator?.name || adjustment.created_by_user?.name || adjustment.created_by?.name || adjustment.user?.name || "—"}</td>
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