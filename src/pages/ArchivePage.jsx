import { useEffect, useState } from "react";
import { Archive, RotateCcw, Eye, ArrowRightLeft, UsersRound, Coins } from "lucide-react";
import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import archiveService from "../services/archive";
import { extractApiError, formatRelative } from "../shared/helpers";

const TYPES = [
  { key: "transaction", label: "المعاملات", icon: ArrowRightLeft },
  { key: "customer", label: "العملاء", icon: UsersRound },
  { key: "currency", label: "العملات", icon: Coins },
];

function unwrapArchive(res) {
  const data = res?.data ?? res ?? {};
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const meta = res?.meta || data?.meta || {
    total: items.length,
    current_page: 1,
    last_page: 1,
    per_page: 20,
  };

  return { items, meta };
}

function getArchiveTitle(entry) {
  const snapshot = entry?.snapshot || {};

  return (
    snapshot.name ||
    snapshot.customer_code ||
    snapshot.reference_number ||
    snapshot.code ||
    snapshot.title ||
    entry.title ||
    entry.reason ||
    `${entry.archivable_type || "item"} #${entry.archivable_id || entry.id}`
  );
}

function getArchiveDescription(entry) {
  const snapshot = entry?.snapshot || {};

  return (
    snapshot.phone ||
    snapshot.note ||
    snapshot.country ||
    snapshot.currency ||
    snapshot.type ||
    entry.reason ||
    "—"
  );
}

function getArchiveUser(entry) {
  return entry?.archived_by?.name || entry?.deleted_by?.name || entry?.user?.name || "—";
}

function getArchiveDate(entry) {
  return entry?.created_at || entry?.archived_at || entry?.deleted_at;
}

function ArchivePage() {
  const toast = useToast();

  const [type, setType] = useState("customer");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [viewEntry, setViewEntry] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await archiveService.list({ type, page, per_page: 20 });
      const { items: list, meta: m } = unwrapArchive(res);

      setItems(list);
      setMeta((prev) => ({ ...prev, ...m }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type, page]);

  async function handleRestore() {
    if (!confirmRestore) return;

    setBusy(true);

    try {
      await archiveService.restore(confirmRestore.id);
      toast.success("تمت الاستعادة بنجاح");
      setConfirmRestore(null);
      load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function viewDetails(entry) {
    try {
      const res = await archiveService.show(entry.id);
      setViewEntry(res?.data || entry);
    } catch {
      setViewEntry(entry);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="الأرشيف" subtitle="استعرض السجلات المحذوفة واستعد ما تحتاجه" icon={Archive} />

      <div className="ep-card-static p-4">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;

            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setType(t.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                  active
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ep-card-static overflow-hidden">
        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ep-skeleton h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="الأرشيف فارغ" description={`لا توجد ${TYPES.find((t) => t.key === type)?.label} في الأرشيف`} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="ep-table min-w-[850px]">
                <thead>
                  <tr>
                    <th>رقم الأرشيف</th>
                    <th>النوع</th>
                    <th>العنوان</th>
                    <th>تاريخ الأرشفة</th>
                    <th>المنفّذ</th>
                    <th className="text-center">إجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <span dir="ltr" className="font-mono text-xs font-bold text-slate-700">
                          #{entry.id}
                        </span>
                      </td>

                      <td>
                        <Badge color="slate">
                          {entry.archivable_type || type}
                        </Badge>
                      </td>

                      <td>
                        <p className="font-bold text-slate-900">{getArchiveTitle(entry)}</p>
                        <p className="max-w-md truncate text-[11px] text-slate-500">{getArchiveDescription(entry)}</p>
                        {entry.archivable_id && (
                          <p dir="ltr" className="mt-1 text-[10px] font-bold text-slate-400">
                            original #{entry.archivable_id}
                          </p>
                        )}
                      </td>

                      <td className="text-xs text-slate-500">
                        {formatRelative(getArchiveDate(entry))}
                      </td>

                      <td>
                        <Badge color="slate">{getArchiveUser(entry)}</Badge>
                      </td>

                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => viewDetails(entry)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmRestore(entry)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200">
              <Pagination
                current={meta.current_page || page}
                last={meta.last_page || 1}
                total={meta.total || items.length}
                perPage={meta.per_page || 20}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title="تفاصيل العنصر المؤرشف" size="lg">
        {viewEntry && (
          <div className="space-y-3 text-right">
            <pre dir="ltr" className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              {JSON.stringify(viewEntry, null, 2)}
            </pre>

            <button
              type="button"
              onClick={() => {
                setConfirmRestore(viewEntry);
                setViewEntry(null);
              }}
              className="ep-btn ep-btn-primary w-full"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              استعادة هذا العنصر
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={handleRestore}
        title="استعادة العنصر"
        description={`سيتم استعادة سجل الأرشيف رقم #${confirmRestore?.id || ""} إلى مكانه الأصلي.`}
        confirmText="استعادة"
        loading={busy}
        variant="success"
      />
    </div>
  );
}

export default ArchivePage;