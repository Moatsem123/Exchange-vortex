import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Building2,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  Coins,
  FileText,
  Globe,
  Info,
  Languages,
  MapPin,
  Palette,
  Phone,
  Receipt,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sliders,
  Type,
} from "lucide-react";

import ScrollReveal from "../shared/ScrollReveal";

const tabs = [
  { id: "general", label: "عام", icon: Building2, desc: "بيانات المحل والإعدادات الأساسية" },
  { id: "financial", label: "مالي", icon: Calculator, desc: "العملة والتنبيهات المالية" },
  { id: "display", label: "العرض", icon: Palette, desc: "المظهر، اللغة، اتجاه الواجهة" },
  { id: "receipt", label: "الإيصالات", icon: Receipt, desc: "تخصيص إيصالات الطباعة" },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  // General
  const [general, setGeneral] = useState({
    shop_name: "Exchange Pro",
    shop_phone: "0599000000",
    shop_address: "—",
    default_currency: "USD",
    timezone: "Asia/Jerusalem",
    date_format: "DD/MM/YYYY",
  });

  // Financial
  const [financial, setFinancial] = useState({
    decimal_places: 2,
    low_balance_alert_usd: 0,
    large_transaction_threshold: 10000,
    notify_on_large_transaction: false,
  });

  // Display
  const [display, setDisplay] = useState({
    language: "ar",
    direction: "rtl",
    items_per_page: 20,
    show_usd_equivalent: true,
  });

  // Receipt
  const [receipt, setReceipt] = useState({
    receipt_show_logo: true,
    receipt_show_phone: true,
    receipt_footer_text: "شكراً لتعاملكم معنا",
    receipt_language: "ar",
  });

  function handleSave() {
    const payload = { general, financial, display, receipt };
    console.log("Settings payload:", payload);
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page header */}
      <ScrollReveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              الإعدادات
            </h1>
            <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
              تخصيص بيانات المحل، الإعدادات المالية، عرض الواجهة، والإيصالات.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-slate-700 active:bg-slate-900"
          >
            <Save className="h-4 w-4" />
            <span>حفظ كل التغييرات</span>
          </button>
        </div>
      </ScrollReveal>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Tabs sidebar */}
        <ScrollReveal delay={0.05}>
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition-colors duration-200",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                      isActive
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p
                      className={[
                        "text-sm font-bold",
                        isActive ? "text-white" : "text-slate-800",
                      ].join(" ")}
                    >
                      {tab.label}
                    </p>
                    <p
                      className={[
                        "mt-0.5 truncate text-[11px]",
                        isActive ? "text-slate-300" : "text-slate-500",
                      ].join(" ")}
                    >
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Active tab content */}
        <ScrollReveal delay={0.1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === "general" && (
                <GeneralPanel data={general} setData={setGeneral} />
              )}
              {activeTab === "financial" && (
                <FinancialPanel data={financial} setData={setFinancial} />
              )}
              {activeTab === "display" && (
                <DisplayPanel data={display} setData={setDisplay} />
              )}
              {activeTab === "receipt" && (
                <ReceiptPanel data={receipt} setData={setReceipt} />
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollReveal>
      </div>
    </div>
  );
}

/* ─────────── Panels ─────────── */

function GeneralPanel({ data, setData }) {
  return (
    <Panel title="بيانات المحل" subtitle="المعلومات العامة للصرافة">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المحل" icon={Building2}>
          <input
            type="text"
            value={data.shop_name}
            onChange={(e) => setData({ ...data, shop_name: e.target.value })}
            className="settings-input"
          />
        </Field>
        <Field label="رقم الهاتف" icon={Phone}>
          <input
            type="tel"
            value={data.shop_phone}
            onChange={(e) => setData({ ...data, shop_phone: e.target.value })}
            className="settings-input"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="العنوان" icon={MapPin}>
            <input
              type="text"
              value={data.shop_address}
              onChange={(e) => setData({ ...data, shop_address: e.target.value })}
              placeholder="مثال: شارع الملك فيصل، عمّان"
              className="settings-input"
            />
          </Field>
        </div>

        <SelectField label="العملة الافتراضية" icon={Coins}>
          <select
            value={data.default_currency}
            onChange={(e) => setData({ ...data, default_currency: e.target.value })}
            className="settings-input appearance-none"
          >
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="AED">درهم إماراتي (AED)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="JOD">دينار أردني (JOD)</option>
            <option value="TRY">ليرة تركية (TRY)</option>
          </select>
        </SelectField>

        <SelectField label="المنطقة الزمنية" icon={Globe}>
          <select
            value={data.timezone}
            onChange={(e) => setData({ ...data, timezone: e.target.value })}
            className="settings-input appearance-none"
          >
            <option value="Asia/Jerusalem">القدس (GMT+3)</option>
            <option value="Asia/Riyadh">الرياض (GMT+3)</option>
            <option value="Asia/Dubai">دبي (GMT+4)</option>
            <option value="Asia/Amman">عمّان (GMT+3)</option>
            <option value="Asia/Istanbul">إسطنبول (GMT+3)</option>
          </select>
        </SelectField>

        <SelectField label="تنسيق التاريخ" icon={Calendar}>
          <select
            value={data.date_format}
            onChange={(e) => setData({ ...data, date_format: e.target.value })}
            className="settings-input appearance-none"
          >
            <option value="DD/MM/YYYY">31/12/2026</option>
            <option value="MM/DD/YYYY">12/31/2026</option>
            <option value="YYYY-MM-DD">2026-12-31</option>
          </select>
        </SelectField>
      </div>

      <PanelFooter />
    </Panel>
  );
}

function FinancialPanel({ data, setData }) {
  return (
    <Panel title="الإعدادات المالية" subtitle="عدد الخانات العشرية، التنبيهات والحدود">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عدد الخانات العشرية" icon={Sliders}>
          <input
            type="number"
            min="0"
            max="6"
            value={data.decimal_places}
            onChange={(e) =>
              setData({ ...data, decimal_places: Number(e.target.value) })
            }
            className="settings-input"
          />
        </Field>

        <Field label="حد التنبيه للرصيد المنخفض (USD)" icon={Calculator}>
          <input
            type="number"
            min="0"
            value={data.low_balance_alert_usd}
            onChange={(e) =>
              setData({ ...data, low_balance_alert_usd: Number(e.target.value) })
            }
            className="settings-input"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="حد العملية الكبيرة (USD)" icon={ShieldCheck}>
            <input
              type="number"
              min="0"
              value={data.large_transaction_threshold}
              onChange={(e) =>
                setData({
                  ...data,
                  large_transaction_threshold: Number(e.target.value),
                })
              }
              className="settings-input"
            />
          </Field>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <Info className="h-3 w-3" />
            عند تجاوز هذا الحد سيُرسَل إشعار للمالك إذا فُعّل التنبيه أدناه.
          </p>
        </div>

        <div className="sm:col-span-2">
          <ToggleField
            label="تفعيل تنبيه العمليات الكبيرة"
            desc="إشعار فوري للمالك عند تجاوز الحد"
            checked={data.notify_on_large_transaction}
            onChange={(v) => setData({ ...data, notify_on_large_transaction: v })}
            icon={Bell}
          />
        </div>
      </div>

      <PanelFooter />
    </Panel>
  );
}

function DisplayPanel({ data, setData }) {
  return (
    <Panel title="إعدادات العرض" subtitle="اللغة، اتجاه الواجهة، عدد العناصر">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="اللغة" icon={Languages}>
          <select
            value={data.language}
            onChange={(e) => setData({ ...data, language: e.target.value })}
            className="settings-input appearance-none"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </SelectField>

        <div>
          <FieldLabel>اتجاه الواجهة</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <SegmentButton
              active={data.direction === "rtl"}
              onClick={() => setData({ ...data, direction: "rtl" })}
              label="يمين لليسار (RTL)"
            />
            <SegmentButton
              active={data.direction === "ltr"}
              onClick={() => setData({ ...data, direction: "ltr" })}
              label="يسار لليمين (LTR)"
            />
          </div>
        </div>

        <Field label="عدد العناصر بالصفحة" icon={Type}>
          <input
            type="number"
            min="5"
            max="100"
            step="5"
            value={data.items_per_page}
            onChange={(e) =>
              setData({ ...data, items_per_page: Number(e.target.value) })
            }
            className="settings-input"
          />
        </Field>

        <div className="sm:col-span-2">
          <ToggleField
            label="إظهار المعادل بالدولار"
            desc="يظهر تحت كل مبلغ بالعملة المحلية"
            checked={data.show_usd_equivalent}
            onChange={(v) => setData({ ...data, show_usd_equivalent: v })}
            icon={Coins}
          />
        </div>
      </div>

      <PanelFooter />
    </Panel>
  );
}

function ReceiptPanel({ data, setData }) {
  return (
    <Panel title="الإيصالات" subtitle="تخصيص الإيصال المطبوع">
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="إظهار الشعار"
          desc="شعار المحل في رأس الإيصال"
          checked={data.receipt_show_logo}
          onChange={(v) => setData({ ...data, receipt_show_logo: v })}
          icon={Building2}
        />
        <ToggleField
          label="إظهار رقم الهاتف"
          desc="يظهر تحت اسم المحل"
          checked={data.receipt_show_phone}
          onChange={(v) => setData({ ...data, receipt_show_phone: v })}
          icon={Phone}
        />

        <div className="sm:col-span-2">
          <Field label="نص أسفل الإيصال" icon={FileText}>
            <input
              type="text"
              value={data.receipt_footer_text}
              onChange={(e) =>
                setData({ ...data, receipt_footer_text: e.target.value })
              }
              placeholder="مثال: شكراً لتعاملكم معنا"
              className="settings-input"
            />
          </Field>
        </div>

        <SelectField label="لغة الإيصال" icon={Languages}>
          <select
            value={data.receipt_language}
            onChange={(e) =>
              setData({ ...data, receipt_language: e.target.value })
            }
            className="settings-input appearance-none"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="bilingual">عربي + English</option>
          </select>
        </SelectField>
      </div>

      <PanelFooter />
    </Panel>
  );
}

/* ─────────── Sub-components ─────────── */

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 border-b border-slate-200 pb-4 text-right">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}

      <style>{`
        .settings-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: 0;
          padding: 0 12px;
          text-align: right;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          font-family: inherit;
        }
        .settings-input::placeholder { color: #94a3b8; }
        .settings-input.appearance-none {
          padding-left: 36px;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: 12px center;
        }
      `}</style>
    </div>
  );
}

function PanelFooter() {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <span className="text-[11px] text-slate-500">
        التغييرات تحفظ تلقائياً عند الضغط على زر "حفظ كل التغييرات"
      </span>
      <Info className="h-3.5 w-3.5 text-slate-400" />
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="mb-2 block text-right text-xs font-bold text-slate-700">
      {children}
    </label>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition-colors duration-200 hover:bg-white focus-within:border-slate-400 focus-within:bg-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        {children}
      </div>
    </div>
  );
}

function SelectField({ label, icon: Icon, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition-colors duration-200 hover:bg-white focus-within:border-slate-400 focus-within:bg-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        {children}
      </div>
    </div>
  );
}

function SegmentButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-12 rounded-xl border px-3 text-xs font-bold transition-colors duration-200",
        active
          ? "border-slate-700 bg-slate-800 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ToggleField({ label, desc, checked, onChange, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-right transition-colors duration-200 hover:bg-white"
    >
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {desc && <p className="mt-0.5 text-[11px] text-slate-500">{desc}</p>}
      </div>

      <div
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-slate-800" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200",
            checked ? "right-0.5" : "right-[22px]",
          ].join(" ")}
        />
      </div>
    </button>
  );
}

export default SettingsPage;
