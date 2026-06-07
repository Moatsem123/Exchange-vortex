import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck,
  Loader2, AlertCircle, Headphones,
} from "lucide-react";
import BrandOrbitLogo from "../shared/BrandOrbitLogo";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../shared/Toast";
import { extractApiError } from "../shared/helpers";

function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function validate() {
    let ok = true;
    if (!email.trim()) {
      setEmailError("الرجاء إدخال البريد الإلكتروني");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("الرجاء إدخال بريد إلكتروني صحيح");
      ok = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("الرجاء إدخال كلمة المرور");
      ok = false;
    } else {
      setPasswordError("");
    }
    return ok;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("تم تسجيل دخولك بنجاح");
    } catch (err) {
      setError(extractApiError(err, "تعذّر تسجيل الدخول"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "#f4f6fb" }}>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-10 sm:px-8 lg:order-2">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(13,148,136,0.16)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-300/15 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 w-full max-w-[420px]"
          >
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="mb-5 inline-block"
              >
                <BrandOrbitLogo size={64} />
              </motion.div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-2xl font-black text-slate-900 sm:text-3xl"
              >
                مرحباً بك مجدداً
              </motion.h1>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-2 text-sm text-slate-500"
              >
                سجّل الدخول للوصول إلى لوحة التحكم
              </motion.p>
            </div>

            <motion.form
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.4 }}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.06)]"
            >
              {error && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">البريد الإلكتروني</label>
                <div className="group relative">
                  <Mail
                    className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      emailError ? "text-rose-500" : "text-slate-400 group-focus-within:text-teal-600"
                    }`}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="أدخل بريدك الإلكتروني"
                    autoComplete="email"
                    className={`h-12 w-full rounded-xl border bg-slate-50 pr-11 pl-4 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-white focus:bg-white ${
                      emailError
                        ? "border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
                        : "border-slate-200 focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(13,148,136,0.12)]"
                    }`}
                  />
                </div>
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </motion.p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="text-[11px] font-bold text-[#0f766e] focus:outline-none"
                  >
                    نسيت كلمة المرور؟
                  </button>
                  <label className="block text-xs font-bold text-slate-700">كلمة المرور</label>
                </div>
                <div className="group relative">
                  <Lock
                    className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      passwordError ? "text-rose-500" : "text-slate-400 group-focus-within:text-teal-600"
                    }`}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="أدخل كلمة المرور"
                    autoComplete="current-password"
                    className={`h-12 w-full rounded-xl border bg-slate-50 pr-11 pl-11 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-white focus:bg-white ${
                      passwordError
                        ? "border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.12)]"
                        : "border-slate-200 focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(13,148,136,0.12)]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-600"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </motion.p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#0a1628]">
                <span className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-[#0a1628] bg-white peer-checked:border-[#0a1628] peer-checked:bg-[#0a1628]">
                    {remember && (
                      <svg viewBox="0 0 20 20" className="h-3 w-3 text-white" fill="currentColor">
                        <path d="M7.629 14.571L4.343 11.286l1.414-1.414L7.63 11.743l6.628-6.628 1.414 1.414z" />
                      </svg>
                    )}
                  </span>
                </span>
                <span>تذكّرني</span>
              </label>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-black text-white shadow-[0_14px_30px_-8px_rgba(10,22,40,0.45)] transition disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: "linear-gradient(to left, #0a1628, #1e2a44)" }}
              >
                <span className="pointer-events-none absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/30 blur-md transition-all duration-700 group-hover:left-[120%]" />
                {loading ? (
                  <Loader2 className="relative z-10 h-5 w-5 animate-spin" />
                ) : (
                  <ArrowLeft className="relative z-10 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                )}
                <span className="relative z-10">{loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}</span>
              </motion.button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] font-bold text-slate-400">أو</span>
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Headphones className="h-4 w-4" />
                <div className="text-right">
                  <p className="font-bold">هل تواجه مشكلة في تسجيل الدخول؟</p>
                  <p className="text-[11px] text-slate-400">تواصل مع الدعم الفني</p>
                </div>
              </button>
            </motion.form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-[11px] text-slate-400"
            >
              <span>جميع الحقوق محفوظة © {new Date().getFullYear()} نظام إدارة الصرافة</span>
              <span className="inline-flex items-center gap-1 text-teal-600">
                <ShieldCheck className="h-3 w-3" />
                <span className="font-bold">آمن وموثوق</span>
              </span>
            </motion.p>
          </motion.div>
        </section>

        <section
          className="relative hidden min-h-screen w-full items-center justify-center overflow-hidden lg:order-1 lg:flex lg:rounded-l-[1.75rem]"
          style={{ background: "#0a1628" }}
        >
          <motion.img
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src="/login-hero-bg-right.png"
            alt="نظام إدارة الصرافة"
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
        </section>
      </div>
    </div>
  );
}

export default LoginPage;