import { formatMoney } from "./helpers";

function AmountText({ value, currency, sign, color = "auto", className = "", decimals = 2, withCurrency = true }) {
  const num = Number(value || 0);
  const resolvedSign = sign !== undefined ? sign : (num >= 0 ? "+" : "");
  const display = sign !== undefined ? Math.abs(num) : num;

  let resolvedColor = color;
  if (color === "auto") {
    if (sign === "+" || num > 0) resolvedColor = "emerald";
    else if (sign === "-" || num < 0) resolvedColor = "rose";
    else resolvedColor = "slate";
  }

  const colorClass =
    resolvedColor === "emerald" ? "text-emerald-600" :
    resolvedColor === "rose" ? "text-rose-600" :
    resolvedColor === "blue" ? "text-blue-600" :
    "text-slate-900";

  return (
    <span dir="ltr" className={`inline-flex items-center gap-1 font-black tabular-nums ${colorClass} ${className}`}>
      {resolvedSign && <span>{resolvedSign}</span>}
      <span>{formatMoney(display, { decimals })}</span>
      {withCurrency && currency && <span className="text-xs font-bold text-slate-500">{currency}</span>}
    </span>
  );
}

export default AmountText;