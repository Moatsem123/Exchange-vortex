export const CAPITAL_ACCOUNT_TYPE_LABELS = {
  own: "رأس مالي الخاص",
  owner: "رأس مالي الخاص",
  company: "رأس مال استثماري",
  investor: "رأس مال استثماري",
  partner: "رأس مال استثماري",
};

export const CAPITAL_MOVEMENT_META = {
  deposit: {
    label: "إضافة",
    color: "emerald",
  },
  withdraw: {
    label: "سحب",
    color: "rose",
  },
  box_transfer: {
    label: "تخصيص للصندوق",
    color: "teal",
  },
  transfer_to_box: {
    label: "تخصيص للصندوق",
    color: "teal",
  },
  initial_deposit: {
    label: "إضافة",
    color: "emerald",
  },
  top_up: {
    label: "إضافة",
    color: "emerald",
  },
  withdrawal: {
    label: "سحب",
    color: "rose",
  },
  allocation: {
    label: "تخصيص للصندوق",
    color: "teal",
  },
  deallocation: {
    label: "إرجاع من الصندوق",
    color: "blue",
  },
  expense: {
    label: "مصروف",
    color: "amber",
  },
};

export function getCapitalAccountTypeLabel(type, fallback = "—") {
  return CAPITAL_ACCOUNT_TYPE_LABELS[type] || type || fallback;
}

export function getCapitalMovementMeta(type) {
  return CAPITAL_MOVEMENT_META[type] || {
    label: type || "—",
    color: "slate",
  };
}
