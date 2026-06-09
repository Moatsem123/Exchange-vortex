import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Building2,
  DollarSign,
  Filter,
  ChevronLeft,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import AmountText from "../shared/AmountText";
import vaultsService from "../services/vaults";
import { unwrapList, formatRelative, formatMoney } from "../shared/helpers";

function getVaultBalance(vault) {
  return Number(vault?.balance_usd ?? vault?.balance ?? 0) || 0;
}

function getVaultInitialBalance(vault) {
  return Number(vault?.initial_balance ?? 0) || 0;
}

function getSummaryData(res) {
  return res?.data || res || null;
}

function FundsPage() {
  const [vaults, setVaults] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await vaultsService.list({ per_page: 50 });
      const list = unwrapList(res).items;

      setVaults(list);

      setSelected((current) => {
        if (!list.length) return null;
        if (!current) return list[0];

        const updated = list.find((v) => String(v.id) === String(current.id));
        return updated || list[0];
      });
    } catch (err) {
      setError(err);
      setVaults([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setSelectedSummary(null);
      setTransactions([]);
      return;
    }

    setLoadingSummary(true);
    setLoadingTxns(true);

    vaultsService
      .summary(selected.id)
      .then((r) => setSelectedSummary(getSummaryData(r)))
      .catch(() => setSelectedSummary(null))
      .finally(() => setLoadingSummary(false));

    vaultsService
      .transactions(selected.id, { per_page: 10 })
      .then((r) => setTransactions(unwrapList(r).items))
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTxns(false));
  }, [selected?.id]);

  const stats = useMemo(() => {
    const totalBalance = vaults.reduce((sum, v) => sum + getVaultBalance(v), 0);
    const activeVaults = vaults.filter((v) => v.is_active !== false);
    const inactiveVaults = vaults.filter((v) => v.is_active === false);

    return {
      totalBalance,
      vaultsCount: vaults.length,
      activeCount: activeVaults.length,
      inactiveCount: inactiveVaults.length,
      availableLiquidity: activeVaults.reduce((sum, v) => sum + getVaultBalance(v), 0),
    };
  }, [vaults]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الحسابات والصناديق"
        subtitle="إدارة صناديق المستخدمين والسيولة المتاحة داخل النظام"
        icon={Wallet}
        actions={
          <>
          

            <button type="button" onClick={load} className="ep-btn ep-btn-primary">
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          title="إجمالي الرصيد"
          value={stats.totalBalance}
          prefix="$"
          icon={DollarSign}
          color="emerald"
          decimals={2}
        />

        <StatCard
          title="عدد الصناديق"
          value={stats.vaultsCount}
          icon={Wallet}
          color="violet"
          note="صندوق"
        />

        <StatCard
          title="الصناديق النشطة"
          value={stats.activeCount}
          icon={Building2}
          color="blue"
          note="نشط"
        />

        <StatCard
          title="السيولة المتاحة"
          value={stats.availableLiquidity}
          prefix="$"
          icon={TrendingUp}
          color="amber"
          decimals={2}
        />
      </section>

      {error && !loading ? (
        <ErrorState onRetry={load} />
      ) : (
        <>
          <div className="ep-card-static min-w-0 overflow-x-auto p-4">
            <div className="flex min-w-min gap-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ep-skeleton h-32 w-52 shrink-0" />
                ))
              ) : vaults.length === 0 ? (
                <div className="w-full">
                  <EmptyState title="لا توجد صناديق" description="الصناديق تُنشأ تلقائيًا عند إنشاء المستخدمين" />
                </div>
              ) : (
                vaults.map((v) => (
                  <VaultCard
                    key={v.id}
                    v={v}
                    active={selected?.id === v.id}
                    onClick={() => setSelected(v)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.5fr]">
            <div className="ep-card-static min-w-0 overflow-hidden p-5">
              <h3 className="mb-4 text-right text-base font-black text-slate-900">
                تفاصيل الصندوق المحدد
              </h3>

              {selected ? (
                <div className="space-y-4">
                  <div className="rounded-2xl min-w-0 overflow-hidden border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200 bg-violet-100 text-violet-700">
                        <Wallet className="h-6 w-6" />
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">صندوق مستخدم</p>
                        <p className="text-base font-black text-slate-900">{selected.name}</p>
                        {selected.user?.name && (
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            المستخدم: {selected.user.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-right">
                      <p className="text-xs text-slate-500">الرصيد</p>
                      <AmountText
                        value={getVaultBalance(selected)}
                        currency={selected.currency_code || "USD"}
                        sign={undefined}
                        className="mt-1 text-2xl"
                      />
                    </div>

                    <div className="mt-3">
                      <Badge color={selected.is_active === false ? "rose" : "emerald"} dot>
                        {selected.is_active === false ? "معطّل" : "نشط"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <p className="text-xs font-bold text-slate-500">تفاصيل الرصيد</p>

                    <DetailRow
                      label="الرصيد الحالي"
                      value={`${formatMoney(getVaultBalance(selected))} ${selected.currency_code || "USD"}`}
                    />

                    <DetailRow
                      label="الرصيد الابتدائي"
                      value={`${formatMoney(getVaultInitialBalance(selected))} ${selected.currency_code || "USD"}`}
                    />

                    <DetailRow
                      label="إجمالي الإيداعات"
                      value={
                        loadingSummary
                          ? "..."
                          : `${formatMoney(selectedSummary?.total_receive || 0)} USD`
                      }
                    />

                    <DetailRow
                      label="إجمالي السحوبات"
                      value={
                        loadingSummary
                          ? "..."
                          : `${formatMoney(selectedSummary?.total_send || 0)} USD`
                      }
                    />

                    <DetailRow
                      label="الرصيد من الملخص"
                      value={
                        loadingSummary
                          ? "..."
                          : `${formatMoney(selectedSummary?.balance_usd ?? getVaultBalance(selected))} USD`
                      }
                      highlight
                    />

                    <DetailRow
                      label="آخر تحديث"
                      value={formatRelative(selected.updated_at)}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                    <p className="text-xs font-black text-slate-700">ملاحظة</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      إنشاء الصندوق يتم تلقائيًا عند إنشاء المستخدم. لذلك تم إزالة زر إضافة حساب من هذه الصفحة.
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState title="اختر صندوقًا" description="انقر على بطاقة الصندوق لعرض التفاصيل" />
              )}
            </div>

            <div className="ep-card-static min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800"
                >
                  عرض الكل <ChevronLeft className="h-3 w-3" />
                </button>

                <h3 className="text-base font-black text-slate-900">آخر الحركات</h3>
              </div>

              {loadingTxns ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="ep-skeleton h-12" />
                  ))}
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
                      {transactions.map((t) => {
                        const isIncome = Number(t.direction) === 1 || ["receive", "deposit"].includes(t.type);
                        const isTransfer = t.type === "transfer";

                        return (
                          <tr key={t.id}>
                            <td>
                              <span dir="ltr" className="font-mono text-xs">
                                {t.reference_number || `#${t.id}`}
                              </span>
                            </td>

                            <td>
                              <Badge color={isTransfer ? "blue" : isIncome ? "emerald" : "rose"}>
                                {isTransfer ? "تحويل" : isIncome ? "إيداع" : "سحب"}
                              </Badge>
                            </td>

                            <td>
                              <AmountText
                                value={Number(t.net_usd_value ?? t.usd_value ?? t.amount ?? 0)}
                                currency="USD"
                                sign={isIncome ? "+" : "-"}
                              />
                            </td>

                            <td className="text-xs text-slate-500">
                              {formatRelative(t.created_at)}
                            </td>
                          </tr>
                        );
                      })}
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
      className={`relative w-52 shrink-0 rounded-2xl border-2 bg-white p-4 text-right transition ${
        active
          ? "border-emerald-500 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.30)]"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {active && (
        <div className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      )}

      <div className="mb-2 flex justify-end">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <p className="truncate text-sm font-black text-slate-900">{v.name}</p>

      {v.user?.name && (
        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
          {v.user.name}
        </p>
      )}

      <p dir="ltr" className="mt-2 font-mono text-base font-black tabular-nums text-slate-900">
        {formatMoney(getVaultBalance(v))}
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
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
        highlight ? "bg-emerald-50 font-bold text-emerald-700" : ""
      }`}
    >
      <span dir="ltr" className="font-mono tabular-nums">
        {value}
      </span>

      <span className="text-slate-500">{label}</span>
    </div>
  );
}

export default FundsPage;