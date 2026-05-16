export const getData = (response) => response?.data ?? response;

export const getList = (response) => {
  const payload = getData(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

export const getMeta = (response) => {
  const payload = getData(response);

  return payload?.meta || payload?.pagination || payload?.data?.meta || payload?.data?.pagination || {};
};

export const formatNumber = (value, digits = 2) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
};

export const formatMoney = (value, currency = "USD") => {
  return `${formatNumber(value, 2)} ${currency || ""}`.trim();
};

export const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

export const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getInitials = (name = "") => {
  const parts = String(name).trim().split(" ").filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

export const getTransactionMeta = (type = "") => {
  const value = String(type).toLowerCase();

  if (["deposit", "income", "receive", "credit", "in", "إيداع"].includes(value)) {
    return {
      label: "إيداع",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      amount: "text-emerald-600",
      icon: "text-emerald-600 bg-emerald-50",
    };
  }

  if (["withdraw", "withdrawal", "expense", "debit", "out", "سحب"].includes(value)) {
    return {
      label: "سحب",
      badge: "bg-rose-50 text-rose-700 ring-rose-100",
      amount: "text-rose-600",
      icon: "text-rose-600 bg-rose-50",
    };
  }

  if (["transfer", "تحويل"].includes(value)) {
    return {
      label: "تحويل",
      badge: "bg-blue-50 text-blue-700 ring-blue-100",
      amount: "text-blue-600",
      icon: "text-blue-600 bg-blue-50",
    };
  }

  if (["exchange", "صرف"].includes(value)) {
    return {
      label: "صرف",
      badge: "bg-violet-50 text-violet-700 ring-violet-100",
      amount: "text-violet-600",
      icon: "text-violet-600 bg-violet-50",
    };
  }

  return {
    label: type || "معاملة",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    amount: "text-slate-800",
    icon: "text-slate-600 bg-slate-100",
  };
};

export const getStatusClass = (status = "") => {
  const value = String(status).toLowerCase();

  if (["active", "success", "completed", "done", "نشط", "مكتملة"].includes(value)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["pending", "waiting", "قيد التنفيذ"].includes(value)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["failed", "inactive", "cancelled", "غير نشط", "فاشلة"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
};