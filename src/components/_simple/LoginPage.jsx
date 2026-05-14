// =====================================================
// LoginPage.jsx — نفس صفحتك بس مربوطة بالـ API
// المكان المفروض: src/pages/LoginPage.jsx
// =====================================================
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, EyeOff, ArrowLeft } from "lucide-react";
import BrandOrbitLogo from "../shared/BrandOrbitLogo";
import api from "../services/api";

function LoginPage({ onLogin }) {
  // 1) state للحقول والتحميل والخطأ
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2) دالة تسجيل الدخول
  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      // نادي الـ API
      const res = await api.post("/auth/login", { email, password });

      // التوكن جاي بـ res.data.data.token (شفناه بملف .bru)
      const token = res.data.data.token;

      // 3) خزّن التوكن وضيفو لكل الطلبات الجاية
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // 4) بلّغ App.jsx إنه المستخدم سجل
      onLogin();
    } catch (err) {
      // أخطاء Laravel: 401 = بيانات غلط، 422 = validation
      if (err.response?.status === 401) {
        setError("البريد أو كلمة المرور غير صحيحة");
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
        {/* Login form side (light) */}
        <section
          className="relative order-2 flex min-h-screen items-center justify-center overflow-hidden border-l border-slate-200 px-4 py-8 sm:px-6 md:px-8 lg:order-1 lg:min-h-screen"
          style={{ background: "#ffffff" }}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(45,212,191,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.08),transparent_38%)]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-300/15 blur-3xl" />

          <motion.div
            className="relative z-10 w-full max-w-[360px] sm:max-w-[380px]"
            initial={{ opacity: 0, x: -35, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
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
                مرحباً بعودتك
              </motion.h1>

              <motion.p
                className="mt-2 text-xs leading-6 sm:text-sm"
                style={{ color: "#64748b" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
              >
                الرجاء إدخال بيانات الاعتماد للوصول إلى النظام
              </motion.p>

              <motion.div
                className="mt-4 h-[2px] rounded-full bg-gradient-to-l from-transparent via-teal-500 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 78 }}
                transition={{ duration: 0.7, delay: 0.38 }}
              />
            </div>

            {/* Form card */}
            <motion.div
              className="rounded-[22px] border border-slate-200 p-4 sm:rounded-[24px] sm:p-5"
              style={{
                background: "#ffffff",
                boxShadow: "0 25px 60px rgba(15,23,42,0.08), 0 1px 0 rgba(15,23,42,0.04)",
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              {/* رسالة الخطأ */}
              {error && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.48 }}
                >
                  <label
                    className="mb-2 block text-xs font-bold sm:text-sm"
                    style={{ color: "#334155" }}
                  >
                    البريد الإلكتروني
                  </label>

                  <div
                    className="group flex h-12 items-center rounded-2xl border border-slate-200 px-4 transition-all duration-300 hover:border-teal-400/60 hover:bg-white focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(45,212,191,0.10)] sm:h-13"
                    style={{ background: "#f8fafc" }}
                  >
                    <User
                      size={17}
                      className="text-slate-400 transition-colors group-hover:text-teal-500 group-focus-within:text-cyan-600"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="h-full w-full bg-transparent px-3 text-right text-sm outline-none placeholder:text-slate-400"
                      style={{ color: "#0f172a" }}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.6 }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      className="text-xs font-bold sm:text-sm"
                      style={{ color: "#334155" }}
                    >
                      كلمة المرور
                    </label>

                    <button
                      type="button"
                      className="text-[11px] font-bold transition hover:opacity-80 sm:text-xs"
                      style={{ color: "#0d9488" }}
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  <div
                    className="group flex h-12 items-center rounded-2xl border border-slate-200 px-4 transition-all duration-300 hover:border-teal-400/60 hover:bg-white focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(45,212,191,0.10)] sm:h-13"
                    style={{ background: "#f8fafc" }}
                  >
                    <Lock
                      size={17}
                      className="text-slate-400 transition-colors group-hover:text-teal-500 group-focus-within:text-cyan-600"
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="h-full w-full bg-transparent px-3 text-right text-sm outline-none placeholder:text-slate-400"
                      style={{ color: "#0f172a" }}
                    />

                    <EyeOff
                      size={17}
                      className="text-slate-400 transition-colors group-hover:text-teal-500 group-focus-within:text-cyan-600"
                    />
                  </div>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
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

                  <ArrowLeft
                    size={18}
                    className="relative z-10 transition-transform group-hover:-translate-x-1"
                  />

                  <span className="relative z-10">
                    {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
                  </span>
                </motion.button>
              </div>
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

        {/* Hero side (dark navy) */}
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
              style={{
                background: "rgba(20,184,166,0.10)",
                color: "#5eead4",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              منصة الصرافة المؤسسية
            </motion.div>

            <motion.h2
              className="text-3xl font-black leading-[1.25] text-white sm:text-4xl md:text-5xl xl:text-6xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.28 }}
            >
              الدقة في
              <br />
              <span style={{ color: "#2dd4bf" }}>الأسواق العالمية</span>
            </motion.h2>

            <motion.p
              className="mx-auto mt-5 max-w-lg text-sm leading-7 sm:mt-7 sm:text-base sm:leading-8 md:max-w-2xl md:text-[17px] md:leading-9"
              style={{ color: "#cbd5e1" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4 }}
            >
              منصة مؤسسية متطورة لإدارة الصرافة، تمنحك تحكماً مطلقاً ورؤية
              دقيقة في تعقيدات الأسواق المالية.
            </motion.p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
