import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

function ConfirmDialog({
  open, onClose, onConfirm,
  title = "تأكيد العملية",
  description = "هل أنت متأكد من المتابعة؟",
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  variant = "danger",
  loading = false,
}) {
  const confirmClass =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-teal-600 text-white hover:bg-teal-700";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
              dir="rtl"
            >
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${variant === "danger" ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-600"}`}>
                <motion.div
                  initial={{ rotate: -180, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  <AlertTriangle className="h-7 w-7" />
                </motion.div>
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-lg font-black text-slate-900">{title}</h3>
                <p className="mt-2 text-xs text-slate-500">{description}</p>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-60 ${confirmClass}`}
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;