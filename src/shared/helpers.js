export function formatMoney(value, options = {}) {
  const { decimals = 2, locale = "en-US" } = options;
  const num = Number(value || 0);

  if (!Number.isFinite(num)) return "0.00";

  const abs = Math.abs(num);

  if (abs >= 1000000) {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatNumber(value, locale = "en-US") {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}
export function formatCompactNumber(value, options = {}) {
  const { maxDecimals = 2, locale = "en-US" } = options;
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return "0";

  const abs = Math.abs(number);

  if (abs >= 1000000000) {
    return `${(number / 1000000000).toFixed(maxDecimals).replace(/\.?0+$/, "")}B`;
  }

  if (abs >= 1000000) {
    return `${(number / 1000000).toFixed(maxDecimals).replace(/\.?0+$/, "")}M`;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}
export function formatDate(iso, options = {}) {
  if (!iso) return "—";

  const { withTime = false, locale = "ar-EG" } = options;

  try {
    const d = new Date(iso);

    if (withTime) {
      return d.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatRelative(iso) {
  if (!iso) return "—";

  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;

    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 86400 * 7) return `منذ ${Math.floor(diff / 86400)} يوم`;

    return d.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export const TRANSACTION_TYPES = {
  receive: { label: "إيداع", color: "receive", icon: "ArrowDownLeft" },
  deposit: { label: "إيداع", color: "receive", icon: "ArrowDownLeft" },
  send: { label: "سحب", color: "send", icon: "ArrowUpRight" },
  withdraw: { label: "سحب", color: "send", icon: "ArrowUpRight" },
  transfer: { label: "تحويل", color: "transfer", icon: "ArrowRightLeft" },
  exchange: { label: "صرف", color: "exchange", icon: "Coins" },
};

export const TRANSACTION_STATUSES = {
  completed: { label: "مكتملة", color: "receive" },
  pending: { label: "قيد التنفيذ", color: "pending" },
  cancelled: { label: "ملغاة", color: "send" },
  failed: { label: "فاشلة", color: "send" },
};

export function getTransactionTypeMeta(type) {
  return TRANSACTION_TYPES[type] || {
    label: type || "—",
    color: "transfer",
    icon: "ArrowRightLeft",
  };
}

export function getStatusMeta(status) {
  return TRANSACTION_STATUSES[status] || {
    label: status || "—",
    color: "pending",
  };
}

export function getAmountSign(type) {
  if (["receive", "deposit"].includes(type)) return "+";
  if (["send", "withdraw"].includes(type)) return "-";
  return "";
}

export function extractApiError(err, fallback = "حدث خطأ غير متوقع") {
  if (err?.response?.status === 401) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (err?.response?.status === 403) return "ليس لديك صلاحية للقيام بهذا الإجراء";
  if (err?.response?.status === 404) return "المورد المطلوب غير موجود";
  if (err?.response?.status === 500) return "حدث خطأ في الخادم، يرجى المحاولة لاحقًا";

  if (err?.response?.status === 422) {
    const errors = err.response.data?.errors;

    if (errors) {
      const first = Object.values(errors)[0];
      if (Array.isArray(first)) return first[0];
    }

    return err.response.data?.message || "بيانات غير صالحة";
  }

  if (err?.response?.data?.message) {
    const message = String(err.response.data.message);

    if (
      message.includes("SQLSTATE") ||
      message.includes("Undefined column") ||
      message.includes("Integrity constraint") ||
      message.includes("QueryException") ||
      message.includes("Internal Server Error")
    ) {
      return "حدث خطأ في الخادم، يرجى المحاولة لاحقًا";
    }

    return message;
  }

  if (err?.message) return err.message;

  return fallback;
}

export function unwrap(res) {
  if (res?.data !== undefined) return res.data;
  return res;
}

export function unwrapList(res) {
  if (Array.isArray(res)) return { items: res, meta: null };
  if (Array.isArray(res?.data)) return { items: res.data, meta: res.meta || null };
  if (Array.isArray(res?.data?.data)) return { items: res.data.data, meta: res.data.meta || res.meta };

  return { items: [], meta: null };
}