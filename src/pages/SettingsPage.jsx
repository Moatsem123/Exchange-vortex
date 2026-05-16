import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon, Save, RotateCcw, Building2, DollarSign,
  Bell, Shield, FileText, Loader2,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useToast } from "../shared/Toast";
import { settingsService } from "../services/misc";
import { extractApiError, unwrap } from "../shared/helpers";

const GROUPS = [
  { key: "general", label: "عام", icon: Building2 },
  { key: "financial", label: "مالية", icon: DollarSign },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "security", label: "الأمان", icon: Shield },
  { key: "receipts", label: "الإيصالات", icon: FileText },
];

function SettingsPage() {
  const toast = useToast();
  const [group, setGroup] = useState("general");
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await settingsService.group(group);
      const list = unwrap(res) || [];
      setSettings(Array.isArray(list) ? list : []);
      const v = {};
      (Array.isArray(list) ? list : []).forEach((s) => { v[s.key] = s.value; });
      setValues(v);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [group]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { settings: Object.entries(values).map(([key, value]) => ({ key, value })) };
      await settingsService.update(payload);
      toast.success("تم حفظ الإعدادات");
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setSaving(false); }
  }

  async function handleReset() {
    try {
      await settingsService.resetGroup(group);
      toast.success("تمت إعادة تعيين الإعدادات");
      setConfirmReset(false);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
  }

  function handleChange(key, value) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإعدادات"
        subtitle="إدارة الإعدادات العامة للنظام"
        icon={SettingsIcon}
        actions={
          <>
            <button type="button" onClick={() => setConfirmReset(true)} className="ep-btn ep-btn-ghost">
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة تعيين
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="ep-btn ep-btn-primary">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              حفظ التغييرات
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="ep-card-static p-3 h-fit">
          <ul className="space-y-1">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              const active = group === g.key;
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => setGroup(g.key)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{g.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="ep-card-static p-5">
          {error && !loading ? (
            <ErrorState onRetry={load} />
          ) : loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-14" />)}
            </div>
          ) : settings.length === 0 ? (
            <EmptyState title="لا توجد إعدادات" description="لم يتم العثور على إعدادات في هذه المجموعة" />
          ) : (
            <div className="space-y-5">
              {settings.map((s) => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  value={values[s.key]}
                  onChange={(v) => handleChange(s.key, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="إعادة تعيين الإعدادات"
        description="سيتم إعادة جميع إعدادات هذه المجموعة إلى القيم الافتراضية."
        confirmText="إعادة تعيين"
        variant="danger"
      />
    </div>
  );
}

function SettingRow({ setting, value, onChange }) {
  const type = setting.type || "text";

  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 text-right">
        <p className="font-bold text-slate-900 text-sm">{setting.label || setting.key}</p>
        {setting.description && <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>}
      </div>

      <div className="sm:w-72">
        {type === "boolean" ? (
          <label className="flex items-center justify-end gap-2 cursor-pointer">
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-teal-600" : "bg-slate-300"}`}>
              <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-0.5"}`} />
            </span>
          </label>
        ) : type === "number" ? (
          <input type="number" value={value || 0} onChange={(e) => onChange(parseFloat(e.target.value))} className="ep-input" />
        ) : type === "textarea" ? (
          <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} className="ep-input py-3 resize-none" style={{ height: "auto" }} />
        ) : type === "select" && setting.options ? (
          <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="ep-input appearance-none">
            {setting.options.map((o) => (
              <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
            ))}
          </select>
        ) : (
          <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="ep-input" />
        )}
      </div>
    </div>
  );
}

export default SettingsPage;