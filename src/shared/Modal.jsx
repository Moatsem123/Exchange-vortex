import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

function Modal({ open, onClose, title, subtitle, icon: Icon, children, footer, size = "md" }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto w-full ${sizes[size]} rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15`}
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-start gap-3 text-right flex-1">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
                  </div>
                  {Icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

              {footer && (
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Modal;