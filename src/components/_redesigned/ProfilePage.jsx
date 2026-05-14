import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Pencil,
  Save,
  Shield,
  Mail,
  Phone,
  Building2,
  MapPin,
  CalendarClock,
  LogOut,
  BadgeCheck,
  Wallet,
  TrendingUp,
  Image as ImageIcon,
  Trash2,
  CircleUserRound,
  Star,
} from "lucide-react";

import BrandOrbitLogo from "../shared/BrandOrbitLogo";
import AnimatedNumber from "../shared/AnimatedNumber";

const EASE = [0.22, 1, 0.36, 1];

const initialBalances = [
  { code: "USD", label: "دولار أمريكي", amount: 124750, symbol: "$" },
  { code: "EUR", label: "يورو", amount: 48320, symbol: "€" },
  { code: "AED", label: "درهم إماراتي", amount: 86500, symbol: "د.إ" },
  { code: "SAR", label: "ريال سعودي", amount: 152900, symbol: "ر.س" },
  { code: "JOD", label: "دينار أردني", amount: 21450, symbol: "د.أ" },
  { code: "TRY", label: "ليرة تركية", amount: 38900, symbol: "₺" },
];

function ProfilePage() {
  // Cover image (company banner)
  const [coverImage, setCoverImage] = useState(null);
  const coverInputRef = useRef(null);

  // Company logo
  const [companyLogo, setCompanyLogo] = useState(null);
  const logoInputRef = useRef(null);

  // Profile fields
  const [profile, setProfile] = useState({
    name: "محمد أحمد",
    role: "مدير النظام",
    company: "Exchange Pro - الفرع الرئيسي",
    email: "admin@exchangepro.com",
    phone: "+962 79 123 4567",
    address: "عمّان - شارع الملكة رانيا",
    joinedAt: "2023-04-12",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [savedFlash, setSavedFlash] = useState(false);

  function handleCoverPick(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverImage(url);
  }

  function handleLogoPick(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCompanyLogo(url);
  }

  function startEdit() {
    setDraft(profile);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
  }

  function saveEdit() {
    setProfile(draft);
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1700);
  }

  const totalUsd = useMemo(() => {
    // mock USD equivalent total (just sum of approximate USD value)
    const rates = { USD: 1, EUR: 1.07, AED: 0.27, SAR: 0.27, JOD: 1.41, TRY: 0.031 };
    return initialBalances.reduce(
      (sum, b) => sum + b.amount * (rates[b.code] || 1),
      0
    );
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-5 lg:px-6">
      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleCoverPick(e.target.files?.[0])}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleLogoPick(e.target.files?.[0])}
      />

      {/* Header / Page title */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-5 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            الملف الشخصي
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            بيانات الحساب وشعار الشركة وملخص الرصيد
          </p>
        </div>

        <AnimatePresence>
          {savedFlash && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
            >
              <BadgeCheck className="h-4 w-4" />
              تم حفظ التغييرات
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hero card: cover + avatar + name */}
      <motion.section
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]"
      >
        {/* Cover */}
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 sm:h-56">
          {/* Cover image or placeholder */}
          {coverImage ? (
            <img
              src={coverImage}
              alt="غلاف الشركة"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              {/* decorative pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.12),transparent_55%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_45%,rgba(255,255,255,0.04)_50%,transparent_55%,transparent_100%)]" />
            </>
          )}

          {/* dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />

          {/* Cover actions */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="group flex items-center gap-2 rounded-xl border border-white/20 bg-black/35 px-3 py-2 text-xs font-bold text-white backdrop-blur-md transition-colors duration-300 hover:bg-black/50"
            >
              <Camera className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {coverImage ? "تغيير صورة الشركة" : "إضافة صورة الشركة"}
            </button>

            {coverImage && (
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors duration-300 hover:bg-rose-500/70"
                title="إزالة الصورة"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Empty state hint */}
          {!coverImage && (
            <div className="absolute bottom-4 right-4 hidden items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] font-bold text-white/80 backdrop-blur-md sm:flex">
              <ImageIcon className="h-3.5 w-3.5" />
              اضغط لرفع شعار/غلاف الشركة
            </div>
          )}
        </div>

        {/* Identity row */}
        <div className="relative px-5 pb-6 pt-0 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar + name */}
            <div className="flex items-end gap-4">
              <div className="relative -mt-12 sm:-mt-16">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] sm:h-28 sm:w-28">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="شعار الشركة"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                      <BrandOrbitLogo size={84} withGlow={false} />
                    </div>
                  )}
                </div>

                {/* edit logo button */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-slate-800 text-white shadow-[0_4px_10px_rgba(15,23,42,0.20)] transition-colors duration-300 hover:bg-slate-700"
                  title="تغيير الشعار"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                    {profile.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                    <BadgeCheck className="h-3 w-3" />
                    مفعّل
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {profile.role} · {profile.company}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="group inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-slate-700"
                >
                  <Pencil className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-12deg]" />
                  تعديل البيانات
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-300 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="group inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-slate-700"
                  >
                    <Save className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    حفظ
                  </button>
                </>
              )}

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors duration-300 hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip icon={CalendarClock} label={`عضو منذ ${formatJoined(profile.joinedAt)}`} />
            <Chip icon={Shield} label="صلاحيات إدارية" />
            <Chip icon={Star} label="مستخدم مميز" tone="amber" />
          </div>
        </div>
      </motion.section>

      {/* Balance summary */}
      <motion.section
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* Total balance card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Wallet className="h-4 w-4" />
                إجمالي الرصيد (تقريبي بالدولار)
              </p>
              <h3 className="mt-3 text-3xl font-black">
                $<AnimatedNumber value={Math.round(totalUsd)} duration={1.2} />
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                مكافئ لجميع العملات حسب أسعار اليوم
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="عمليات اليوم" value="24" />
            <MiniStat label="عمليات الشهر" value="612" />
            <MiniStat label="عملاء نشطين" value="138" />
          </div>
        </div>

        {/* Currencies list */}
        <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">
              الرصيد حسب العملة
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {initialBalances.length} عملات
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {initialBalances.map((b, idx) => (
              <motion.div
                key={b.code}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.06 * idx, ease: EASE }}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 transition-colors duration-300 hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xs font-black text-white">
                    {b.code}
                  </span>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">{b.label}</p>
                    <p className="text-sm font-black text-slate-900">
                      {b.symbol}{" "}
                      <AnimatedNumber value={b.amount} duration={1} />
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800"
                >
                  تفاصيل
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Account details form */}
      <motion.section
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-white">
              <CircleUserRound className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                تفاصيل الحساب
              </h3>
              <p className="text-xs text-slate-500">
                بيانات الاتصال والشركة
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            icon={CircleUserRound}
            label="الاسم الكامل"
            value={editing ? draft.name : profile.name}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, name: v })}
          />
          <Field
            icon={Building2}
            label="اسم الشركة"
            value={editing ? draft.company : profile.company}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, company: v })}
          />
          <Field
            icon={Mail}
            label="البريد الإلكتروني"
            value={editing ? draft.email : profile.email}
            editing={editing}
            type="email"
            onChange={(v) => setDraft({ ...draft, email: v })}
          />
          <Field
            icon={Phone}
            label="رقم الجوال"
            value={editing ? draft.phone : profile.phone}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, phone: v })}
          />
          <Field
            icon={MapPin}
            label="العنوان"
            value={editing ? draft.address : profile.address}
            editing={editing}
            onChange={(v) => setDraft({ ...draft, address: v })}
            wide
          />
          <Field
            icon={Shield}
            label="الدور"
            value={profile.role}
            editing={false}
          />
        </div>
      </motion.section>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatJoined(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

function Chip({ icon: Icon, label, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold",
        tones[tone],
      ].join(" ")}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-center backdrop-blur-sm">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-300">{label}</p>
    </div>
  );
}

function Field({ icon: Icon, label, value, editing, onChange, type = "text", wide = false }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {editing && onChange ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-500 focus:shadow-[0_0_0_4px_rgba(30,41,59,0.08)]"
        />
      ) : (
        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/40 px-3 text-right text-sm font-bold text-slate-900">
          {value}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
