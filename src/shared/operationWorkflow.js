import { Building2, CheckCheck, Clock3, HandCoins, ReceiptText, Wallet } from "lucide-react";
import { formatMoney } from "./helpers";

export const OPERATION_STATUS_META = {
  pending: { label: "معلقة", color: "amber" },
  completed: { label: "مكتملة", color: "emerald" },
  cancelled: { label: "ملغاة", color: "rose" },
};

export const CUSTOMER_DIRECTIONS = {
  unspecified: {
    label: "غير محدد",
    shortLabel: "غير محدد",
    pendingLabel: "لم يتم تحديد التسوية",
    completedLabel: "تمت التسوية",
    completedMessage: "تمت تسوية العميل",
    pendingMessage: "بانتظار تحديد وتسوية موقف العميل",
    settlementLabel: "تسوية العميل",
    cashImpact: "لا يوجد أثر نقدي مسجل بعد",
    icon: Wallet,
  },
  customer_pays_intermediary: {
    label: "العميل يرسل أموالاً",
    shortLabel: "العميل يرسل",
    pendingLabel: "لم يدفع",
    completedLabel: "دفع",
    completedMessage: "تم استلام أموال العميل",
    pendingMessage: "بانتظار استلام أموال العميل",
    settlementLabel: "دفع العميل",
    cashImpact: "يزيد رصيد الصندوق المختار",
    icon: HandCoins,
  },
  intermediary_pays_customer: {
    label: "العميل يستلم أموالاً",
    shortLabel: "العميل يستلم",
    pendingLabel: "لم يستلم",
    completedLabel: "استلم",
    completedMessage: "تم تسليم أموال العميل",
    pendingMessage: "بانتظار تسليم أموال العميل",
    settlementLabel: "استلام العميل",
    cashImpact: "ينقص رصيد الصندوق المختار",
    icon: Wallet,
  },
};

export const SUPPLIER_DIRECTIONS = {
  unspecified: {
    label: "غير محدد",
    shortLabel: "غير محدد",
    customerDirection: "unspecified",
    fulfillmentMessage: "سيتم تسجيل تنفيذ المورد حسب اتجاه العملية.",
    settlementMessage: "سيتم تسجيل تسوية المورد حسب المستحق المفتوح.",
    cashImpact: "لا يوجد أثر نقدي محدد بعد",
  },
  supplier_pays_intermediary: {
    label: "المورد يرسل أموالاً",
    shortLabel: "المورد يرسل",
    customerDirection: "intermediary_pays_customer",
    fulfillmentMessage: "سيظهر مبلغ مستحق لنا على المورد حتى تتم التسوية النقدية.",
    settlementMessage: "سيتم إضافة مبلغ التسوية إلى الصندوق المختار.",
    cashImpact: "يزيد رصيد الصندوق عند تسوية المورد",
  },
  intermediary_pays_supplier: {
    label: "نحن ندفع للمورد",
    shortLabel: "ندفع للمورد",
    customerDirection: "customer_pays_intermediary",
    fulfillmentMessage: "سيظهر مستحق علينا للمورد حتى تتم التسوية النقدية.",
    settlementMessage: "سيتم خصم مبلغ التسوية من الصندوق المختار.",
    cashImpact: "ينقص رصيد الصندوق عند تسوية المورد",
  },
};

export const SUPPLIER_DIRECTION_OPTIONS = [
  {
    value: "supplier_pays_intermediary",
    label: "المورد يرسل لنا",
    description: "المورد يدفع أولاً، ثم يستلم العميل من الصندوق",
  },
  {
    value: "intermediary_pays_supplier",
    label: "نحن ندفع للمورد",
    description: "العميل يدفع لنا، ثم نسدد المورد من الصندوق",
  },
];

export const COMMISSION_PAYER_OPTIONS = [
  {
    value: "customer",
    label: "العميل",
    description: "تُخصم العمولة من صافي العميل",
  },
  {
    value: "supplier",
    label: "المورد",
    description: "تُسجل العمولة كمستحق لنا على المورد",
  },
  {
    value: "both",
    label: "الطرفان",
    description: "تُوزع العمولة بين العميل والمورد",
  },
];

export const COMMISSION_PAYER_LABELS = {
  customer: "العميل",
  supplier: "المورد",
  both: "الطرفان",
};

export const CUSTOMER_SETTLEMENT_STATUS_META = {
  pending: { label: "لم يتم التسديد", color: "amber" },
  completed: { label: "تم التسديد", color: "emerald" },
};

export const SUPPLIER_FULFILLMENT_STATUS_META = {
  pending: { label: "لم ينفذ المورد العملية", shortLabel: "لم ينفذ", color: "amber" },
  completed: { label: "نفذ المورد العملية", shortLabel: "نفذ العملية", color: "emerald" },
};

export const SUPPLIER_SETTLEMENT_STATUS_META = {
  unsettled: { label: "غير مسدد", color: "rose" },
  partially_settled: { label: "مسدد جزئياً", color: "amber" },
  settled: { label: "تمت التسوية", color: "emerald" },
};

export const OBLIGATION_TYPE_META = {
  receivable: { label: "مستحق لنا", title: "المبالغ المستحقة لنا", color: "emerald" },
  payable: { label: "مستحق علينا", title: "المبالغ المستحقة علينا", color: "rose" },
};

export const COUNTERPARTY_ROLE_LABELS = {
  customer: "عميل",
  supplier: "مورد",
};

export const OBLIGATION_REASON_LABELS = {
  customer_principal: "أصل مبلغ العميل",
  supplier_principal: "أصل مبلغ المورد",
  supplier_settlement: "تسوية المورد",
  customer_refund: "استرداد العميل",
  supplier_refund: "استرداد المورد",
  commission: "عمولة",
};

export const OBLIGATION_STATUS_LABELS = {
  open: "مفتوح",
  partially_settled: "مسدد جزئياً",
  settled: "مسدد",
  cancelled: "ملغى",
};

export const SETTLEMENT_DIRECTION_LABELS = {
  cash_in: "دخول نقدي",
  cash_out: "خروج نقدي",
};

export function getOperationStatusMeta(status) {
  return OPERATION_STATUS_META[status] || OPERATION_STATUS_META.pending;
}

export function getCustomerDirectionMeta(direction) {
  return CUSTOMER_DIRECTIONS[direction] || CUSTOMER_DIRECTIONS.unspecified;
}

export function getCustomerSettlementMeta(status, direction) {
  const directionMeta = getCustomerDirectionMeta(direction);

  if (status === "completed") {
    return {
      ...(CUSTOMER_SETTLEMENT_STATUS_META.completed),
      label: directionMeta.completedLabel,
      fullLabel: directionMeta.completedMessage,
    };
  }

  return {
    ...(CUSTOMER_SETTLEMENT_STATUS_META.pending),
    label: directionMeta.pendingLabel,
    fullLabel: directionMeta.pendingMessage,
  };
}

export function getSupplierDirectionMeta(direction) {
  return SUPPLIER_DIRECTIONS[direction] || SUPPLIER_DIRECTIONS.unspecified;
}

export function getCommissionPayerMeta(payer) {
  return COMMISSION_PAYER_OPTIONS.find((option) => option.value === payer) || COMMISSION_PAYER_OPTIONS[0];
}

export function getSupplierDirection(operation) {
  return operation?.supplier_direction || "unspecified";
}

export function getSupplierFulfillmentMeta(status) {
  return SUPPLIER_FULFILLMENT_STATUS_META[status] || SUPPLIER_FULFILLMENT_STATUS_META.pending;
}

export function getSupplierSettlementMeta(status) {
  return SUPPLIER_SETTLEMENT_STATUS_META[status] || SUPPLIER_SETTLEMENT_STATUS_META.unsettled;
}

export function getObligationTypeMeta(type) {
  return OBLIGATION_TYPE_META[type] || OBLIGATION_TYPE_META.receivable;
}

export function moneyWithCurrency(amount, currency = "USD") {
  return `${formatMoney(amount || 0)} ${currency || "USD"}`;
}

export function getOperationDirection(operation) {
  if (operation?.customer_direction) return operation.customer_direction;

  return getSupplierDirectionMeta(operation?.supplier_direction).customerDirection || "unspecified";
}

export function describePendingReasons(operation) {
  const reasons = [];
  const direction = getOperationDirection(operation);

  if (operation?.customer_settlement_status === "completed") {
    reasons.push(getCustomerDirectionMeta(direction).completedMessage);
  } else {
    reasons.push(getCustomerDirectionMeta(direction).pendingMessage);
  }

  if (operation?.supplier_id || operation?.supplier) {
    if (operation?.supplier_fulfillment_status === "completed") {
      reasons.push("تم تنفيذ العملية بواسطة المورد");
    } else {
      reasons.push("بانتظار تنفيذ المورد للعملية");
    }

    if (
      operation?.supplier_fulfillment_status === "completed" &&
      operation?.supplier_settlement_status !== "settled"
    ) {
      reasons.push("توجد تسوية مستحقة للمورد");
    }
  }

  summarizeObligations(operation).forEach((item) => {
    if (Number(item.remaining || 0) > 0) {
      reasons.push(
        `${item.type === "receivable" ? "يوجد مبلغ مستحق لنا على" : "يوجد مبلغ مستحق علينا لـ"} ${item.roleLabel}: ${moneyWithCurrency(item.remaining, item.currency)}`
      );
    }
  });

  return Array.from(new Set(reasons));
}

export function summarizeObligations(operation) {
  const obligations = Array.isArray(operation?.obligations) ? operation.obligations : [];

  return obligations.map((obligation) => ({
    id: obligation.id,
    type: obligation.type,
    role: obligation.counterparty_role,
    roleLabel: COUNTERPARTY_ROLE_LABELS[obligation.counterparty_role] || "طرف",
    reason: obligation.reason,
    reasonLabel: OBLIGATION_REASON_LABELS[obligation.reason] || obligation.reason || "—",
    amount: Number(obligation.amount || 0),
    settled: Number(obligation.settled_amount || 0),
    remaining: Number(obligation.balance_amount || 0),
    currency: obligation.currency || "USD",
    status: obligation.status,
  }));
}

export function summarizeObligationsByType(operation, type) {
  const groups = new Map();

  summarizeObligations(operation)
    .filter((item) => item.type === type && Number(item.remaining || 0) > 0)
    .forEach((item) => {
      const key = `${item.role}|${item.currency}`;
      const current = groups.get(key) || {
        type,
        role: item.role,
        roleLabel: item.roleLabel,
        currency: item.currency,
        remaining: 0,
      };

      current.remaining += item.remaining;
      groups.set(key, current);
    });

  return Array.from(groups.values());
}

export function supplierSettlementTotals(operation) {
  const supplierObligations = summarizeObligations(operation).filter((item) => item.role === "supplier");
  const fallbackAmount = Number(operation?.supplier_amount || 0);
  const fallbackCurrency = operation?.supplier_currency || operation?.customer_currency || "USD";
  const fallbackDirection = getSupplierDirection(operation);
  const fallbackType = fallbackDirection === "supplier_pays_intermediary" ? "receivable" : "payable";

  if (supplierObligations.length === 0) {
    return {
      original: fallbackAmount,
      settled: 0,
      remaining: fallbackAmount,
      currency: fallbackCurrency,
      obligationId: null,
      type: fallbackType,
      settlementDirection: fallbackType === "receivable" ? "cash_in" : "cash_out",
    };
  }

  const first = supplierObligations[0];

  return {
    original: supplierObligations.reduce((sum, item) => sum + item.amount, 0),
    settled: supplierObligations.reduce((sum, item) => sum + item.settled, 0),
    remaining: supplierObligations.reduce((sum, item) => sum + item.remaining, 0),
    currency: first.currency,
    obligationId: first.id,
    type: first.type,
    settlementDirection: first.type === "receivable" ? "cash_in" : "cash_out",
  };
}

export function getWorkflowActionHints(operation) {
  const hints = [];

  if (operation?.customer_settlement_status !== "completed") {
    hints.push({ key: "customer-settlement", label: "تسجيل تسوية العميل", icon: ReceiptText });
  }

  if ((operation?.supplier_id || operation?.supplier) && operation?.supplier_fulfillment_status !== "completed") {
    hints.push({ key: "supplier-fulfillment", label: "تسجيل تنفيذ المورد", icon: CheckCheck });
  }

  if (
    (operation?.supplier_id || operation?.supplier) &&
    operation?.supplier_fulfillment_status === "completed" &&
    operation?.supplier_settlement_status !== "settled"
  ) {
    hints.push({ key: "supplier-settlement", label: "تسجيل تسوية المورد", icon: Building2 });
  }

  if (operation?.status === "pending") {
    hints.push({ key: "pending", label: "العملية لا تزال معلقة", icon: Clock3 });
  }

  return hints;
}
