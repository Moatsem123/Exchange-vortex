import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  Loader2,
  Save,
  ArrowRightLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  RefreshCw,
  BarChart3,
} from "lucide-react";

import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import StatCard from "../shared/StatCard";
import { useToast } from "../shared/Toast";
import currenciesService from "../services/currencies";
import exchangeRatesService from "../services/exchangeRates";
import { extractApiError, unwrapList, formatDate, formatMoney } from "../shared/helpers";

const TABS = [
  { key: "currencies", label: "العملات", icon: Coins },
  { key: "rates", label: "أسعار الصرف", icon: TrendingUp },
];

function getList(res) {
  const unwrapped = unwrapList(res);

  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(unwrapped?.items)) return unwrapped.items;
  if (Array.isArray(unwrapped?.data)) return unwrapped.data;
  if (Array.isArray(res?.data)) return res.data;

  return [];
}

function getMeta(res) {
  const unwrapped = unwrapList(res);
  return unwrapped?.meta || res?.meta || {};
}

function CurrenciesPage() {
  const toast = useToast();

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState("currencies");

  const [currencies, setCurrencies] = useState([]);
  const [currencySearch, setCurrencySearch] = useState("");
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [currenciesError, setCurrenciesError] = useState(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [editCur, setEditCur] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  const [rates, setRates] = useState([]);
  const [ratesMeta, setRatesMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: 10,
  });
  const [ratesPage, setRatesPage] = useState(1);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(null);

  const [quickCurrency, setQuickCurrency] = useState("EUR");
  const [quickRate, setQuickRate] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);

  async function loadCurrencies() {
    setCurrenciesLoading(true);
    setCurrenciesError(null);

    try {
      const res = await currenciesService.list({
        ...(currencySearch.trim() && { search: currencySearch.trim() }),
      });

      const list = getList(res);
      setCurrencies(list);

      if (list.length > 0) {
        setQuickCurrency((current) => (list.some((c) => c.code === current) ? current : list[0].code));
        setBaseCurrency((current) => (list.some((c) => c.code === current) ? current : "USD"));
      }
    } catch (err) {
      setCurrenciesError(err);
      setCurrencies([]);
    } finally {
      setCurrenciesLoading(false);
    }
  }

  async function loadRates() {
    setRatesLoading(true);
    setRatesError(null);

    try {
      const res = await exchangeRatesService.list({
        currency: baseCurrency,
        date_from: dateFrom,
        date_to: dateTo,
        page: ratesPage,
        per_page: 10,
      });

      const list = getList(res);
      const meta = getMeta(res);

      setRates(list);
      setRatesMeta({
        total: Number(meta?.total ?? list.length),
        current_page: Number(meta?.current_page ?? ratesPage),
        last_page: Number(meta?.last_page ?? 1),
        per_page: Number(meta?.per_page ?? 10),
      });
    } catch (err) {
      setRatesError(err);
      setRates([]);
    } finally {
      setRatesLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadCurrencies, currencySearch ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [currencySearch]);

  useEffect(() => {
    loadRates();
  }, [baseCurrency, dateFrom, dateTo, ratesPage]);

  async function refreshAll() {
    await Promise.all([loadCurrencies(), loadRates()]);
  }

  async function handleCreate(payload) {
    setBusy(true);

    try {
      await currenciesService.create(payload);
      toast.success("تمت إضافة العملة");
      setOpenAdd(false);
      refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(code, payload) {
    setBusy(true);

    try {
      await currenciesService.update(code, payload);
      toast.success("تم تحديث العملة");
      setEditCur(null);
      refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!confirmDisable) return;

    setBusy(true);

    try {
      await currenciesService.disable(confirmDisable.code);
      toast.success("تم تعطيل العملة");
      setConfirmDisable(null);
      refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateRate(code, data) {
    setBusy(true);

    try {
      await currenciesService.updateRate(code, data);
      toast.success("تم تحديث سعر الصرف");
      setRateModal(null);
      refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickSave() {
    if (!quickCurrency) {
      toast.error("اختر العملة");
      return;
    }

    if (!quickRate || Number(quickRate) <= 0) {
      toast.error("أدخل سعر صحيح");
      return;
    }

    setSavingQuick(true);

    try {
      await exchangeRatesService.bulkUpdate({
        rates: [{ code: quickCurrency, rate: Number(quickRate) }],
      });

      toast.success("تم تحديث السعر بنجاح");
      setQuickRate("");
      refreshAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setSavingQuick(false);
    }
  }

  const filteredCurrencies = useMemo(() => {
    const term = currencySearch.trim().toLowerCase();

    if (!term) return currencies;

    return currencies.filter((currency) => {
      return (
        currency.code?.toLowerCase().includes(term) ||
        currency.name?.toLowerCase().includes(term) ||
        currency.name_ar?.toLowerCase().includes(term) ||
        currency.symbol?.toLowerCase().includes(term)
      );
    });
  }, [currencies, currencySearch]);

  const activeCurrenciesCount = useMemo(
    () => currencies.filter((currency) => currency.is_active !== false).length,
    [currencies]
  );

  const inactiveCurrenciesCount = useMemo(
    () => currencies.filter((currency) => currency.is_active === false).length,
    [currencies]
  );

  const rateStats = useMemo(() => computeRateStats(rates), [rates]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملات وأسعار الصرف"
        subtitle="إدارة العملات المدعومة وتحديث أسعار الصرف من صفحة واحدة"
        icon={Coins}
        actions={
          <button type="button" onClick={() => setOpenAdd(true)} className="ep-btn ep-btn-primary">
            <Plus className="h-4 w-4" />
            إضافة عملة
          </button>
        }
      />

      <div className="ep-card-static min-w-0 overflow-hidden p-2">
        <div className="grid grid-cols-2 gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black transition",
                  active
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-900/15"
                    : "bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "currencies" ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="عدد العملات" value={currencies.length} icon={ArrowRightLeft} color="teal" />
            <StatCard title="العملات المفعّلة" value={activeCurrenciesCount} icon={Coins} color="emerald" />
            <StatCard title="العملات المعطّلة" value={inactiveCurrenciesCount} icon={Trash2} color="rose" />
            <StatCard title="أسعار مسجلة" value={ratesMeta.total || rates.length} icon={TrendingUp} color="violet" />
          </section>

          <CurrenciesSection
            items={filteredCurrencies}
            loading={currenciesLoading}
            error={currenciesError}
            search={currencySearch}
            setSearch={setCurrencySearch}
            load={loadCurrencies}
            setRateModal={setRateModal}
            setEditCur={setEditCur}
            setConfirmDisable={setConfirmDisable}
          />
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="عدد العملات" value={currencies.length} icon={ArrowRightLeft} color="teal" />
            <StatCard
              title="أعلى سعر"
              value={rateStats.high.value}
              suffix={rateStats.high.code ? ` ${rateStats.high.code}` : ""}
              icon={ArrowUp}
              color="emerald"
              decimals={4}
            />
            <StatCard
              title="أدنى سعر"
              value={rateStats.low.value}
              suffix={rateStats.low.code ? ` ${rateStats.low.code}` : ""}
              icon={ArrowDown}
              color="rose"
              decimals={4}
            />
            <StatCard title="متوسط السعر" value={rateStats.avg} icon={Clock} color="violet" decimals={4} />
          </section>

          <RatesSection
            currencies={currencies}
            baseCurrency={baseCurrency}
            setBaseCurrency={setBaseCurrency}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            quickCurrency={quickCurrency}
            setQuickCurrency={setQuickCurrency}
            quickRate={quickRate}
            setQuickRate={setQuickRate}
            savingQuick={savingQuick}
            handleQuickSave={handleQuickSave}
            rates={rates}
            ratesMeta={ratesMeta}
            ratesPage={ratesPage}
            setRatesPage={setRatesPage}
            loading={ratesLoading}
            error={ratesError}
            load={loadRates}
          />
        </>
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة عملة جديدة" size="md">
        <CurrencyForm onSubmit={handleCreate} loading={busy} onCancel={() => setOpenAdd(false)} />
      </Modal>

      <Modal open={!!editCur} onClose={() => setEditCur(null)} title="تعديل العملة" subtitle={editCur?.code} size="md">
        {editCur && (
          <CurrencyForm
            initial={editCur}
            onSubmit={(payload) => handleUpdate(editCur.code, payload)}
            loading={busy}
            onCancel={() => setEditCur(null)}
            isEdit
          />
        )}
      </Modal>

      <Modal open={!!rateModal} onClose={() => setRateModal(null)} title="تحديث سعر الصرف" subtitle={rateModal?.code} size="sm">
        {rateModal && (
          <RateUpdateForm
            current={rateModal}
            onSubmit={(payload) => handleUpdateRate(rateModal.code, payload)}
            loading={busy}
            onCancel={() => setRateModal(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDisable}
        onClose={() => setConfirmDisable(null)}
        onConfirm={handleDisable}
        title="تعطيل العملة"
        description={`سيتم تعطيل العملة "${confirmDisable?.code}".`}
        confirmText="تعطيل"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function CurrenciesSection({
  items,
  loading,
  error,
  search,
  setSearch,
  load,
  setRateModal,
  setEditCur,
  setConfirmDisable,
}) {
  return (
    <div className="space-y-5">
      <div className="ep-card-static min-w-0 overflow-hidden p-4">
        <div className="relative">
      
          <input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="ابحث عن عملة..."
  className="ep-input"
/>
        </div>
      </div>

      <div className="ep-card-static min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <button type="button" onClick={load} className="ep-btn ep-btn-ghost h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </button>

          <h3 className="text-base font-black text-slate-900">قائمة العملات</h3>
        </div>

        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="ep-skeleton h-14" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد عملات" description="ابدأ بإضافة عملة جديدة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ep-table min-w-[900px]">
              <thead>
                <tr>
                  <th>العملة</th>
                  <th>الرمز</th>
                  <th>السعر مقابل USD</th>
                  <th>الحالة</th>
                  <th>آخر تحديث</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>

              <tbody>
                {items.map((currency) => (
                  <tr key={currency.code}>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{currency.name_ar || currency.name}</p>
                          <p className="text-[11px] text-slate-400">{currency.name}</p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-700">
                          {currency.code}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="text-lg font-black text-slate-900">{currency.symbol}</span>
                    </td>

                    <td>
                      <span dir="ltr" className="font-mono font-black tabular-nums text-slate-900">
                        {formatMoney(currency.rate_to_usd, { decimals: 4 })}
                      </span>
                    </td>

                    <td>
                      <Badge color={currency.is_active !== false ? "emerald" : "slate"} dot>
                        {currency.is_active !== false ? "مفعّل" : "معطّل"}
                      </Badge>
                    </td>

                    <td className="text-xs text-slate-500">
                      {formatDate(currency.updated_at, { withTime: true })}
                    </td>

                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn icon={TrendingUp} onClick={() => setRateModal(currency)} title="تحديث السعر" color="violet" />
                        <IconBtn icon={Edit3} onClick={() => setEditCur(currency)} title="تعديل" />
                        {currency.is_active !== false && (
                          <IconBtn icon={Trash2} onClick={() => setConfirmDisable(currency)} title="تعطيل" color="rose" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RatesSection({
  currencies,
  baseCurrency,
  setBaseCurrency,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  quickCurrency,
  setQuickCurrency,
  quickRate,
  setQuickRate,
  savingQuick,
  handleQuickSave,
  rates,
  ratesMeta,
  ratesPage,
  setRatesPage,
  loading,
  error,
  load,
}) {
  return (
    <div className="space-y-5">
      <div className="ep-card-static min-w-0 overflow-hidden p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">العملة الأساسية</span>
              <select
                value={baseCurrency}
                onChange={(e) => {
                  setBaseCurrency(e.target.value);
                  setRatesPage(1);
                }}
                className="ep-input h-11 appearance-none text-xs"
              >
                {currencies.length === 0 ? (
                  <option value="USD">USD - الدولار الأمريكي</option>
                ) : (
                  currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name_ar || currency.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">من تاريخ</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setRatesPage(1);
                }}
                className="ep-input h-11 text-xs"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">إلى تاريخ</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setRatesPage(1);
                }}
                className="ep-input h-11 text-xs"
              />
            </label>
          </div>

          <button type="button" onClick={load} className="ep-btn ep-btn-ghost h-11 justify-center lg:w-32">
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="ep-card-static min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
              <BarChart3 className="h-5 w-5" />
            </div>

            <div className="text-right">
              <h3 className="text-base font-black text-slate-900">حركة الأسعار</h3>
              <p className="text-xs text-slate-500">تغير الأسعار خلال الفترة المحددة</p>
            </div>
          </div>

          <RateChart data={rates} loading={loading} />
        </div>

        <div className="ep-card-static min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div className="text-right">
              <h3 className="text-base font-black text-slate-900">تحديث سريع</h3>
              <p className="text-xs text-slate-500">تحديث سعر عملة محددة</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">العملة</span>
              <select
                value={quickCurrency}
                onChange={(e) => setQuickCurrency(e.target.value)}
                className="ep-input appearance-none"
              >
                {currencies.length === 0 ? (
                  <option value="EUR">EUR - يورو</option>
                ) : (
                  currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name_ar || currency.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                السعر مقابل {baseCurrency}
              </span>
              <input
                type="number"
                step="0.0001"
                value={quickRate}
                onChange={(e) => setQuickRate(e.target.value)}
                placeholder="0.0000"
                inputMode="decimal"
                className="ep-input"
              />
            </label>

            <button
              type="button"
              onClick={handleQuickSave}
              disabled={savingQuick}
              className="ep-btn ep-btn-primary h-11 w-full"
            >
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
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="ep-skeleton h-12" />
            ))}
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
                  {rates.map((rate, index) => {
                    const previous = rates[index + 1];
                    const change = previous ? Number(rate.rate) - Number(previous.rate) : 0;
                    const changePercent = previous && Number(previous.rate)
                      ? (change / Number(previous.rate)) * 100
                      : 0;
                    const currency = currencies.find((item) => item.code === rate.currency_code) || {};

                    return (
                      <tr key={rate.id || `${rate.currency_code}-${rate.date}-${index}`}>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">
                                {currency.name_ar || currency.name || rate.currency_code}
                              </p>
                              <p className="text-[11px] text-slate-400">{rate.currency_code}</p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                              {rate.currency_code?.slice(0, 3)}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span dir="ltr" className="font-mono font-black tabular-nums text-slate-900">
                            {formatMoney(rate.rate, { decimals: 4 })}
                          </span>
                        </td>

                        <td>
                          {change !== 0 ? (
                            <span
                              className={[
                                "inline-flex items-center gap-1 font-mono text-xs font-bold",
                                change > 0 ? "text-emerald-600" : "text-rose-600",
                              ].join(" ")}
                            >
                              {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {Math.abs(change).toFixed(4)} ({Math.abs(changePercent).toFixed(2)}%)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="text-xs text-slate-500">
                          {formatDate(rate.date || rate.created_at, { withTime: true })}
                        </td>

                        <td>
                          <Badge color={rate.is_active === false ? "rose" : "emerald"} dot>
                            {rate.is_active === false ? "غير مفعّل" : "محدّث"}
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
                current={ratesMeta.current_page || ratesPage}
                last={ratesMeta.last_page || 1}
                total={ratesMeta.total || rates.length}
                perPage={ratesMeta.per_page || 10}
                onChange={setRatesPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, color = "slate" }) {
  const palette = {
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
    violet: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 ${palette[color]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CurrencyForm({ initial, onSubmit, loading, onCancel, isEdit }) {
  const [form, setForm] = useState({
    code: initial?.code || "",
    name: initial?.name || "",
    name_ar: initial?.name_ar || "",
    symbol: initial?.symbol || "",
    rate_to_usd: initial?.rate_to_usd || 1,
    is_active: initial?.is_active ?? true,
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      rate_to_usd: Number(form.rate_to_usd || 0),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">رمز العملة *</span>
          <input
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="USD"
            maxLength={3}
            disabled={isEdit}
            className="ep-input uppercase"
            dir="ltr"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الرمز</span>
          <input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="$"
            className="ep-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الاسم *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="US Dollar"
            className="ep-input"
            dir="ltr"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الاسم بالعربية</span>
          <input
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            placeholder="دولار أمريكي"
            className="ep-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">السعر مقابل USD *</span>
          <input
            type="number"
            step="0.0001"
            value={form.rate_to_usd}
            onChange={(e) => setForm({ ...form, rate_to_usd: e.target.value })}
            className="ep-input"
            dir="ltr"
          />
        </label>

        <label className="flex items-end gap-2 pb-1">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 accent-teal-600"
          />
          <span className="text-xs font-bold text-slate-700">عملة مفعّلة</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">
          إلغاء
        </button>

        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "حفظ التعديلات" : "إضافة العملة"}
        </button>
      </div>
    </form>
  );
}

function RateUpdateForm({ current, onSubmit, loading, onCancel }) {
  const [rate, setRate] = useState(current?.rate_to_usd || 1);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ rate: Number(rate || 0), date });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
        <p className="text-xs text-slate-500">السعر الحالي</p>
        <p dir="ltr" className="font-mono text-2xl font-black tabular-nums text-slate-900">
          {formatMoney(current?.rate_to_usd, { decimals: 4 })}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-700">السعر الجديد *</span>
        <input
          type="number"
          step="0.0001"
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="ep-input text-lg font-bold"
          dir="ltr"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-700">تاريخ التحديث</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ep-input" />
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">
          إلغاء
        </button>

        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          تحديث السعر
        </button>
      </div>
    </form>
  );
}

function computeRateStats(rates) {
  if (!rates.length) {
    return {
      high: { value: 0, code: "" },
      low: { value: 0, code: "" },
      avg: 0,
    };
  }

  const sorted = [...rates].sort((a, b) => Number(b.rate || 0) - Number(a.rate || 0));
  const high = sorted[0];
  const low = sorted[sorted.length - 1];
  const avg = rates.reduce((sum, rate) => sum + Number(rate.rate || 0), 0) / rates.length;

  return {
    high: { value: Number(high.rate || 0), code: high.currency_code || "" },
    low: { value: Number(low.rate || 0), code: low.currency_code || "" },
    avg,
  };
}

function RateChart({ data, loading }) {
  if (loading) return <div className="ep-skeleton h-64" />;
  if (!data.length) return <EmptyState title="لا توجد بيانات" />;

  const sorted = [...data].slice().reverse();
  const visible = sorted.slice(0, 14);
  const max = Math.max(...visible.map((item) => Number(item.rate || 0)));
  const min = Math.min(...visible.map((item) => Number(item.rate || 0)));
  const range = max - min || 1;

  const points = visible.map((item, index, array) => {
    const x = array.length > 1 ? (index / (array.length - 1)) * 100 : 50;
    const y = 100 - ((Number(item.rate || 0) - min) / range) * 80 - 10;
    return { x, y, rate: item.rate, date: item.date };
  });

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`).join(" ");
  const area = `${line} L 100,100 L 0,100 Z`;

  return (
    <div className="relative h-64 w-full overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.3" />
        ))}

        <motion.path
          d={area}
          fill="#0f766e"
          fillOpacity="0.08"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />

        <motion.path
          d={line}
          fill="none"
          stroke="#0f766e"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="0.9"
            fill="#0f766e"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.04 }}
          />
        ))}
      </svg>
    </div>
  );
}

export default CurrenciesPage;
