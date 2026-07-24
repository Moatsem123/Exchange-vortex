/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Coins, Building2, Wallet, ArrowLeft, Plus } from "lucide-react";

import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import boxesService from "../services/boxes";
import { getBoxTypeLabel } from "../shared/boxTypes";

const BOX_GROUPS = [
  {
    key: "turkish",
    path: "/boxes/turkish",
    title: getBoxTypeLabel("turkish"),
    subtitle: "برق، الطير، والحسابات التركية",
    icon: Coins,
    currencyHint: "TRY",
  },
  {
    key: "local_bank_wallet",
    path: "/boxes/local-bank-wallet",
    title: getBoxTypeLabel("local_bank_wallet"),
    subtitle: "بنك فلسطين، جوال باي، Ooredoo",
    icon: Building2,
    currencyHint: "ILS / USD",
  },
  {
    key: "usdt_wallet",
    path: "/boxes/usdt-wallet",
    title: getBoxTypeLabel("usdt_wallet"),
    subtitle: "Binance، USDT Wallet، والحسابات الإلكترونية",
    icon: Wallet,
    currencyHint: "USDT",
  },
];

function unwrapList(res) {
  return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BoxesPage() {
  const navigate = useNavigate();

  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await boxesService.list({ per_page: 100 });
      setBoxes(unwrapList(res));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    return BOX_GROUPS.reduce((acc, group) => {
      const list = boxes.filter((box) => box.type === group.key);
      acc[group.key] = {
        count: list.length,
        active: list.filter((box) => box.status === "active").length,
        total: list.reduce((sum, box) => sum + Number(box.current_balance || 0), 0),
      };
      return acc;
    }, {});
  }, [boxes]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الصناديق"
        subtitle="اختر نوع الصندوق لعرض الحسابات والبنوك والمحافظ التابعة له"
        icon={Package}
      />

      {error && !loading ? (
        <div className="ep-card-static">
          <ErrorState onRetry={load} />
        </div>
      ) : loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {BOX_GROUPS.map((g) => (
            <div key={g.key} className="ep-skeleton h-72" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {BOX_GROUPS.map((group) => {
            const Icon = group.icon;
            const s = stats[group.key] || { count: 0, active: 0, total: 0 };

            return (
              <button
                key={group.key}
                type="button"
                onClick={() => navigate(group.path)}
                className="group rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700 transition group-hover:scale-105">
                    <Icon className="h-7 w-7" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">{group.title}</h2>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{group.subtitle}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">إجمالي الرصيد</p>
                  <p dir="ltr" className="mt-1 font-mono text-3xl font-black text-slate-900">
                    {money(s.total)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{group.currencyHint}</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs text-slate-500">عدد الحسابات</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{s.count}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs text-slate-500">النشطة</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{s.active}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm font-bold text-teal-700">
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    إدارة الحسابات
                  </span>
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && boxes.length === 0 && (
        <div className="ep-card-static">
          <EmptyState title="لا توجد حسابات داخل الصناديق" description="ادخل إلى أحد الصناديق وأضف أول حساب" />
        </div>
      )}
    </div>
  );
}

export default BoxesPage;
