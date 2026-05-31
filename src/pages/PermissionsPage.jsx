import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound,
  Search,
  ChevronDown,
  RefreshCw,
  LayoutGrid,
  Layers,
  Eye,
  Info,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import ScrollReveal from "../shared/ScrollReveal";
import { extractApiError } from "../shared/helpers";
import usersPermissionsService from "../services/usersPermissions";
import {
  ACTION_LABELS,
  normalizePermissionsResponse,
  getPermissionName,
  getPermissionAction,
  getPermissionActionKey,
  getPermissionModule,
  groupPermissions,
} from "./usersPermissionsHelpers";

const ACTION_PALETTE = {
  viewAny: "bg-sky-50 text-sky-700 ring-sky-200",
  view: "bg-blue-50 text-blue-700 ring-blue-200",
  create: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  update: "bg-amber-50 text-amber-700 ring-amber-200",
  delete: "bg-rose-50 text-rose-700 ring-rose-200",
  restore: "bg-violet-50 text-violet-700 ring-violet-200",
  forceDelete: "bg-red-50 text-red-800 ring-red-200",
  daily: "bg-teal-50 text-teal-700 ring-teal-200",
  monthly: "bg-teal-50 text-teal-700 ring-teal-200",
  export: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  manage: "bg-orange-50 text-orange-700 ring-orange-200",
  read: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  viewBalance: "bg-purple-50 text-purple-700 ring-purple-200",
  viewStatement: "bg-purple-50 text-purple-700 ring-purple-200",
  setVaultBalance: "bg-amber-50 text-amber-700 ring-amber-200",
  default: "bg-slate-50 text-slate-600 ring-slate-200",
};

function actionClass(permission) {
  const key = getPermissionActionKey(permission);
  return ACTION_PALETTE[key] || ACTION_PALETTE.default;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expandAll, setExpandAll] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await usersPermissionsService.permissions.list();
      setPermissions(normalizePermissionsResponse(res));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return permissions;

    return permissions.filter((permission) => {
      const name = getPermissionName(permission).toLowerCase();
      const label = String(permission?.label || "").toLowerCase();
      const group = String(permission?.group || "").toLowerCase();
      const groupLabel = String(permission?.group_label || "").toLowerCase();
      const action = getPermissionAction(permission).toLowerCase();

      return (
        name.includes(q) ||
        label.includes(q) ||
        group.includes(q) ||
        groupLabel.includes(q) ||
        action.includes(q)
      );
    });
  }, [permissions, search]);

  const grouped = useMemo(() => groupPermissions(filtered), [filtered]);
  const totalModules = Object.keys(grouped).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-sm">
            <KeyRound className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">صلاحيات النظام</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              عرض شامل لجميع الصلاحيات المتاحة مُجمّعة حسب الوحدة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الصلاحيات" value={permissions.length} icon={KeyRound} color="blue" note="كل صلاحيات النظام" />
        <StatCard label="الوحدات" value={totalModules} icon={LayoutGrid} color="violet" note="مجمّعة حسب الوحدة" />
        <StatCard label="ظاهر الآن" value={filtered.length} icon={Eye} color="teal" note={search ? "نتائج البحث" : "كل الصلاحيات"} />
      </div>

      {error && !loading ? (
        <ErrorState
          title="تعذّر تحميل الصلاحيات"
          description={extractApiError(error)}
          onRetry={load}
        />
      ) : (
        <ScrollReveal>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث باسم الصلاحية أو الوحدة..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400">
                  {loading ? "جارٍ التحميل..." : `${filtered.length} صلاحية · ${totalModules} وحدة`}
                </span>

                <button
                  type="button"
                  onClick={() => setExpandAll((v) => !v)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <Layers className="h-3.5 w-3.5" />
                  {expandAll ? "طي الكل" : "فتح الكل"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/60 px-5 py-2.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="text-xs font-medium text-blue-700">
                هذه الصفحة للعرض فقط — لإسناد الصلاحيات للأدوار انتقل إلى{" "}
                <a href="/roles" className="font-black underline underline-offset-2 hover:text-blue-900">
                  صفحة الأدوار
                </a>
              </p>
            </div>

            {loading ? (
              <PermissionsSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="لا توجد نتائج"
                description="لم يتم العثور على صلاحيات مطابقة للبحث"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.entries(grouped).map(([group, list], index) => (
                  <PermissionModuleSection
                    key={group}
                    group={group}
                    permissions={list}
                    defaultOpen={expandAll || index < 3}
                    expandAll={expandAll}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      )}

      {!loading && permissions.length > 0 && (
        <ScrollReveal>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black text-slate-800">دليل ألوان الإجراءات</h3>

            <div className="flex flex-wrap gap-2">
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${ACTION_PALETTE[key] || ACTION_PALETTE.default}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, note }) {
  const cls = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 24px -6px rgba(0,0,0,.08)" }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${cls[color]}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-mono text-3xl font-black text-slate-900">
            {Number(value || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">{note}</p>
        </div>
      </div>
    </motion.div>
  );
}

function PermissionModuleSection({ group, permissions, defaultOpen, expandAll }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(expandAll);
  }, [expandAll]);

  const groupLabel = permissions[0]?.group_label || group;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition hover:bg-slate-50/80"
      >
        <div className="flex items-center gap-2">
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.15 }}>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </motion.span>

          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-500">
            {permissions.length}
          </span>
        </div>

        <div>
          <p className="text-sm font-black text-slate-900">{groupLabel}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400" dir="ltr">
            {group}
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {permissions.map((permission) => (
                <PermissionCard key={getPermissionName(permission)} permission={permission} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PermissionCard({ permission }) {
  return (
    <div className={`rounded-xl px-3 py-3 text-right ring-1 ${actionClass(permission)}`}>
      <p className="truncate text-xs font-black">
        {permission?.label || getPermissionAction(permission)}
      </p>
      <p className="mt-1 truncate font-mono text-[10px] opacity-70" dir="ltr">
        {getPermissionName(permission)}
      </p>
    </div>
  );
}

function PermissionsSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="ep-skeleton h-20 rounded-xl" />
      ))}
    </div>
  );
}