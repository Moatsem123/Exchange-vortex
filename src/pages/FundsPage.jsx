import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Building2, DollarSign, Plus, Filter, ChevronLeft,
  CheckCircle2, TrendingUp,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import AmountText from "../shared/AmountText";
import vaultsService from "../services/vaults";
import { unwrapList, formatRelative, formatMoney } from "../shared/helpers";

function FundsPage() {
  const [vaults, setVaults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [v, s] = await Promise.all([
        vaultsService.list({ per_page: 50 }).catch(() => null),
        vaultsService.summary().catch(() => null),
      ]);
      const list = unwrapList(v).items;
      setVaults(list);
      setSummary(s?.data || s || null);
      if (list[0] && !selected) setSelected(list[0]);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingTxns(true);
    vaultsService.transactions(selected.id, { per_page: 10 })
      .then((r) => setTransactions(unwrapList(r).items))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTxns(false));
  }, [selected?.id]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الحسابات والصناديق"
        subtitle="إدارة جميع حسابات الشركة والصناديق والسيولة المتاحة"
        icon={Wallet}
        actions={
          <>
            <button type="button" className="ep-btn ep-btn-ghost">
              <Filter className="h-3.5 w-3.5" />
              تصفية
            </button>
            <button type="button" className="ep-btn ep-btn-primary">
              <Plus className="h-4 w-4" />
              إضافة حساب
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي الرصيد" value={summary?.total_balance || 0} prefix="$" icon={DollarSign} color="emerald" decimals={2} />
        <StatCard title="عدد الصناديق" value={summary?.vaults_count || vaults.filter((v) => v.type === "vault").length || 0} icon={Wallet} color="violet" note="صندوق" />
        <StatCard title="عدد الحسابات البنكية" value={summary?.bank_accounts_count || vaults.filter((v) => v.type === "bank").length || 0} icon={Building2} color="blue" note="حساب" />
        <StatCard title="السيولة المتاحة" value={summary?.available_liquidity || 0} prefix="$" icon={TrendingUp} color="amber" decimals={2} />
      </section>

      {error && !loading ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <div className="ep-card-static p-4 overflow-x-auto">
            <div className="flex gap-3 min-w-min">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <div key={i} className="ep-skeleton h-32 w-48 shrink-0" />)
              ) : vaults.length === 0 ? (
                <div className="w-full"><EmptyState title="لا توجد حسابات" /></div>
              ) : (
                vaults.map((v) => (
                  <VaultCard key={v.id} v={v} active={selected?.id === v.id} onClick={() => setSelected(v)} />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.5fr]">
            <div className="ep-card-static p-5">
              <h3 className="mb-4 text-right text-base font-black text-slate-900">تفاصيل الحساب المحدد</h3>
              {selected ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${selected.type === "bank" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                        {selected.type === "bank" ? <Building2 className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{selected.type === "bank" ? "حساب بنكي" : "صندوق"}</p>
                        <p className="text-base font-black text-slate-900">{selected.name}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-right">
                      <p className="text-xs text-slate-500">الرصيد</p>
                      <AmountText value={selected.balance || 0} currency={selected.currency_code || "USD"} sign={undefined} className="mt-1 text-2xl" />
                    </div>
                    <div className="mt-3">
                      <Badge color={selected.is_active === false ? "rose" : "emerald"} dot>
                        {selected.is_active === false ? "معطّل" : "نشط"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <p className="text-xs font-bold text-slate-500">تفاصيل الرصيد</p>
                    <DetailRow label="الرصيد الحالي" value={`${formatMoney(selected.balance || 0)} ${selected.currency_code || ""}`} />
                    <DetailRow label="المبالغ المعلّقة" value={`${formatMoney(selected.pending || 0)} ${selected.currency_code || ""}`} />
                    <DetailRow label="الرصيد المتاح" value={`${formatMoney(Math.max(0, (selected.balance || 0) - (selected.pending || 0)))} ${selected.currency_code || ""}`} highlight />
                    <DetailRow label="آخر حركة" value={formatRelative(selected.last_transaction_at || selected.updated_at)} />
                  </div>
                </div>
              ) : (
                <EmptyState title="اختر حسابًا" description="انقر على بطاقة الحساب لعرض التفاصيل" />
              )}
            </div>

            <div className="ep-card-static overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <button type="button" className="text-xs font-bold text-teal-600 inline-flex items-center gap-1 hover:text-teal-800">
                  عرض الكل <ChevronLeft className="h-3 w-3" />
                </button>
                <h3 className="text-base font-black text-slate-900">آخر الحركات</h3>
              </div>

              {loadingTxns ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-12" />)}
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState title="لا توجد حركات" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="ep-table min-w-[600px]">
                    <thead>
                      <tr>
                        <th>المرجع</th>
                        <th>النوع</th>
                        <th>المبلغ</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <span dir="ltr" className="font-mono text-xs">{t.reference_number || `#${t.id}`}</span>
                          </td>
                          <td>
                            <Badge color={["receive", "deposit"].includes(t.type) ? "emerald" : "rose"}>
                              {["receive", "deposit"].includes(t.type) ? "إيداع" : "سحب"}
                            </Badge>
                          </td>
                          <td>
                            <AmountText
                              value={t.amount}
                              currency={t.currency_code || t.currency}
                              sign={["send", "withdraw"].includes(t.type) ? "-" : "+"}
                            />
                          </td>
                          <td className="text-xs text-slate-500">{formatRelative(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function VaultCard({ v, active, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`relative shrink-0 rounded-2xl border-2 bg-white p-4 text-right w-52 transition ${active ? "border-emerald-500 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.30)]" : "border-slate-200 hover:border-slate-300"}`}
    >
      {active && (
        <div className="absolute top-3 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="mb-2 flex justify-end">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${v.type === "bank" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-violet-50 text-violet-600 border-violet-200"} border`}>
          {v.type === "bank" ? <Building2 className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
        </div>
      </div>
      <p className="text-sm font-black text-slate-900 truncate">{v.name}</p>
      <p dir="ltr" className="mt-2 font-mono text-base font-black text-slate-900 tabular-nums">
        {formatMoney(v.balance || 0)}
      </p>
      <p className="text-xs text-slate-500">{v.currency_code || "USD"}</p>
      <div className="mt-2">
        <Badge color={v.is_active === false ? "rose" : "emerald"} dot>
          {v.is_active === false ? "معطّل" : "نشط"}
        </Badge>
      </div>
    </motion.button>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${highlight ? "bg-emerald-50 text-emerald-700 font-bold" : ""}`}>
      <span dir="ltr" className="font-mono tabular-nums">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

export default FundsPage;