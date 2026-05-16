import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wallet, Loader2, DollarSign } from "lucide-react";

function AddBalanceModal({ open, onClose, onSubmit, currentBalance = 0 }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      setError("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ amount: value, note });
      onClose();
    } catch (err) {
      setError(err?.message || "تعذّر إضافة الرصيد، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
            dir="rtl"
          />

          <div
            className="fixed inset-0 z-[121] flex items-center justify-center p-4"
            dir="rtl"
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              noValidate
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_70px_rgba(15,23,42,0.20)]"
            >
              {/* Header */}
              <div
                className="relative flex items-center justify-between p-5 text-white"
                style={{ background: "linear-gradient(to left, #0a1628, #1e2a44)" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <h3 className="text-base font-black">إضافة رصيد عام</h3>
                    <p className="mt-0.5 text-[11px] text-white/70">
                      الرصيد الحالي: ${Number(currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    المبلغ (USD)
                  </label>
                  <div className="group relative">
                    <DollarSign
                      className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                        error ? "text-rose-500" : "text-slate-400 group-focus-within:text-[#0a1628]"
                      }`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="0.00"
                      autoFocus
                      className={`h-12 w-full rounded-xl border bg-slate-50 pr-11 pl-4 text-right text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-300 hover:bg-white focus:bg-white tabular-nums ${
                        error
                          ? "border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.10)]"
                          : "border-slate-200 focus:border-[#0a1628] focus:shadow-[0_0_0_4px_rgba(10,22,40,0.08)]"
                      }`}
                    />
                  </div>
                  {error && (
                    <p className="mt-1.5 text-[11px] font-bold text-rose-600">{error}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700">
                    ملاحظة (اختياري)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="سبب إضافة الرصيد..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-white focus:border-[#0a1628] focus:bg-white focus:shadow-[0_0_0_4px_rgba(10,22,40,0.08)]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  إلغاء
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-[0_10px_24px_-8px_rgba(10,22,40,0.45)] transition disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: "linear-gradient(to left, #0a1628, #1e2a44)" }}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  <span>{submitting ? "جاري الإضافة..." : "إضافة الرصيد"}</span>
                </motion.button>
              </div>
            </motion.form>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AddBalanceModal;
