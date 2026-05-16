const COLORS = {
  receive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  send: "border-rose-200 bg-rose-50 text-rose-700",
  transfer: "border-blue-200 bg-blue-50 text-blue-700",
  exchange: "border-violet-200 bg-violet-50 text-violet-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
};

function Badge({ children, color = "slate", icon: Icon, dot = false, className = "" }) {
  const c = COLORS[color] || COLORS.slate;
  return (
    <span className={`ep-badge border ${c} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export default Badge;