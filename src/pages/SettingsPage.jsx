import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  RotateCcw,
  Loader2,
  Building2,
  Mail,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import { useToast } from "../shared/Toast";
import settingsService from "../services/settings";
import { extractApiError } from "../shared/helpers";

const GROUPS = [
  { key: "general", label: "عام", icon: Building2 },
  { key: "contact", label: "التواصل", icon: Mail },
  { key: "security", label: "الأمان", icon: ShieldCheck },
  { key: "financial", label: "المالية", icon: Wallet },
];

const DEFAULT_SETTINGS = {
  general: {
    app_name: "",
    company_name: "",
    timezone: "",
    default_language: "",
  },
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
    website: "",
    address: "",
  },
  security: {
    enable_2fa: false,
    session_timeout_minutes: "",
    password_min_length: "",
    login_attempts_limit: "",
  },
  financial: {
    default_currency: "",
    decimal_places: "",
    large_transaction_threshold: "",
    low_balance_alert_usd: "",
    notify_on_large_transaction: false,
  },
};

const FIELD_CONFIG = {
  app_name: { label: "اسم النظام", type: "text" },
  company_name: { label: "اسم الشركة", type: "text" },
  timezone: { label: "المنطقة الزمنية", type: "text" },
  default_language: { label: "اللغة الافتراضية", type: "text" },

  email: { label: "البريد الإلكتروني", type: "email", dir: "ltr" },
  phone: { label: "رقم الهاتف", type: "text", dir: "ltr" },
  whatsapp: { label: "واتساب", type: "text", dir: "ltr" },
  instagram: { label: "إنستغرام", type: "text", dir: "ltr" },
  facebook: { label: "فيسبوك", type: "text", dir: "ltr" },
  website: { label: "الموقع الإلكتروني", type: "text", dir: "ltr" },
  address: { label: "العنوان", type: "text" },

  enable_2fa: { label: "تفعيل التحقق الثنائي", type: "boolean" },
  session_timeout_minutes: { label: "مدة الجلسة بالدقائق", type: "number", dir: "ltr" },
  password_min_length: { label: "أقل طول لكلمة المرور", type: "number", dir: "ltr" },
  login_attempts_limit: { label: "عدد محاولات الدخول", type: "number", dir: "ltr" },

  default_currency: { label: "العملة الافتراضية", type: "text", dir: "ltr" },
  decimal_places: { label: "عدد الخانات العشرية", type: "number", dir: "ltr" },
  large_transaction_threshold: { label: "حد المعاملة الكبيرة", type: "number", dir: "ltr" },
  low_balance_alert_usd: { label: "تنبيه انخفاض الرصيد بالدولار", type: "number", dir: "ltr" },
  notify_on_large_transaction: { label: "تنبيه عند وجود معاملة كبيرة", type: "boolean" },
};

function unwrapSettings(res) {
  const data = res?.data?.data ?? res?.data ?? res ?? {};

  if (Array.isArray(data)) {
    return data.reduce((acc, item) => {
      const key = item.key || item.name;
      if (key) acc[key] = item.value ?? "";
      return acc;
    }, {});
  }

  if (data.settings && typeof data.settings === "object") return data.settings;
  if (data.values && typeof data.values === "object") return data.values;

  return data;
}

function SettingsPage() {
  const toast = useToast();

  const [activeGroup, setActiveGroup] = useState("general");
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await settingsService.group(activeGroup);
      const values = unwrapSettings(res);
      const merged = {
        ...(DEFAULT_SETTINGS[activeGroup] || {}),
        ...(values || {}),
      };

      setSettings(merged);
      setForm(merged);
    } catch (err) {
      const fallback = DEFAULT_SETTINGS[activeGroup] || {};
      setError(null);
      setSettings(fallback);
      setForm(fallback);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [activeGroup]);

  const entries = useMemo(() => Object.entries(form || {}), [form]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      await settingsService.update({
        group: activeGroup,
        settings: form,
      });

      setSettings(form);
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);

    try {
      await settingsService.resetGroup(activeGroup);
      toast.success("تمت إعادة تعيين الإعدادات");
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setResetting(false);
    }
  }

  const changed = JSON.stringify(settings) !== JSON.stringify(form);
  const activeGroupLabel = GROUPS.find((g) => g.key === activeGroup)?.label;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-right">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
            <Settings className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              الإعدادات
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              إدارة إعدادات النظام العامة والمالية والأمان
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || resetting}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            إعادة تعيين
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !changed}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "hsl(179, 87%, 28%)" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="ep-card-static p-3">
          <div className="space-y-2">
            {GROUPS.map((group) => {
              const Icon = group.icon;
              const active = activeGroup === group.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroup(group.key)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-right text-sm font-black transition",
                    active
                      ? "bg-teal-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span>{group.label}</span>
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </aside>

        <main className="ep-card-static overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 text-right">
            <h2 className="text-lg font-black text-slate-900">
              إعدادات {activeGroupLabel}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              عدّل القيم ثم اضغط حفظ الإعدادات
            </p>
          </div>

          {error && !loading ? (
            <ErrorState
              title="تعذّر تحميل الإعدادات"
              description={extractApiError(error)}
              onRetry={load}
            />
          ) : loading ? (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="ep-skeleton h-20" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Settings}
              title="لا توجد إعدادات"
              description="لم يتم العثور على إعدادات لهذه المجموعة"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 p-5 md:grid-cols-2"
            >
              {entries.map(([key, value]) => {
                const config = FIELD_CONFIG[key] || {
                  label: key,
                  type: typeof value === "number" ? "number" : "text",
                };

                return (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">
                      {config.label}
                    </span>

                    {config.type === "boolean" || typeof value === "boolean" ? (
                      <select
                        value={form[key] ? "1" : "0"}
                        onChange={(e) => updateField(key, e.target.value === "1")}
                        className="ep-input appearance-none"
                      >
                        <option value="1">مفعل</option>
                        <option value="0">غير مفعل</option>
                      </select>
                    ) : (
                      <input
                        type={config.type}
                        value={form[key] ?? ""}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="ep-input"
                        dir={config.dir || "rtl"}
                        placeholder={config.label}
                      />
                    )}
                  </label>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;