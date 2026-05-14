// =====================================================
// ChangePasswordPage.jsx — ربط مباشر بـ axios، بدون أي service
// المكان المفروض: src/pages/ChangePasswordPage.jsx
// =====================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import BrandOrbitLogo from "../shared/BrandOrbitLogo";
import api from "../services/api"; // 👈 نفس الـ axios instance تبع LoginPage

function ChangePasswordPage() {
  const navigate = useNavigate();

  // 1) state للحقول
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  // 2) إظهار/إخفاء كلمات المرور
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 3) state للتحميل والأخطاء والنجاح
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 4) دالة تغيير كلمة المرور
  async function handleSubmit(event) {
    if (event) event.preventDefault();
    setError("");

    // فحص بسيط قبل الإرسال
    if (!currentPassword || !password || !passwordConfirmation) {
      setError("الرجاء تعبئة جميع الحقول");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      // 👇 نفس أسلوب LoginPage: نداء axios مباشر
      await api.put("/auth/change-password", {
        current_password: currentPassword,
        password: password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(true);

      // بعد ثانيتين رجّعو على الـ Dashboard
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      // معالجة الأخطاء بنفس أسلوب LoginPage
      if (err.response?.status === 401) {
        setError("كلمة المرور الحالية غير صحيحة");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("تعذّر الاتصال بالخادم");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{ background: "#f4f6fb", color: "#0f172a" }}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_2fr]">
        {/* ====================== Form side (light) ====================== */}
        <section
          className="relative order-2 flex min-h-screen items-center justify-center overflow-hidden border-l border-slate-200 px-4 py-8 sm:px-6 md:px-8 lg:order-1 lg:min-h-screen"
          style={{ background: "#ffffff" }}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(45,212,191,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_38%)]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-300/15 blur-3xl" />

          <motion.div
            className="relative z-10 w-full max-w-[380px] sm:max-w-[400px]"
            initial={{ opacity: 0, x: -35, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* زر الرجوع */}
            <motion.button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400/50 hover:text-teal-700"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>الرجوع للوحة التحكم</span>
            </motion.button>

            {/* الهيدر */}
            <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, y: -14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <BrandOrbitLogo size={76} />
              </motion.div>

              <motion.h1
                className="text-2xl font-black tracking-tight sm:text-3xl"
                style={{ color: "#1e293b" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
              >
                تغيير كلمة المرور
              </motion.h1>

              <motion.p
                className="mt-2 text-xs leading-6 sm:text-sm"
                style={{ color: "#64748b" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
              >
                أدخل كلمة المرور الحالية واختر كلمة مرور جديدة آمنة
              </motion.p>

              <motion.div
                className="mt-4 h-[2px] rounded-full bg-gradient-to-l from-transparent via-teal-500 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 78 }}
                transition={{ duration: 0.7, delay: 0.38 }}
              />
            </div>

            {/* البطاقة الرئيسية */}
            <motion.div
              className="rounded-[22px] border border-slate-200 p-4 sm:rounded-[24px] sm:p-5"
              style={{
                background: "#ffffff",
                boxShadow:
                  "0 25px 60px rgba(15,23,42,0.08), 0 1px 0 rgba(15,23,42,0.04)",
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              {/* رسالة نجاح */}
              {success && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    تم تغيير كلمة المرور بنجاح. سيتم تحويلك إلى لوحة التحكم...
                  </span>
                </div>
              )}

              {/* رسالة الخطأ */}
              {error && !success && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* كلمة المرور الحالية */}
                <PasswordField
                  label="كلمة المرور الحالية"
                  icon={KeyRound}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent((s) => !s)}
                  placeholder="••••••••••"
                  delay={0.48}
                  disabled={loading || success}
                />

                {/* كلمة المرور الجديدة */}
                <PasswordField
                  label="كلمة المرور الجديدة"
                  icon={Lock}
                  value={password}
                  onChange={setPassword}
                  show={showNew}
                  onToggleShow={() => setShowNew((s) => !s)}
                  placeholder="على الأقل 8 أحرف"
                  delay={0.55}
                  disabled={loading || success}
                />

                {/* تأكيد كلمة المرور */}
                <PasswordField
                  label="تأكيد كلمة المرور"
                  icon={ShieldCheck}
                  value={passwordConfirmation}
                  onChange={setPasswordConfirmation}
                  show={showConfirm}
                  onToggleShow={() => setShowConfirm((s) => !s)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  delay={0.62}
                  disabled={loading || success}
                />

                {/* زر الإرسال */}
                <motion.button
                  type="submit"
                  disabled={loading || success}
                  className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-black text-white transition duration-300 hover:scale-[1.015] disabled:cursor-not-allowed disabled:opacity-70 sm:h-13 sm:text-base"
                  style={{
                    background: "linear-gradient(to left, #1e293b, #475569)",
                    boxShadow: "0 14px 30px rgba(30,41,59,0.25)",
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.72 }}
                >
                  <span className="absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/30 blur-md transition-all duration-700 group-hover:left-[120%]" />

                  {loading ? (
                    <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
                  ) : success ? (
                    <CheckCircle2 className="relative z-10 h-5 w-5" />
                  ) : (
                    <ArrowLeft className="relative z-10 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  )}

                  <span className="relative z-10">
                    {loading
                      ? "جارٍ التغيير..."
                      : success
                      ? "تم التغيير"
                      : "تغيير كلمة المرور"}
                  </span>
                </motion.button>
              </form>
            </motion.div>

            <motion.p
              className="mt-6 text-center text-[11px] sm:mt-7 sm:text-xs"
              style={{ color: "#94a3b8" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.82 }}
            >
              Exchange Vortex © 2024 — نظام إدارة الصرافة
            </motion.p>
          </motion.div>
        </section>

        {/* ====================== Hero side (dark navy) ====================== */}
        <section
          className="relative order-1 flex min-h-[46vh] items-center justify-center overflow-hidden px-4 py-12 text-white sm:min-h-[52vh] sm:px-6 md:px-8 lg:order-2 lg:min-h-screen lg:px-10 xl:px-16"
          style={{ background: "#1e293b" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#1e293b_0%,#334155_50%,#1e293b_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18),transparent_30%)]" />

          <motion.div
            className="relative z-10 mx-auto w-full max-w-xl px-2 text-center sm:max-w-2xl lg:max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/25 px-3 py-1.5 text-[11px] font-bold sm:mb-5 sm:px-4 sm:py-2 sm:text-xs"
              style={{ background: "rgba(20,184,166,0.10)", color: "#5eead4" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              أمان وحماية حسابك
            </motion.div>

            <motion.h2
              className="text-3xl font-black leading-[1.25] text-white sm:text-4xl md:text-5xl xl:text-6xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.28 }}
            >
              حماية
              <br />
              <span style={{ color: "#2dd4bf" }}>بياناتك المالية</span>
            </motion.h2>

            <motion.p
              className="mx-auto mt-5 max-w-lg text-sm leading-7 sm:mt-7 sm:text-base sm:leading-8 md:max-w-2xl md:text-[17px] md:leading-9"
              style={{ color: "#cbd5e1" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4 }}
            >
              غيّر كلمة المرور بشكل دوري للحفاظ على أعلى مستوى من الأمان. اختر
              كلمة مرور قوية تجمع بين أحرف وأرقام ورموز.
            </motion.p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

// ---------------- مكوّن حقل كلمة المرور ----------------
function PasswordField({
  label,
  icon: Icon,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  delay = 0,
  disabled = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <label
        className="mb-2 block text-xs font-bold sm:text-sm"
        style={{ color: "#334155" }}
      >
        {label}
      </label>

      <div
        className="group flex h-12 items-center rounded-2xl border border-slate-200 px-4 transition-all duration-300 hover:border-teal-400/60 hover:bg-white focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(45,212,191,0.10)] sm:h-13"
        style={{ background: "#f8fafc" }}
      >
        <Icon
          size={17}
          className="text-slate-400 transition-colors group-hover:text-teal-500 group-focus-within:text-cyan-600"
        />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-full w-full bg-transparent px-3 text-right text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          style={{ color: "#0f172a" }}
        />

        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-teal-600"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </motion.div>
  );
}

export default ChangePasswordPage;
