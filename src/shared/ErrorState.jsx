import { AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

function ErrorState({ title = "حدث خطأ", description = "", onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
        <AlertCircle className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-700">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500 max-w-md">{description}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ep-btn ep-btn-ghost">
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </button>
      )}
    </motion.div>
  );
}

export default ErrorState;