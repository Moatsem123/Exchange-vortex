import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scale,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Building2,
  DollarSign,
  History,
  Loader2,
  Activity,
  Calculator,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import reconciliationService from "../services/reconciliation";
import { extractApiError, formatDate, formatMoney } from "../shared/helpers";

const PER_PAGE = 20;

function unwrapPayload(res) {
  const data = res?.data ?? res ?? {};
  return data?.data ?? data ?? {};
}

function normalizeHistory(res) {
  const payload = res ?? {};
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

  const meta = payload?.meta ||
    payload?.data?.meta || {
      total: items.length,
      current_page: 1,
      last_page: 1,
      per_page: PER_PAGE,
    };

  return { items, meta };
}

function numberFrom(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) {
      const value = Number(data[key]);
      return Number.isFinite(value) ? value : fallback;
    }
  }

  return fallback;
}

function getCapital(data) {
  return numberFrom(data, ["capital_balance", "capital", "total_capital"]);
}

function getFreeCapital(data) {
  return numberFrom(data, ["free_capital", "free_balance_usd", "free_balance"]);
}

function getBoxesTotal(data) {
  return numberFrom(data, ["boxes_total_balance", "boxes_balance", "total_boxes_balance"]);
}

function getActualCapital(data) {
  return getFreeCapital(data) + getBoxesTotal(data);
}

function getDifference(data) {
  return getCapital(data) - getActualCapital(data);
}

function getSnapshotDate(item) {
  return item?.created_at || item?.checked_at || item?.run_at || item?.reconciled_at || item?.updated_at || null;
}

function getSnapshotStatus(item) {
  return Math.abs(getDifference(item)) < 0.01 ? "balanced" : "mismatch";
}

function getStatusMeta(status) {
  if (status === "balanced") {
    return {
      label: "متوازن",
      color: "emerald",
      icon: CheckCircle2,
      title: "النظام متوازن",
      description: "رأس المال يساوي رأس المال الحر بالإضافة إلى أرصدة الصناديق.",
    };
  }

  return {
    label: "يوجد فرق",
    color: "rose",
    icon: AlertTriangle,
    title: "يوجد فرق في التسوية",
    description: "رأس المال لا يساوي مجموع رأس المال الحر وأرصدة الصناديق.",
  };
}

export default function ReconciliationPage() {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    setError(null);

    try {
      const res = await reconciliationService.view();
      setSummary(unwrapPayload(res));
    } catch (err) {
      setSummary(null);
      setError(err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const res = await reconciliationService.history({
        page,
        per_page: PER_PAGE,
      });

      const normalized = normalizeHistory(res);

      setHistory(normalized.items);
      setMeta({
        total: Number(normalized.meta?.total ?? normalized.items.length),
        current_page: Number(normalized.meta?.current_page ?? page),
        last_page: Number(normalized.meta?.last_page ?? 1),
        per_page: Number(normalized.meta?.per_page ?? PER_PAGE),
      });
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [page]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSummary(), loadHistory()]);
    setLoading(false);
  }, [loadSummary, loadHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function runReconciliation() {
    setRunning(true);

    try {
      const res = await reconciliationService.run();
      const data = unwrapPayload(res);
      const status = getSnapshotStatus(data);

      toast.success(status === "balanced" ? "تمت التسوية والنظام متوازن" : "تم تشغيل التسوية ويوجد فرق");
      setPage(1);
      await loadAll();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setRunning(false);
    }
  }

  const current = summary || {};

  const capitalBalance = getCapital(current);
  const freeCapital = getFreeCapital(current);
  const boxesTotalBalance = getBoxesTotal(current);
  const actualCapital = getActualCapital(current);
  const difference = getDifference(current);
  const status = getSnapshotStatus(current);
  const statusMeta = getStatusMeta(status);
  const StatusIcon = statusMeta.icon;

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return history;

    return history.filter((item) => {
      const rowStatus = getStatusMeta(getSnapshotStatus(item)).label;
      const rowDate = getSnapshotDate(item);
      const userName = item?.created_by_user?.name || item?.created_by?.name || item?.user?.name || "";

      return (
        String(item?.id || "").includes(term) ||
        String(item?.status || "").toLowerCase().includes(term) ||
        String(rowStatus || "").toLowerCase().includes(term) ||
        String(item?.notes || "").toLowerCase().includes(term) ||
        String(userName || "").toLowerCase().includes(term) ||
        String(rowDate || "").toLowerCase().includes(term) ||
        String(getCapital(item)).includes(term) ||
        String(getFreeCapital(item)).includes(term) ||
        String(getBoxesTotal(item)).includes(term) ||
        String(getActualCapital(item)).includes(term) ||
        String(getDifference(item)).includes(term)
      );
    });
  }, [history, search]);

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
              <Scale className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <h1 className="break-words text-xl font-black leading-8 text-slate-950 sm:text-2xl">
                التسوية العامة
              </h1>
              <p className="mt-1 max-w-full break-words text-xs font-semibold leading-6 text-slate-500 sm:text-sm">
                مطابقة رأس المال مع رأس المال الحر وأرصدة الصناديق لاكتشاف أي فروقات
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading || running}
              className="ep-btn ep-btn-ghost h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span className="truncate">تحديث</span>
            </button>

            <button
              type="button"
              onClick={runReconciliation}
              disabled={running}
              className="ep-btn ep-btn-primary h-11 min-w-0 justify-center px-3 text-xs sm:px-4 sm:text-sm"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              <span className="truncate">تشغيل التسوية</span>
            </button>
          </div>
        </div>
      </section>

      {error && !loading ? (
        <ErrorState
          title="تعذّر تحميل التسوية"
          description={extractApiError(error)}
          onRetry={loadAll}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MoneyCard
              title="رأس المال"
              value={capitalBalance}
              icon={DollarSign}
              color="emerald"
            />

            <MoneyCard
              title="رأس المال الحر"
              value={freeCapital}
              icon={Wallet}
              color="teal"
            />

            <MoneyCard
              title="أرصدة الصناديق"
              value={boxesTotalBalance}
              icon={Building2}
              color="violet"
            />

            <MoneyCard
              title="رأس المال الكلي الفعلي"
              value={actualCapital}
              icon={Calculator}
              color="blue"
            />

            <MoneyCard
              title="فرق التسوية"
              value={difference}
              icon={Activity}
              color={status === "balanced" ? "emerald" : "rose"}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge color={statusMeta.color}>{statusMeta.label}</Badge>

                <div className="min-w-0 text-right">
                  <h3 className="text-base font-black text-slate-900">معادلة التسوية</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    فرق التسوية = رأس المال - (رأس المال الحر + أرصدة الصناديق)
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <FormulaBox label="رأس المال" value={capitalBalance} color="emerald" />
                <FormulaBox label="رأس المال الحر" value={freeCapital} color="teal" />
                <FormulaBox label="الصناديق" value={boxesTotalBalance} color="violet" />
                <FormulaBox label="الكلي الفعلي" value={actualCapital} color="blue" />
                <FormulaBox label="الفرق" value={difference} color={status === "balanced" ? "emerald" : "rose"} />
              </div>

             
            </div>

            <div
              className={`rounded-3xl border p-4 shadow-sm sm:p-5 ${
                status === "balanced"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <StatusIcon
                  className={`h-9 w-9 shrink-0 ${
                    status === "balanced" ? "text-emerald-700" : "text-rose-700"
                  }`}
                />

                <div className="text-right">
                  <h3
                    className={`text-base font-black ${
                      status === "balanced" ? "text-emerald-900" : "text-rose-900"
                    }`}
                  >
                    {statusMeta.title}
                  </h3>

                  <p
                    className={`mt-2 text-xs font-semibold leading-6 ${
                      status === "balanced" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {statusMeta.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/70 p-4 text-right">
                <p className="text-xs font-black text-slate-500">فرق التسوية الحالي</p>
                <p
                  dir="ltr"
                  className={`mt-2 font-mono text-2xl font-black ${
                    status === "balanced" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  ${formatMoney(difference)}
                </p>
              </div>
            </div>
          </section>

          <section className="ep-card-static min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <Badge color="teal">{filteredHistory.length} سجل</Badge>

              <div className="min-w-0 text-right">
                <h3 className="text-base font-black text-slate-900">سجل التسويات</h3>
                <p className="text-xs text-slate-500">كل عمليات فحص ومطابقة السيولة</p>
              </div>
            </div>

            <div className="border-b border-slate-100 p-4">
              <label className="block max-w-xl">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">بحث</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالحالة أو التاريخ أو المستخدم أو المبالغ..."
                  className="ep-input"
                />
              </label>
            </div>

            {historyLoading ? (
              <div className="space-y-2 p-4 sm:p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="ep-skeleton h-14" />
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-6 sm:p-8">
                <EmptyState
                  icon={History}
                  title="لا يوجد سجل تسويات"
                  description={search ? "لا توجد نتائج مطابقة للبحث الحالي" : "شغّل التسوية الآن حتى يظهر أول سجل هنا"}
                  action={
                    search ? (
                      <button type="button" onClick={() => setSearch("")} className="ep-btn ep-btn-ghost">
                        مسح البحث
                      </button>
                    ) : (
                      <button type="button" onClick={runReconciliation} className="ep-btn ep-btn-primary">
                        <PlayCircle className="h-4 w-4" />
                        تشغيل التسوية
                      </button>
                    )
                  }
                />
              </div>
            ) : (
              <>
                <div className="max-w-full overflow-x-auto">
                  <table className="ep-table min-w-[980px]">
                    <thead>
                      <tr>
                        <th>الحالة</th>
                        <th>رأس المال</th>
                        <th>رأس المال الحر</th>
                        <th>الصناديق</th>
                        <th>الكلي الفعلي</th>
                        <th>الفرق</th>
                        <th>التاريخ</th>
                        <th>المستخدم</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredHistory.map((item) => {
                        const rowStatus = getSnapshotStatus(item);
                        const rowMeta = getStatusMeta(rowStatus);
                        const rowCapital = getCapital(item);
                        const rowFree = getFreeCapital(item);
                        const rowBoxes = getBoxesTotal(item);
                        const rowActual = getActualCapital(item);
                        const rowDifference = getDifference(item);

                        return (
                          <tr key={item.id || `${rowStatus}-${getSnapshotDate(item)}`}>
                            <td>
                              <Badge color={rowMeta.color}>{rowMeta.label}</Badge>
                            </td>

                            <td dir="ltr" className="font-mono font-bold text-slate-700">
                              {formatMoney(rowCapital)}
                            </td>

                            <td dir="ltr" className="font-mono font-bold text-slate-700">
                              {formatMoney(rowFree)}
                            </td>

                            <td dir="ltr" className="font-mono font-bold text-slate-700">
                              {formatMoney(rowBoxes)}
                            </td>

                            <td dir="ltr" className="font-mono font-bold text-slate-700">
                              {formatMoney(rowActual)}
                            </td>

                            <td
                              dir="ltr"
                              className={`font-mono font-black ${
                                rowStatus === "balanced" ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {formatMoney(rowDifference)}
                            </td>

                            <td>{getSnapshotDate(item) ? formatDate(getSnapshotDate(item)) : "—"}</td>

                            <td>{item.created_by_user?.name || item.created_by?.name || item.user?.name || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100">
                  <Pagination
                    current={meta.current_page || page}
                    last={meta.last_page || 1}
                    total={meta.total || filteredHistory.length}
                    perPage={meta.per_page || PER_PAGE}
                    onChange={setPage}
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MoneyCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
  };

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${colorMap[color] || colorMap.teal}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs font-black text-slate-500 sm:text-sm">{title}</p>
          <p
            dir="ltr"
            className={`mt-4 break-words font-mono text-2xl font-black leading-tight sm:text-3xl ${
              Number(value || 0) < 0 ? "text-rose-700" : "text-slate-950"
            }`}
          >
            ${formatMoney(Number(value || 0))}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormulaBox({ label, value, color }) {
  const colorMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return (
    <div className={`min-w-0 rounded-2xl border p-4 text-right ${colorMap[color] || colorMap.teal}`}>
      <p className="text-xs font-black opacity-75">{label}</p>
      <p dir="ltr" className="mt-2 break-words font-mono text-xl font-black leading-tight sm:text-2xl">
        ${formatMoney(Number(value || 0))}
      </p>
    </div>
  );
}