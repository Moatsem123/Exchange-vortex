import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ArrowUp, ArrowDown, Clock, Save, RefreshCw,
  ArrowRightLeft, Loader2,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import exchangeRatesService from "../services/exchangeRates";
import currenciesService from "../services/currencies";
import { extractApiError, formatDate, unwrapList, formatMoney } from "../shared/helpers";

function ExchangeRatesPage() {
  const toast = useToast();
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencies, setCurrencies] = useState([]);
  const [rates, setRates] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  const [quickCurrency, setQuickCurrency] = useState("EUR");
  const [quickRate, setQuickRate] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);

  useEffect(() => {
    currenciesService.list()
      .then((r) => setCurrencies(unwrapList(r).items))
      .catch(() => setCurrencies([]));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await exchangeRatesService.list({
        currency: baseCurrency,
        date_from: dateFrom,
        date_to: dateTo,
        page,
        per_page: 10,
      });
      const { items, meta: m } = unwrapList(res);
      setRates(items);
      if (m) setMeta((p) => ({ ...p, ...m }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [baseCurrency, dateFrom, dateTo, page]);

  async function handleQuickSave() {
    if (!quickRate || parseFloat(quickRate) <= 0) {
      toast.error("أدخل سعر صحيح");
      return;
    }
    setSavingQuick(true);
    try {
      await exchangeRatesService.bulkUpdate({
        rates: [{ code: quickCurrency, rate: parseFloat(quickRate) }],
      });
      toast.success("تم تحديث السعر بنجاح");
      setQuickRate("");
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setSavingQuick(false); }
  }

  const stats = computeRateStats(rates);

  return (
    <div className="space-y-5">
      <PageHeader
        title="أسعار الصرف"
        subtitle="عرض ومتابعة أسعار صرف العملات مقابل العملة الأساسية"
        icon={TrendingUp}
        actions={
          <>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="ep-input h-10 w-44 text-xs appearance-none"
            >
              {currencies.length === 0 ? (
                <option value="USD">USD - الدولار الأمريكي</option>
              ) : (
                currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name_ar || c.name}</option>
                ))
              )}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="ep-input h-10 w-40 text-xs" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="ep-input h-10 w-40 text-xs" />
            <button type="button" onClick={load} className="ep-btn ep-btn-ghost">
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="عدد العملات" value={currencies.length} icon={ArrowRightLeft} color="teal" />
        <StatCard title="أعلى سعر" value={stats.high.value} suffix={stats.high.code ? ` ${stats.high.code}` : ""} icon={ArrowUp} color="emerald" decimals={4} />
        <StatCard title="أدنى سعر" value={stats.low.value} suffix={stats.low.code ? ` ${stats.low.code}` : ""} icon={ArrowDown} color="rose" decimals={4} />
        <StatCard title="متوسط السعر" value={stats.avg} icon={Clock} color="violet" decimals={4} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="ep-card-static p-5">
          <h3 className="mb-4 text-right text-base font-black text-slate-900">حركة الأسعار</h3>
          <RateChart data={rates} loading={loading} />
        </div>

        <div className="ep-card-static p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-right">
              <h3 className="text-base font-black text-slate-900">تحديث سريع</h3>
              <p className="text-xs text-slate-500">تحديث أسعار عملة محددة</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">العملة</span>
              <select value={quickCurrency} onChange={(e) => setQuickCurrency(e.target.value)} className="ep-input appearance-none">
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name_ar || c.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                السعر (مقابل {baseCurrency})
              </span>
              <input type="number" step="0.0001" value={quickRate} onChange={(e) => setQuickRate(e.target.value)} placeholder="0.0000" inputMode="decimal" className="ep-input" />
            </label>

            <button type="button" onClick={handleQuickSave} disabled={savingQuick} className="ep-btn ep-btn-primary w-full h-11">
              {savingQuick ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ التحديث
            </button>
          </div>
        </div>
      </div>

      <div className="ep-card-static overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-black text-slate-900">أسعار صرف العملات</h3>
        </div>

        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-12" />)}
          </div>
        ) : rates.length === 0 ? (
          <EmptyState title="لا توجد أسعار صرف" description="لم يتم تسجيل أي أسعار خلال هذه الفترة" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="ep-table min-w-[800px]">
                <thead>
                  <tr>
                    <th>العملة</th>
                    <th>السعر</th>
                    <th>التغيير</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, i) => {
                    const prev = rates[i + 1];
                    const change = prev ? Number(r.rate) - Number(prev.rate) : 0;
                    const changePct = prev ? (change / Number(prev.rate)) * 100 : 0;
                    const cur = currencies.find((c) => c.code === r.currency_code) || {};
                    return (
                      <tr key={r.id || `${r.currency_code}-${r.date}-${i}`}>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{cur.name_ar || cur.name || r.currency_code}</p>
                              <p className="text-[11px] text-slate-400">{r.currency_code}</p>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-black text-slate-700 text-xs">
                              {r.currency_code?.slice(0, 3)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span dir="ltr" className="font-mono font-black text-slate-900 tabular-nums">
                            {formatMoney(r.rate, { decimals: 4 })}
                          </span>
                        </td>
                        <td>
                          {change !== 0 && (
                            <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {Math.abs(change).toFixed(4)} ({Math.abs(changePct).toFixed(2)}%)
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-slate-500">{formatDate(r.date || r.created_at, { withTime: true })}</td>
                        <td>
                          <Badge color={r.is_active === false ? "rose" : "emerald"} dot>
                            {r.is_active === false ? "غير مفعّل" : "محدّث"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200">
              <Pagination
                current={meta.current_page || page}
                last={meta.last_page || 1}
                total={meta.total || rates.length}
                perPage={meta.per_page || 10}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function computeRateStats(rates) {
  if (rates.length === 0) return { high: { value: 0 }, low: { value: 0 }, avg: 0 };
  const sorted = [...rates].sort((a, b) => Number(b.rate) - Number(a.rate));
  const high = sorted[0];
  const low = sorted[sorted.length - 1];
  const avg = rates.reduce((a, b) => a + Number(b.rate || 0), 0) / rates.length;
  return {
    high: { value: high.rate, code: high.currency_code },
    low: { value: low.rate, code: low.currency_code },
    avg,
  };
}

function RateChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-64" />;
  if (data.length === 0) return <EmptyState title="لا توجد بيانات" />;

  const sorted = [...data].slice().reverse();
  const max = Math.max(...sorted.map((d) => Number(d.rate)));
  const min = Math.min(...sorted.map((d) => Number(d.rate)));
  const range = max - min || 1;

  const points = sorted.slice(0, 14).map((d, i, arr) => {
    const x = arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50;
    const y = 100 - ((Number(d.rate) - min) / range) * 80 - 10;
    return { x, y, rate: d.rate, date: d.date };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const area = `${line} L 100,100 L 0,100 Z`;

  return (
    <div className="relative h-64 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.3" />
        ))}
        <motion.path d={area} fill="#7c3aed" fillOpacity="0.08" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path
          d={line} fill="none" stroke="#7c3aed" strokeWidth="0.7"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y} r="0.9" fill="#7c3aed"
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.04 }}
          />
        ))}
      </svg>
    </div>
  );
}

export default ExchangeRatesPage;
