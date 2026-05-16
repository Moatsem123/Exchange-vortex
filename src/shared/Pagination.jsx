import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ current = 1, last = 1, total = 0, perPage = 10, onChange }) {
  if (last <= 1) return null;

  const pages = [];
  const max = Math.min(last, 5);
  let start = Math.max(1, current - 2);
  const end = Math.min(last, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  const from = (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 text-xs text-slate-500 sm:flex-row" dir="rtl">
      <span>
        عرض <span className="font-black text-slate-900">{from}</span> إلى{" "}
        <span className="font-black text-slate-900">{to}</span> من{" "}
        <span className="font-black text-slate-900">{total || 0}</span>
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={[
              "h-9 min-w-9 rounded-lg px-3 text-xs font-bold transition",
              p === current
                ? "bg-teal-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
            ].join(" ")}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          disabled={current === last}
          onClick={() => onChange(current + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;