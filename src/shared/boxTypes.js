export const BOX_TYPE_OPTIONS = [
  { value: "turkish", label: "الصندوق التركي", hint: "TRY" },
  { value: "local_bank_wallet", label: "البنوك والمحافظ المحلية", hint: "ILS / USD" },
  { value: "usdt_wallet", label: "محفظة USDT", hint: "USDT" },
];

export function getBoxTypeLabel(type, fallback = "كل الصناديق") {
  return BOX_TYPE_OPTIONS.find((item) => item.value === type)?.label || type || fallback;
}

export function getBoxTypeHint(type) {
  return BOX_TYPE_OPTIONS.find((item) => item.value === type)?.hint || "";
}
