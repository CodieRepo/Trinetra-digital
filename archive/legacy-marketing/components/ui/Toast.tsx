import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ── Single Toast Item ─────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-emerald-500" />,
  error:   <XCircle    size={16} className="text-rose-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  info:    <Info       size={16} className="text-sky-500" />,
};

const BARS: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error:   "bg-rose-500",
  warning: "bg-amber-500",
  info:    "bg-sky-500",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const duration = toast.duration ?? 4000;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number>(Date.now());
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 10);

    // Progress bar
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);

    // Auto-dismiss
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(t);
      clearTimeout(dismiss);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, toast.id, onRemove]);

  return (
    <div
      className={`relative bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden w-80 transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <div className="shrink-0 mt-0.5">{ICONS[toast.type]}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-tight">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-pointer bg-transparent"
      >
        <X size={12} />
      </button>
      <div className="h-0.5 bg-slate-100">
        <div
          className={`h-full transition-none ${BARS[toast.type]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((opts: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { ...opts, id }]); // max 5
  }, []);

  const ctx: ToastContextValue = {
    toast: add,
    success: (title, message) => add({ type: "success", title, message }),
    error:   (title, message) => add({ type: "error",   title, message }),
    warning: (title, message) => add({ type: "warning", title, message }),
    info:    (title, message) => add({ type: "info",    title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast stack — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
