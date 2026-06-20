import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";
import { formatCompactNumber } from "./helpers";

const PALETTE = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    glow: "rgba(16,185,129,0.18)",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    glow: "rgba(13,148,136,0.18)",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    glow: "rgba(244,63,94,0.18)",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    glow: "rgba(37,99,235,0.18)",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    glow: "rgba(124,58,237,0.18)",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    glow: "rgba(217,119,6,0.18)",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    glow: "rgba(71,85,105,0.14)",
  },
};

function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  color = "emerald",
  change,
  changeDir = "up",
  note,
  loading = false,
  decimals = 0,
  delay = 0,
}) {
  const c = PALETTE[color] || PALETTE.emerald;
  const positive = changeDir === "up";
  const numberValue = Number(value || 0);
  const isCompact = Math.abs(numberValue) >= 1000000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative h-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-shadow duration-500 hover:shadow-[0_14px_30px_-16px_rgba(15,23,42,0.16)]"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: c.glow }}
      />

      <div className="relative z-10 flex h-full items-start justify-between gap-4">
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-xs font-bold text-slate-500">{title}</p>

          <div
            dir="ltr"
            title={`${prefix}${numberValue.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}${suffix}`}
            className="mt-3 max-w-full truncate text-2xl font-black tabular-nums text-slate-900 sm:text-3xl"
          >
            {loading ? (
              <span className="inline-block h-7 w-24 rounded ep-skeleton" />
            ) : isCompact ? (
              <span>
                {prefix}
                {formatCompactNumber(numberValue, { maxDecimals: decimals > 0 ? decimals : 2 })}
                {suffix}
              </span>
            ) : (
              <AnimatedNumber
                value={numberValue}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
              />
            )}
          </div>

          {(change || note) && (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-xs">
              {change && (
                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold",
                    positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  ].join(" ")}
                >
                  {positive ? "↑" : "↓"} {change}
                </span>
              )}

              {note && <span className="truncate text-slate-400">{note}</span>}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-4deg] ${c.bg} ${c.border} ${c.text}`}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default StatCard;