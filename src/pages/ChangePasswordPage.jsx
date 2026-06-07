import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Calendar,
  MapPin,
  Globe,
  Activity,
} from "lucide-react";
import { useToast } from "../shared/Toast";
import authService from "../services/auth";
import { useAuth } from "../context/AuthContext";
import { extractApiError, formatDate } from "../shared/helpers";

function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function validate() {
    if (!current) return "كلمة المرور الحالية مطلوبة";
    if (!next) return "كلمة المرور الجديدة مطلوبة";
    if (next.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (next !== confirm) return "كلمتا المرور غير متطابقتين";

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });

      setSuccess(true);
      toast.success("تم تغيير كلمة المرور بنجاح");

      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const strength = computeStrength(next);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <Link to="/dashboard" className="ep-btn ep-btn-ghost">
          <ArrowRight className="h-3.5 w-3.5" />
          الرجوع
        </Link>

        <div className="flex items-start gap-3 text-right">
          <div>
            <p className="mb-1 text-xs text-slate-400">
              الرئيسية / الإعدادات / تغيير كلمة المرور
            </p>
            <h1 className="text-2xl font-black text-slate-900">تغيير كلمة المرور</h1>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="ep-card-static p-5">
            <p className="mb-3 flex items-center justify-end gap-2 text-right text-xs font-bold text-slate-500">
              الأمن والحماية
              <ShieldCheck className="h-3.5 w-3.5" />
            </p>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                  جيد
                </span>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-3 text-right text-sm font-black text-slate-900">حسابك محمي</p>
              <p className="text-right text-[11px] text-slate-500">لا توجد تهديدات أمنية</p>
            </div>
          </div>

          <div className="ep-card-static p-5">
            <p className="mb-3 flex items-center justify-end gap-2 text-right text-xs font-bold text-slate-500">
              آخر تسجيل دخول
              <Calendar className="h-3.5 w-3.5" />
            </p>

            <div className="space-y-2.5 text-xs">
              <InfoLine
                icon={Calendar}
                label="التاريخ"
                value={formatDate(new Date(), { withTime: false })}
              />
              <InfoLine icon={MapPin} label="الموقع" value={user?.location || "غير متاح"} />
              <InfoLine icon={Globe} label="عنوان IP" value={user?.last_ip || "—"} />
            </div>
          </div>

          <div className="ep-card-static p-5">
            <p className="mb-3 flex items-center justify-end gap-2 text-right text-xs font-bold text-slate-500">
              نشاط الحساب
              <Activity className="h-3.5 w-3.5" />
            </p>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>لا توجد أنشطة مشبوهة في آخر 30 يومًا</span>
            </div>
          </div>
        </aside>

        <main>
          <form onSubmit={handleSubmit} className="ep-card-static p-6">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                تم تغيير كلمة المرور بنجاح. سيتم تحويلك...
              </motion.div>
            )}

            {error && !success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-5">
              <PasswordField
                label="كلمة المرور الحالية"
                required
                value={current}
                onChange={setCurrent}
                show={show.current}
                onToggle={() => setShow((p) => ({ ...p, current: !p.current }))}
                hint="أدخل كلمة المرور الحالية الخاصة بحسابك"
                disabled={loading || success}
              />

              <div>
                <PasswordField
                  label="كلمة المرور الجديدة"
                  required
                  value={next}
                  onChange={setNext}
                  show={show.next}
                  onToggle={() => setShow((p) => ({ ...p, next: !p.next }))}
                  disabled={loading || success}
                />

                {next && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3"
                  >
                    <div className="mb-2 flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition ${
                            i < strength.score ? strength.color : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-right text-[11px] font-bold" style={{ color: strength.text }}>
                      {strength.label}
                    </p>

                    <ul className="mt-3 space-y-1.5 text-right">
                      <PwdRule ok={next.length >= 8} text="8 أحرف على الأقل" />
                      <PwdRule ok={/[A-Z]/.test(next)} text="حرف كبير واحد على الأقل" />
                      <PwdRule ok={/[a-z]/.test(next)} text="حرف صغير واحد على الأقل" />
                      <PwdRule ok={/\d/.test(next)} text="رقم واحد على الأقل" />
                      <PwdRule ok={/[^A-Za-z0-9]/.test(next)} text="رمز خاص واحد على الأقل" />
                    </ul>
                  </motion.div>
                )}
              </div>

              <PasswordField
                label="تأكيد كلمة المرور الجديدة"
                required
                value={confirm}
                onChange={setConfirm}
                show={show.confirm}
                onToggle={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
                hint="أعد إدخال كلمة المرور الجديدة للتأكيد"
                disabled={loading || success}
              />

              <button
                type="submit"
                disabled={loading || success}
                className="ep-btn ep-btn-primary h-12 w-full text-sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                حفظ كلمة المرور
              </button>

              <p className="flex items-center justify-center gap-1 text-center text-[11px] text-slate-500">
                <ShieldCheck className="h-3 w-3" />
                سيتم تسجيل خروجك من جميع الأجهزة الأخرى بعد تغيير كلمة المرور
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-bold text-slate-900">{value}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </span>
    </div>
  );
}

function PasswordField({ label, required, value, onChange, show, onToggle, hint, disabled }) {
  return (
    <div>
      <label className="mb-2 block text-right text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="group relative">
        <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="ep-input h-12 pr-11 pl-11"
        />

        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {hint && <p className="mt-1.5 text-right text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function PwdRule({ ok, text }) {
  return (
    <li className="flex items-center justify-end gap-2 text-[11px]">
      <span className={ok ? "font-bold text-emerald-700" : "text-slate-500"}>{text}</span>
      <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "text-emerald-600" : "text-slate-300"}`} />
    </li>
  );
}

function computeStrength(p) {
  if (!p) {
    return {
      score: 0,
      label: "",
      color: "bg-slate-200",
      text: "#94a3b8",
    };
  }

  let score = 0;

  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;

  const levels = [
    { label: "ضعيفة جداً", color: "bg-rose-400", text: "#e11d48" },
    { label: "ضعيفة", color: "bg-orange-400", text: "#ea580c" },
    { label: "متوسطة", color: "bg-amber-400", text: "#d97706" },
    { label: "جيدة", color: "bg-teal-400", text: "#0d9488" },
    { label: "قوية", color: "bg-emerald-500", text: "#059669" },
  ];

  return { score, ...levels[score] };
}

export default ChangePasswordPage;