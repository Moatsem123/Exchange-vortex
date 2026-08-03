/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  BarChart3,
  Boxes,
  Calendar,
  Database,
  DollarSign,
  Download,
  FileText,
  Layers3,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import { useToast } from "../shared/Toast";
import reportsService from "../services/reports";
import { extractApiError, formatCompactNumber, formatMoney } from "../shared/helpers";
import { getBoxTypeLabel } from "../shared/boxTypes";

const REPORT_TYPES = [
  {
    key: "operationsWorkflow",
    group: "movement",
    label: "تقرير سير العمليات",
    subtitle: "حالات العميل والمورد والتسويات",
    icon: Activity,
    mode: "range",
    exportType: "operations-workflow",
    exportable: true,
    apiMethod: "operationsWorkflow",
  },
  {
    key: "operations",
    group: "movement",
    label: "تقرير العمليات",
    subtitle: "كل العمليات حسب الفترة",
    icon: Activity,
    mode: "range",
    exportType: "operations",
    exportable: true,
  },
  {
    key: "pending",
    group: "movement",
    label: "العمليات المعلقة",
    subtitle: "العمليات التي لم تكتمل بعد",
    icon: Loader2,
    mode: "range",
    exportType: "pending",
    exportable: true,
  },
  {
    key: "cancelled",
    group: "movement",
    label: "العمليات الملغاة",
    subtitle: "العمليات التي تم إلغاؤها",
    icon: XCircle,
    mode: "range",
    exportType: "cancelled",
    exportable: true,
  },
  {
    key: "commissions",
    group: "profits",
    label: "تقرير العمولات",
    subtitle: "عمولات العمليات حسب الفترة",
    icon: ReceiptText,
    mode: "range",
    exportType: "commissions",
    exportable: true,
  },
  {
    key: "profitSummary",
    group: "profits",
    label: "ملخص الأرباح",
    subtitle: "الربح المحقق والعمولات المعلقة",
    icon: DollarSign,
    mode: "range",
    exportType: null,
    exportable: false,
  },
  {
    key: "suppliers",
    group: "parties",
    label: "تقرير الموردين",
    subtitle: "تحليل الموردين حسب العمليات",
    icon: UserRound,
    mode: "range",
    exportType: "suppliers",
    exportable: true,
  },
  {
    key: "customers",
    group: "parties",
    label: "تقرير العملاء",
    subtitle: "تحليل العملاء حسب العمليات",
    icon: Users,
    mode: "range",
    exportType: null,
    exportable: false,
  },
  {
    key: "boxes",
    group: "finance",
    label: "تقرير الصناديق",
    subtitle: "أرصدة الصناديق وحركتها الفعلية حسب ما يرجعه الخادم",
    icon: Boxes,
    mode: "range",
    exportType: "boxes",
    exportable: true,
    apiMethod: "boxes",
  },
  {
    key: "receivablesReport",
    group: "finance",
    label: "المبالغ المستحقة لنا",
    subtitle: "ذمم العملاء والموردين لصالح الشركة",
    icon: Wallet,
    mode: "range",
    exportType: "obligations",
    exportable: true,
    apiMethod: "obligations",
    fixedParams: { obligation_type: "receivable" },
  },
  {
    key: "payablesReport",
    group: "finance",
    label: "المبالغ المستحقة علينا",
    subtitle: "ذمم الموردين والعملاء على الشركة",
    icon: ArrowDown,
    mode: "range",
    exportType: "obligations",
    exportable: true,
    apiMethod: "obligations",
    fixedParams: { obligation_type: "payable" },
  },
  {
    key: "dashboardSummary",
    group: "finance",
    label: "ملخص الداشبورد",
    subtitle: "رأس المال والصناديق وملخص العمليات",
    icon: Database,
    mode: "range",
    exportType: null,
    exportable: false,
  },
];

const REPORT_GROUPS = [
  {
    key: "movement",
    label: "تقارير العمليات",
    subtitle: "العمليات، المعلقة، والملغاة",
    icon: BarChart3,
  },
  {
    key: "profits",
    label: "تقارير الأرباح",
    subtitle: "العمولات وملخص الأرباح",
    icon: TrendingUp,
  },
  {
    key: "parties",
    label: "العملاء والموردون",
    subtitle: "تقارير العملاء والموردين",
    icon: Users,
  },
  {
    key: "finance",
    label: "تقارير مالية",
    subtitle: "الصناديق، الذمم، وملخص الداشبورد",
    icon: Wallet,
  },
];

const READY_STATUSES = [
  "ready",
  "completed",
  "complete",
  "done",
  "success",
  "finished",
  "processed",
  "generated",
  "available",
];

const WORKING_STATUSES = [
  "queued",
  "queue",
  "pending",
  "processing",
  "running",
  "in_progress",
  "started",
];

const FAIL_STATUSES = [
  "failed",
  "fail",
  "error",
  "cancelled",
  "canceled",
  "expired",
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDefaultDateFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function unwrapPayload(res) {
  const response = res?.data || res || {};
  return response?.data || response || {};
}

function unwrapOperationsList(res) {
  const payload = unwrapPayload(res);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.operations)) return payload.operations;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function unwrapBoxesList(res) {
  const payload = unwrapPayload(res);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.boxes)) return payload.boxes;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function getExportId(res) {
  return reportsService.getExportJobId(res);
}

function isMoneyKey(key = "") {
  const lowered = String(key).toLowerCase();

  return (
    lowered.includes("amount") ||
    lowered.includes("balance") ||
    lowered.includes("profit") ||
    lowered.includes("expense") ||
    lowered.includes("total") ||
    lowered.includes("net") ||
    lowered.includes("receive") ||
    lowered.includes("sent") ||
    lowered.includes("send") ||
    lowered.includes("commission") ||
    lowered.includes("capital") ||
    lowered.includes("worth") ||
    lowered.includes("incoming") ||
    lowered.includes("outgoing") ||
    lowered.includes("payable") ||
    lowered.includes("receivable") ||
    lowered.includes("remaining") ||
    lowered.includes("settled")
  );
}

function getOperationDate(operation) {
  return String(
    operation?.transaction_date ||
      operation?.created_at ||
      operation?.date ||
      ""
  ).slice(0, 10);
}

function isBetweenDates(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function getEntityName(entity, fallback = "—") {
  if (!entity) return fallback;
  if (typeof entity === "object") return entity?.name || entity?.title || entity?.label || fallback;
  return entity;
}

function getTransferAmount(operation) {
  return toNumber(
    operation?.amount ??
      operation?.total_transferred_amount ??
      operation?.transferred_amount ??
      operation?.supplier_amount ??
      operation?.customer_amount ??
      0
  );
}

function getCustomerAmount(operation) {
  return toNumber(operation?.customer_amount ?? operation?.amount ?? operation?.transferred_amount ?? 0);
}

function getSupplierAmount(operation) {
  return toNumber(operation?.supplier_amount ?? operation?.amount ?? operation?.transferred_amount ?? 0);
}

function getCommissionAmount(operation) {
  return toNumber(operation?.commission ?? operation?.commission_amount ?? 0);
}

function normalizeOperationRow(operation) {
  const transferAmount = getTransferAmount(operation);
  const supplierAmount = getSupplierAmount(operation);
  const customerAmount = getCustomerAmount(operation);
  const commission = getCommissionAmount(operation);
  const customerCommission = toNumber(operation?.customer_commission_amount ?? commission);
  const supplierCommission = toNumber(operation?.supplier_commission_amount ?? 0);
  const customerNet = toNumber(operation?.customer_net_amount ?? customerAmount - customerCommission);

  return {
    id: operation?.id,
    reference_number: operation?.reference_number || `#${operation?.id || "—"}`,
    transaction_date: getOperationDate(operation),
    supplier: getEntityName(operation?.supplier, operation?.supplier_name || "—"),
    customer: getEntityName(operation?.customer, operation?.customer_name || "—"),
    box: getEntityName(operation?.box, operation?.box_name || "—"),
    status: operation?.status || "—",
    amount: transferAmount,
    supplier_amount: supplierAmount,
    customer_amount: customerAmount,
    customer_net_amount: customerNet,
    commission,
    commission_amount: commission,
    commission_payer: operation?.commission_payer || "customer",
    customer_commission_amount: customerCommission,
    supplier_commission_amount: supplierCommission,
    commission_type: operation?.commission_type || "—",
    commission_rate: operation?.commission_rate ?? "—",
    created_at: operation?.created_at,
    completed_at: operation?.completed_at,
    cancelled_at: operation?.cancelled_at,
    cancellation_reason: operation?.cancellation_reason,
  };
}

function statusIs(row, status) {
  return String(row?.status || "").toLowerCase() === status;
}

function isCancelled(row) {
  return statusIs(row, "cancelled") || statusIs(row, "canceled");
}

function aggregateRows(rows) {
  const completedRows = rows.filter((row) => statusIs(row, "completed"));
  const pendingRows = rows.filter((row) => statusIs(row, "pending"));
  const cancelledRows = rows.filter((row) => isCancelled(row));

  const totalAmount = rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const supplierAmount = rows.reduce((sum, row) => sum + toNumber(row.supplier_amount), 0);
  const customerAmount = rows.reduce((sum, row) => sum + toNumber(row.customer_amount), 0);
  const customerNet = rows.reduce((sum, row) => sum + toNumber(row.customer_net_amount), 0);
  const commission = rows.reduce((sum, row) => sum + toNumber(row.commission), 0);

  return {
    total_operations: rows.length,
    completed: completedRows.length,
    pending: pendingRows.length,
    cancelled: cancelledRows.length,

    total_transferred_amount: totalAmount,
    total_supplier_amount: supplierAmount,
    total_customer_amount: customerAmount,
    total_customer_net_amount: customerNet,
    total_commission: commission,

    completed_amount: completedRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
    pending_amount: pendingRows.reduce((sum, row) => sum + toNumber(row.amount), 0),
    cancelled_amount: cancelledRows.reduce((sum, row) => sum + toNumber(row.amount), 0),

    completed_commission: completedRows.reduce((sum, row) => sum + toNumber(row.commission), 0),
    pending_commission: pendingRows.reduce((sum, row) => sum + toNumber(row.commission), 0),
    cancelled_commission: cancelledRows.reduce((sum, row) => sum + toNumber(row.commission), 0),
  };
}

function groupByKey(rows, getKey, makeRow) {
  const map = new Map();

  rows.forEach((row) => {
    const key = getKey(row);
    if (!key || key === "—") return;

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });

  return Array.from(map.entries()).map(([key, items]) => makeRow(key, items));
}

function normalizeBoxRow(box, operationRows = []) {
  const boxName = getEntityName(box, box?.name || "—");
  const relatedRows = operationRows.filter((row) => row.box === boxName);
  const totals = aggregateRows(relatedRows);

  return {
    box_id: box?.id || box?.box_id,
    box: boxName,
    type: box?.type || "—",
    current_balance: toNumber(box?.current_balance ?? box?.balance ?? 0),
    operations_count: relatedRows.length,
    incoming_amount: totals.total_customer_amount,
    outgoing_amount: totals.total_supplier_amount,
    last_operation:
      box?.last_activity_date ||
      [...relatedRows].sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)))?.[0]?.transaction_date ||
      null,
  };
}

function buildOperationsPayload(report, allOperations, financial, boxes, params) {
  const allRows = allOperations
    .map(normalizeOperationRow)
    .filter((row) => isBetweenDates(row.transaction_date, params.date_from, params.date_to));

  const pendingRows = allRows.filter((row) => statusIs(row, "pending"));
  const cancelledRows = allRows.filter((row) => isCancelled(row));

  if (report.key === "pending") {
    const totals = aggregateRows(pendingRows);

    return {
      type: "pending",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      operations: pendingRows,
      ...totals,
      meta: {
        total: pendingRows.length,
        count: pendingRows.length,
      },
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "cancelled") {
    const totals = aggregateRows(cancelledRows);

    return {
      type: "cancelled",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      operations: cancelledRows,
      ...totals,
      meta: {
        total: cancelledRows.length,
        count: cancelledRows.length,
      },
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "commissions") {
    const rowsWithCommission = allRows.filter((row) => toNumber(row.commission) > 0);
    const totals = aggregateRows(rowsWithCommission);

    return {
      type: "commissions",
      title: report.label,
      currency: "USD",
      period: "custom",
      date_from: params.date_from,
      date_to: params.date_to,
      operations: rowsWithCommission,
      total_commission: totals.total_commission,
      completed_commission: totals.completed_commission,
      pending_commission: totals.pending_commission,
      cancelled_commission: totals.cancelled_commission,
      average_commission: rowsWithCommission.length ? totals.total_commission / rowsWithCommission.length : 0,
      operation_count: rowsWithCommission.length,
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "profitSummary") {
    const totals = aggregateRows(allRows);

    return {
      type: "profit-summary",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      rows: [
        {
          total_operations: totals.total_operations,
          completed_operations: totals.completed,
          pending_operations: totals.pending,
          cancelled_operations: totals.cancelled,
          realized_profit_usd: totals.completed_commission,
          pending_commission: totals.pending_commission,
          cancelled_commission: totals.cancelled_commission,
          total_commission: totals.total_commission,
          total_transferred_amount: totals.total_transferred_amount,
        },
      ],
      total_operations: totals.total_operations,
      total_profit: totals.completed_commission,
      total_profit_usd: totals.completed_commission,
      pending_commission: totals.pending_commission,
      cancelled_commission: totals.cancelled_commission,
      total_commission: totals.total_commission,
      completed_operations: totals.completed,
      pending_operations: totals.pending,
      cancelled_operations: totals.cancelled,
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "suppliers") {
    const rows = groupByKey(
      allRows,
      (row) => row.supplier,
      (supplier, items) => {
        const totals = aggregateRows(items);

        return {
          supplier,
          operation_count: items.length,
          completed_count: totals.completed,
          pending_count: totals.pending,
          cancelled_count: totals.cancelled,
          transferred_amount: totals.total_transferred_amount,
          supplier_amount: totals.total_supplier_amount,
          total_commissions: totals.total_commission,
        };
      }
    );

    return {
      type: "suppliers",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      rows,
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "customers") {
    const rows = groupByKey(
      allRows,
      (row) => row.customer,
      (customer, items) => {
        const totals = aggregateRows(items);
        const sorted = [...items].sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)));

        return {
          customer,
          operation_count: items.length,
          total_received_amount: totals.total_customer_net_amount,
          total_sent_amount: totals.total_customer_amount,
          total_commissions: totals.total_commission,
          last_operation: sorted[0]?.transaction_date || null,
        };
      }
    );

    return {
      type: "customers",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      rows,
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "boxes") {
    const boxRows = boxes.map((box) => normalizeBoxRow(box, allRows));
    const totalBoxesBalance = boxRows.reduce((sum, box) => sum + toNumber(box.current_balance), 0);
    const operationsCount = boxRows.reduce((sum, box) => sum + toNumber(box.operations_count), 0);
    const incoming = boxRows.reduce((sum, box) => sum + toNumber(box.incoming_amount), 0);
    const outgoing = boxRows.reduce((sum, box) => sum + toNumber(box.outgoing_amount), 0);

    return {
      type: "boxes",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      rows: boxRows,
      boxes_count: boxRows.length,
      total_boxes_balance: totalBoxesBalance,
      operations_count: operationsCount,
      incoming_amount: incoming,
      outgoing_amount: outgoing,
      generated_at: new Date().toISOString(),
    };
  }

  if (report.key === "dashboardSummary") {
    const totals = aggregateRows(allRows);
    const totalBoxesBalance =
      toNumber(financial?.total_boxes_balance) ||
      boxes.reduce((sum, box) => sum + toNumber(box.current_balance ?? box.balance), 0);

    return {
      type: "dashboardSummary",
      title: report.label,
      date_from: params.date_from,
      date_to: params.date_to,
      rows: [
        {
          capital_balance: toNumber(financial?.capital_balance),
          free_capital: toNumber(financial?.free_capital),
          total_boxes_balance: totalBoxesBalance,
          total_operations: totals.total_operations,
          completed_operations: totals.completed,
          pending_operations: totals.pending,
          cancelled_operations: totals.cancelled,
          total_commission: totals.total_commission,
          completed_commission: totals.completed_commission,
          pending_commission: totals.pending_commission,
          total_transferred_amount: totals.total_transferred_amount,
        },
      ],
      capital_balance: toNumber(financial?.capital_balance),
      free_capital: toNumber(financial?.free_capital),
      total_boxes_balance: totalBoxesBalance,
      total_operations: totals.total_operations,
      completed_operations: totals.completed,
      pending_operations: totals.pending,
      cancelled_operations: totals.cancelled,
      total_commission: totals.total_commission,
      completed_commission: totals.completed_commission,
      pending_commission: totals.pending_commission,
      total_transferred_amount: totals.total_transferred_amount,
      generated_at: new Date().toISOString(),
    };
  }

  const totals = aggregateRows(allRows);

  return {
    type: "operations",
    title: report.label,
    date_from: params.date_from,
    date_to: params.date_to,
    operations: allRows,
    ...totals,
    meta: {
      total: allRows.length,
      count: allRows.length,
    },
    generated_at: new Date().toISOString(),
  };
}

function getRowsFromPayload(payload = {}) {
  if (Array.isArray(payload)) return payload;

  const keys = [
    "operations",
    "obligations",
    "receivables",
    "payables",
    "rows",
    "items",
    "suppliers",
    "customers",
    "boxes",
    "commissions",
  ];

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}

function firstValue(payload = {}, keys = [], fallback = 0) {
  const totals = payload?.totals || {};
  const meta = payload?.meta || {};

  for (const key of keys) {
    const value = payload?.[key] ?? totals?.[key] ?? meta?.[key];

    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
}

function sumRows(payload = {}, keys = []) {
  const rows = getRowsFromPayload(payload);

  return rows.reduce((sum, row) => {
    for (const key of keys) {
      if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
        return sum + toNumber(row[key]);
      }
    }

    return sum;
  }, 0);
}

function rowsCount(payload = {}) {
  const rows = getRowsFromPayload(payload);

  return toNumber(
    firstValue(
      payload,
      ["total_operations", "operation_count", "operations_count", "count", "boxes_count"],
      payload?.meta?.total ?? payload?.meta?.count ?? rows.length
    )
  );
}

function labelOf(key) {
  const labels = {
    id: "الرقم",
    type: "النوع",
    title: "العنوان",
    period: "الفترة",
    currency: "العملة",
    date: "التاريخ",
    transaction_date: "تاريخ العملية",
    date_from: "من تاريخ",
    date_to: "إلى تاريخ",
    generated_at: "وقت الإنشاء",
    created_at: "تاريخ الإنشاء",
    updated_at: "تاريخ التحديث",
    completed_at: "تاريخ الإكمال",
    cancelled_at: "تاريخ الإلغاء",
    cancellation_reason: "سبب الإلغاء",

    reference_number: "الرقم المرجعي",
    status: "الحالة",
    supplier: "المورد",
    customer: "العميل",
    box: "الصندوق",
    party: "الطرف",
    party_name: "الطرف",
    counterparty: "الطرف",
    counterparty_role: "نوع الطرف",
    obligation_type: "نوع الذمة",
    reason: "سبب الذمة",
    operation: "العملية",

    amount: "المبلغ",
    original_amount: "المبلغ الأصلي",
    paid_amount: "المبلغ المدفوع",
    settled_amount: "المبلغ المسدد",
    remaining_amount: "المبلغ المتبقي",
    transferred_amount: "المبلغ المحول",
    total_transferred_amount: "إجمالي المبلغ",
    total_received_amount: "إجمالي المستلم",
    total_sent_amount: "إجمالي المرسل",
    supplier_amount: "مبلغ المورد",
    customer_amount: "مبلغ العميل",
    customer_net_amount: "صافي العميل",
    supplier_direction: "اتجاه المورد",
    customer_direction: "اتجاه العميل",
    customer_settlement_status: "حالة تسوية العميل",
    supplier_fulfillment_status: "حالة تنفيذ المورد",
    supplier_settlement_status: "حالة تسوية المورد",
    customer_settled_at: "تاريخ تسوية العميل",
    supplier_fulfilled_at: "تاريخ تنفيذ المورد",
    supplier_settled_at: "تاريخ تسوية المورد",

    commission: "العمولة",
    commission_amount: "العمولة",
    commission_payer: "طرف دفع العمولة",
    customer_commission_amount: "عمولة العميل",
    supplier_commission_amount: "عمولة المورد",
    total_commission: "إجمالي العمولات",
    total_commissions: "إجمالي العمولات",
    completed_commission: "عمولات مكتملة",
    pending_commission: "عمولات معلقة",
    cancelled_commission: "عمولات ملغاة",
    average_commission: "متوسط العمولة",

    operation_count: "عدد العمليات",
    operations_count: "عدد العمليات",
    total_operations: "إجمالي العمليات",
    completed: "مكتملة",
    completed_count: "مكتملة",
    completed_operations: "عمليات مكتملة",
    pending: "معلقة",
    pending_count: "معلقة",
    pending_operations: "عمليات معلقة",
    unsettled: "غير مسدد",
    partially_settled: "مسدد جزئياً",
    settled: "تمت التسوية",
    cancelled: "ملغاة",
    cancelled_count: "ملغاة",
    cancelled_operations: "عمليات ملغاة",

    current_balance: "الرصيد الحالي",
    total_boxes_balance: "إجمالي أرصدة الصناديق",
    boxes_total_balance: "إجمالي أرصدة الصناديق",
    capital_balance: "إجمالي رأس المال",
    free_capital: "الرصيد العام لرأس المال",
    box_type: "نوع الصندوق",
    incoming_amount: "الداخل",
    outgoing_amount: "الخارج",
    last_operation: "آخر عملية",
    realized_profit_usd: "الربح المحقق",
    total_profit_usd: "الربح المحقق",
  };

  return labels[key] || String(key).replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value) {
  const statuses = {
    pending: "معلقة",
    completed: "مكتملة",
    cancelled: "ملغاة",
    canceled: "ملغاة",
    unsettled: "غير مسدد",
    partially_settled: "مسدد جزئياً",
    settled: "تمت التسوية",
    customer_pays_intermediary: "العميل يرسل أموالاً",
    intermediary_pays_customer: "العميل يستلم أموالاً",
    supplier_pays_intermediary: "المورد يرسل أموالاً",
    intermediary_pays_supplier: "نحن ندفع للمورد",
    receivable: "مستحق لنا",
    payable: "مستحق علينا",
    customer: "عميل",
    supplier: "مورد",
    both: "الطرفان",
    box: "صندوق",
    turkish: getBoxTypeLabel("turkish"),
    local_bank_wallet: getBoxTypeLabel("local_bank_wallet"),
    usdt_wallet: getBoxTypeLabel("usdt_wallet"),
    customer_debt: "العميل مدين لنا",
    supplier_debt: "المورد مدين لنا",
    supplier_payable: "مستحق للمورد",
    customer_payable: "مستحق للعميل",
    ready: "جاهز",
    queued: "بالانتظار",
    processing: "قيد المعالجة",
    failed: "فشل",
  };

  return statuses[value] || value;
}

function formatCell(value, key = "") {
  if (value === null || value === undefined || value === "") return "—";

  if (
    key === "status" ||
    key.includes("_status") ||
    key === "customer_direction" ||
    key === "supplier_direction" ||
    key === "commission_payer" ||
    key === "obligation_type" ||
    key === "reason" ||
    key === "counterparty_role" ||
    key === "type"
  ) {
    return formatStatus(String(value));
  }
  if (key.includes("_at")) return formatDateTime(value);
  if (key.includes("date") || key === "last_operation") return formatDate(value);

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (typeof value === "number") {
    if (isMoneyKey(key)) return formatMoney(value);
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (Number.isFinite(numeric) && value.trim() !== "" && isMoneyKey(key)) {
      return formatMoney(numeric);
    }

    return value;
  }

  if (typeof value === "object") {
    return value?.name || value?.label || value?.title || value?.email || "—";
  }

  return String(value);
}

function getModeLabel(mode) {
  const labels = {
    range: "فلتر فترة",
    none: "بدون فلتر",
  };

  return labels[mode] || mode;
}

function getTableSections(payload) {
  const sections = [
    ["operations", "العمليات"],
    ["obligations", "الذمم"],
    ["receivables", "المبالغ المستحقة لنا"],
    ["payables", "المبالغ المستحقة علينا"],
    ["rows", "السجلات"],
    ["items", "العناصر"],
    ["suppliers", "الموردون"],
    ["customers", "العملاء"],
    ["boxes", "الصناديق"],
    ["commissions", "العمولات"],
    ["currency_totals", "الإجماليات حسب العملة"],
    ["status_totals", "الإجماليات حسب الحالة"],
  ];

  return sections
    .map(([key, title]) => ({
      key,
      title,
      rows: Array.isArray(payload?.[key]) ? payload[key] : [],
    }))
    .filter((section) => section.rows.length > 0);
}

function getColumns(rows = []) {
  const keys = [];

  rows.slice(0, 10).forEach((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;

    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
  });

  const priority = [
    "reference_number",
    "transaction_date",
    "created_at",
    "supplier",
    "customer",
    "box",
    "type",
    "status",
    "amount",
    "supplier_amount",
    "customer_amount",
    "customer_net_amount",
    "commission",
    "commission_amount",
    "commission_payer",
    "customer_commission_amount",
    "supplier_commission_amount",
    "commission_type",
    "commission_rate",
    "operation_count",
    "operations_count",
    "total_operations",
    "completed",
    "completed_count",
    "completed_operations",
    "pending",
    "pending_count",
    "pending_operations",
    "cancelled",
    "cancelled_count",
    "cancelled_operations",
    "transferred_amount",
    "total_received_amount",
    "total_sent_amount",
    "total_commissions",
    "current_balance",
    "incoming_amount",
    "outgoing_amount",
    "last_operation",
    "cancelled_at",
    "cancellation_reason",
    "id",
  ];

  return keys
    .sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);

      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    })
    .slice(0, 12);
}

function makeCard(title, value, icon, color, kind = "money", note = "") {
  return { title, value, icon, color, kind, note };
}

function buildCards(reportKey, payload = {}) {
  if (reportKey === "operationsWorkflow") {
    return [
      makeCard("إجمالي العمليات", firstValue(payload, ["total_operations", "operation_count"], rowsCount(payload)), Activity, "blue", "count"),
      makeCard("معلقة", firstValue(payload, ["pending", "pending_count", "pending_operations"], 0), Loader2, "amber", "count"),
      makeCard("مكتملة", firstValue(payload, ["completed", "completed_count", "completed_operations"], 0), Activity, "emerald", "count"),
      makeCard("عمولات", firstValue(payload, ["total_commission", "total_commissions"], sumRows(payload, ["commission_amount", "commission"])), ReceiptText, "violet"),
    ];
  }

  if (reportKey === "receivablesReport" || reportKey === "payablesReport") {
    const isReceivable = reportKey === "receivablesReport";

    return [
      makeCard(isReceivable ? "مستحق لنا" : "مستحق علينا", firstValue(payload, ["total_amount", "amount"], sumRows(payload, ["amount", "original_amount"])), Wallet, isReceivable ? "emerald" : "rose"),
      makeCard("تم تسديده", firstValue(payload, ["paid_amount", "settled_amount"], sumRows(payload, ["paid_amount", "settled_amount"])), ReceiptText, "blue"),
      makeCard("المتبقي", firstValue(payload, ["remaining_amount"], sumRows(payload, ["remaining_amount"])), DollarSign, "amber"),
      makeCard("عدد السجلات", rowsCount(payload), Activity, "violet", "count"),
    ];
  }

  if (reportKey === "operations") {
    return [
      makeCard("إجمالي العمليات", firstValue(payload, ["total_operations"], 0), Activity, "blue", "count"),
      makeCard("قيمة العمليات", firstValue(payload, ["total_transferred_amount"], 0), DollarSign, "emerald"),
      makeCard("مكتملة", firstValue(payload, ["completed"], 0), Activity, "violet", "count"),
      makeCard("معلقة", firstValue(payload, ["pending"], 0), Loader2, "amber", "count"),
    ];
  }

  if (reportKey === "pending") {
    return [
      makeCard("عمليات معلقة", firstValue(payload, ["total_operations"], 0), Loader2, "amber", "count"),
      makeCard("قيمة المعلق", firstValue(payload, ["total_transferred_amount", "pending_amount"], 0), DollarSign, "rose"),
      makeCard("عمولات معلقة", firstValue(payload, ["total_commission", "pending_commission"], 0), ReceiptText, "violet"),
      makeCard("عدد السجلات", payload?.meta?.count ?? getRowsFromPayload(payload).length, Activity, "blue", "count"),
    ];
  }

  if (reportKey === "cancelled") {
    return [
      makeCard("عمليات ملغاة", firstValue(payload, ["total_operations"], 0), XCircle, "rose", "count"),
      makeCard("قيمة الملغاة", firstValue(payload, ["total_transferred_amount", "cancelled_amount"], 0), DollarSign, "rose"),
      makeCard("عمولات ملغاة", firstValue(payload, ["total_commission", "cancelled_commission"], 0), ReceiptText, "violet"),
      makeCard("عدد السجلات", payload?.meta?.count ?? getRowsFromPayload(payload).length, Activity, "blue", "count"),
    ];
  }

  if (reportKey === "commissions") {
    return [
      makeCard("إجمالي العمولات", firstValue(payload, ["total_commission"], 0), DollarSign, "emerald"),
      makeCard("عمولات مكتملة", firstValue(payload, ["completed_commission"], 0), ReceiptText, "blue"),
      makeCard("عمولات معلقة", firstValue(payload, ["pending_commission"], 0), Loader2, "amber"),
      makeCard("عدد العمليات", firstValue(payload, ["operation_count"], 0), Activity, "violet", "count"),
    ];
  }

  if (reportKey === "profitSummary") {
    return [
      makeCard("الربح المحقق", firstValue(payload, ["total_profit_usd", "total_profit"], 0), DollarSign, "emerald"),
      makeCard("عمولات معلقة", firstValue(payload, ["pending_commission"], 0), ReceiptText, "amber"),
      makeCard("إجمالي العمليات", firstValue(payload, ["total_operations"], 0), Activity, "blue", "count"),
      makeCard("عمليات مكتملة", firstValue(payload, ["completed_operations"], 0), TrendingUp, "violet", "count"),
    ];
  }

  if (reportKey === "suppliers") {
    const rows = getRowsFromPayload(payload);

    return [
      makeCard("عدد الموردين", rows.length, UserRound, "violet", "count"),
      makeCard("إجمالي مبلغ الموردين", sumRows(payload, ["transferred_amount", "supplier_amount"]), ArrowDown, "rose"),
      makeCard("إجمالي العمولات", sumRows(payload, ["total_commissions"]), ReceiptText, "emerald"),
      makeCard("عدد العمليات", sumRows(payload, ["operation_count"]), Activity, "blue", "count"),
    ];
  }

  if (reportKey === "customers") {
    const rows = getRowsFromPayload(payload);

    return [
      makeCard("عدد العملاء", rows.length, Users, "violet", "count"),
      makeCard("إجمالي المستلم", sumRows(payload, ["total_received_amount"]), DollarSign, "emerald"),
      makeCard("إجمالي المرسل", sumRows(payload, ["total_sent_amount"]), ArrowDown, "rose"),
      makeCard("عدد العمليات", sumRows(payload, ["operation_count"]), Activity, "blue", "count"),
    ];
  }

  if (reportKey === "boxes") {
    return [
      makeCard("عدد الصناديق", firstValue(payload, ["boxes_count"], getRowsFromPayload(payload).length), Boxes, "violet", "count"),
      makeCard("إجمالي أرصدة الصناديق", firstValue(payload, ["total_boxes_balance", "boxes_total_balance"], sumRows(payload, ["current_balance"])), Wallet, "emerald"),
      makeCard("عدد عمليات الصناديق", firstValue(payload, ["operations_count"], 0), Activity, "blue", "count"),
      makeCard("إجمالي الخارج", firstValue(payload, ["outgoing_amount"], 0), ArrowDown, "rose"),
    ];
  }

  if (reportKey === "dashboardSummary") {
    return [
      makeCard("إجمالي رأس المال", firstValue(payload, ["capital_balance"], 0), Wallet, "emerald"),
      makeCard("إجمالي أرصدة الصناديق", firstValue(payload, ["total_boxes_balance"], 0), Boxes, "blue"),
      makeCard("إجمالي العمليات", firstValue(payload, ["total_operations"], 0), Activity, "violet", "count"),
      makeCard("إجمالي العمولات", firstValue(payload, ["total_commission"], 0), ReceiptText, "amber"),
    ];
  }

  return [
    makeCard("إجمالي", rowsCount(payload), Activity, "blue", "count"),
    makeCard("القيمة", firstValue(payload, ["amount", "total_amount", "net"], 0), DollarSign, "emerald"),
    makeCard("من تاريخ", payload.date_from || "—", Calendar, "violet", "text"),
    makeCard("إلى تاريخ", payload.date_to || "—", Calendar, "amber", "text"),
  ];
}

function getInfoItems(payload = {}) {
  const keys = ["title", "type", "currency", "period", "date_from", "date_to", "generated_at"];

  return keys
    .filter((key) => payload?.[key] !== undefined && payload?.[key] !== null && payload?.[key] !== "")
    .map((key) => ({
      key,
      label: labelOf(key),
      value: payload[key],
    }));
}

function displayCardValue(card) {
  if (card.kind === "money") return formatMoney(toNumber(card.value));
  if (card.kind === "count") return formatCompactNumber(toNumber(card.value));

  if (card.kind === "text") {
    if (String(card.title).includes("تاريخ")) return formatDate(card.value);
    return String(card.value || "—");
  }

  return String(card.value || 0);
}

export default function ReportsPage() {
  const toast = useToast();
  const today = getToday();
  const pollTimerRef = useRef(null);

  const [activeGroupKey, setActiveGroupKey] = useState("movement");
  const [activeReportKey, setActiveReportKey] = useState("operationsWorkflow");
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(today);

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportJob, setExportJob] = useState(null);
  const [error, setError] = useState(null);

  const activeReport = useMemo(
    () => REPORT_TYPES.find((item) => item.key === activeReportKey) || REPORT_TYPES[0],
    [activeReportKey]
  );

  const activeGroup = useMemo(
    () => REPORT_GROUPS.find((item) => item.key === activeGroupKey) || REPORT_GROUPS[0],
    [activeGroupKey]
  );

  const groupReports = useMemo(
    () => REPORT_TYPES.filter((item) => item.group === activeGroupKey),
    [activeGroupKey]
  );

  const cards = useMemo(() => buildCards(activeReportKey, payload || {}), [activeReportKey, payload]);
  const sections = useMemo(() => getTableSections(payload || {}), [payload]);
  const infoItems = useMemo(() => getInfoItems(payload || {}), [payload]);
  const ActiveIcon = activeReport.icon || FileText;
  const ActiveGroupIcon = activeGroup.icon || Layers3;

  function buildParams(report = activeReport) {
    const fixedParams = report.fixedParams || {};

    if (report.mode === "range") {
      return { date_from: dateFrom, date_to: dateTo, ...fixedParams };
    }

    return { ...fixedParams };
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = buildParams(activeReport);

      if (activeReport.apiMethod && typeof reportsService[activeReport.apiMethod] === "function") {
        const res = await reportsService[activeReport.apiMethod](params);
        const directPayload = unwrapPayload(res);

        setPayload({
          title: activeReport.label,
          date_from: params.date_from,
          date_to: params.date_to,
          ...directPayload,
        });
        return;
      }

      const [operationsRes, financialRes, boxesRes] = await Promise.all([
        reportsService.operationsRaw(),
        reportsService.dashboardFinancial().catch(() => ({ data: {} })),
        reportsService.dashboardBoxes().catch(() => ({ data: [] })),
      ]);

      const operations = unwrapOperationsList(operationsRes);
      const financial = unwrapPayload(financialRes);
      const boxes = unwrapBoxesList(boxesRes);

      const computedPayload = buildOperationsPayload(activeReport, operations, financial, boxes, params);

      setPayload(computedPayload);
    } catch (err) {
      setPayload(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [activeReportKey]);

  function handleGroupChange(groupKey) {
    const firstReport = REPORT_TYPES.find((item) => item.group === groupKey);

    setActiveGroupKey(groupKey);
    setActiveReportKey(firstReport?.key || "operations");
    setPayload(null);
    setError(null);
    setExportJob(null);
  }

  function handleReportChange(reportKey) {
    setActiveReportKey(reportKey);
    setPayload(null);
    setError(null);
    setExportJob(null);
  }

  function buildExportPayload() {
    return {
      type: activeReport.exportType,
      format: "pdf",
      params: buildParams(activeReport),
    };
  }

  async function handleExportPdf() {
    if (exporting) return;
    if (activeReport.exportable === false) return;

    setExporting(true);
    setExportJob(null);

    try {
      const res = await reportsService.queueExport(buildExportPayload());
      const jobId = getExportId(res);

      if (!jobId) {
        toast.error("لم يتم استلام رقم مهمة التصدير من الخادم");
        setExporting(false);
        return;
      }

      setExportJob({ id: jobId, status: "queued" });
      toast.info("جاري تجهيز التقرير...");
      pollExport(jobId, 0);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
    }
  }

  async function pollExport(jobId, attempts = 0) {
    if (attempts > 45) {
      toast.error("التصدير ما خلص. تأكد أن queue worker شغال في الباك");
      setExporting(false);
      setExportJob(null);
      return;
    }

    try {
      const res = await reportsService.exportStatus(jobId);
      const payload = unwrapPayload(res);

      const status = String(
        reportsService.getExportStatus(res) ||
          payload?.status ||
          payload?.state ||
          payload?.job_status ||
          payload?.export_status ||
          payload?.job?.status ||
          payload?.export?.status ||
          payload?.export_job?.status ||
          ""
      ).toLowerCase();

      setExportJob({ id: jobId, status });

      if (READY_STATUSES.includes(status)) {
        await downloadExport(jobId, res);
        return;
      }

      if (FAIL_STATUSES.includes(status)) {
        toast.error(payload?.message || "فشل تجهيز ملف التصدير");
        setExporting(false);
        setExportJob(null);
        return;
      }

      if (!status || WORKING_STATUSES.includes(status)) {
        pollTimerRef.current = setTimeout(() => {
          pollExport(jobId, attempts + 1);
        }, 2000);
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        pollExport(jobId, attempts + 1);
      }, 2000);
    } catch (err) {
      toast.error(extractApiError(err));
      setExporting(false);
      setExportJob(null);
    }
  }

  async function downloadExport(jobId, statusRes) {
    try {
      const file = await reportsService.exportDownload(jobId);
      const statusPayload = unwrapPayload(statusRes);

      const contentType =
        file?.headers?.["content-type"] ||
        file?.headers?.["Content-Type"] ||
        "application/pdf";

      const fileName =
        reportsService.getExportFileName(statusPayload, `${activeReport.key}-${Date.now()}.pdf`) ||
        `${activeReport.key}-${Date.now()}.pdf`;

      const blob = new Blob([file.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      toast.success("تم تحميل التقرير بنجاح");
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setExporting(false);
      setExportJob(null);
    }
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 pb-8" dir="rtl">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700 shadow-sm">
              <BarChart3 className="h-7 w-7" />
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                التقارير
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                الحسابات مبنية مباشرة على العمليات والداشبورد لضمان دقة الكروت والجداول
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {activeReport.exportable !== false && (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting || loading}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تجهيز التقرير...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    تصدير PDF
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {exportJob?.status && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-black text-slate-500">
            حالة التصدير: {exportJob.status}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_GROUPS.map((group) => {
          const Icon = group.icon || Layers3;
          const active = group.key === activeGroupKey;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => handleGroupChange(group.key)}
              className={`rounded-3xl border p-5 text-right transition ${
                active
                  ? "border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                  : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    active ? "border-white/20 bg-white/15 text-white" : "border-slate-200 bg-slate-50 text-teal-700"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black">{group.label}</p>
                  <p className={`mt-1 text-xs font-semibold ${active ? "text-teal-100" : "text-slate-400"}`}>
                    {group.subtitle}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
              <ActiveGroupIcon className="h-6 w-6" />
            </div>

            <div className="text-right">
              <h2 className="text-lg font-black text-slate-950">{activeGroup.label}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{activeGroup.subtitle}</p>
            </div>
          </div>

          <Badge color="teal">{groupReports.length} تقارير</Badge>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
          {groupReports.map((report) => {
            const Icon = report.icon || FileText;
            const active = report.key === activeReportKey;

            return (
              <button
                key={report.key}
                type="button"
                onClick={() => handleReportChange(report.key)}
                className={`rounded-2xl border p-4 text-right transition ${
                  active
                    ? "border-teal-400 bg-teal-50 text-teal-900 ring-2 ring-teal-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                      active ? "border-teal-200 bg-white text-teal-700" : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{report.label}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{report.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <main className="min-w-0 space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
                <ActiveIcon className="h-7 w-7" />
              </div>

              <div className="text-right">
                <h2 className="text-xl font-black text-slate-950">{activeReport.label}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{activeReport.subtitle}</p>
              </div>
            </div>

            <Badge color="teal">{getModeLabel(activeReport.mode)}</Badge>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <Field label="من تاريخ">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (dateTo < e.target.value) setDateTo(e.target.value);
                }}
                className="ep-input h-11 w-full min-w-[190px]"
              />
            </Field>

            <Field label="إلى تاريخ">
              <input
                type="date"
                min={dateFrom}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ep-input h-11 w-full min-w-[190px]"
              />
            </Field>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              عرض التقرير
            </button>
          </div>
        </section>

        {error && !loading ? (
          <ErrorState title="تعذّر تحميل التقرير" description={extractApiError(error)} onRetry={load} />
        ) : loading ? (
          <LoadingState />
        ) : !payload ? (
          <EmptyState icon={FileText} title="لا توجد بيانات" description="لا توجد بيانات لهذا التقرير حسب الفلاتر الحالية" />
        ) : (
          <>
            <section className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
              {cards.map((card) => (
                <StatCard key={card.title} card={card} />
              ))}
            </section>

            {infoItems.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <h3 className="text-base font-black text-slate-950">ملخص التقرير</h3>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  {infoItems.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-right">
                      <p className="text-xs font-black text-slate-500">{item.label}</p>
                      <p className="mt-2 truncate text-base font-black text-slate-950">
                        {item.key === "generated_at" ? formatDateTime(item.value) : formatCell(item.value, item.key)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sections.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="لا توجد سجلات"
                description="لا يوجد عمليات ضمن الفترة الحالية"
              />
            ) : (
              <div className="space-y-5">
                {sections.map((section) => (
                  <ReportTable key={section.key} title={section.title} rows={section.rows} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-[190px] flex-1 sm:flex-none">
      <span className="mb-2 block text-right text-xs font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}

function StatCard({ card }) {
  const Icon = card.icon || Activity;

  const colorStyles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${colorStyles[card.color] || colorStyles.blue}`}>
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-sm font-black text-slate-500">{card.title}</p>

          <p className="mt-5 truncate text-2xl font-black tabular-nums text-slate-950 sm:text-3xl" dir="ltr">
            {displayCardValue(card)}
          </p>

          {card.kind === "money" && <p className="mt-2 text-xs font-bold text-slate-400">USD</p>}

          {card.note && <p className="mt-2 truncate text-xs font-bold text-slate-400">{card.note}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function ReportTable({ title, rows }) {
  const columns = getColumns(rows);

  if (!columns.length) {
    return <EmptyState icon={FileText} title={`لا توجد بيانات في ${title}`} description="هذا القسم لا يحتوي سجلات قابلة للعرض" />;
  }

  return (
    <motion.section
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-6 py-5">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">{rows.length}</span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-slate-100 bg-white">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 text-right text-xs font-black text-slate-500">
                  {labelOf(column)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row?.id || row?.reference_number || row?.supplier || row?.customer || row?.box || index} className="transition hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column} className="max-w-[260px] truncate px-5 py-4 text-right text-sm font-bold text-slate-700">
                    {formatCell(row?.[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
