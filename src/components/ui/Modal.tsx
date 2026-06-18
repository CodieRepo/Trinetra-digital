import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  /** Don't show the X close button */
  hideClose?: boolean;
}

const MAX_WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
  hideClose = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`w-full ${MAX_WIDTHS[maxWidth]} bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-black text-slate-800 leading-tight">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
                )}
              </div>
              {!hideClose && (
                <button
                  onClick={onClose}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-pointer bg-transparent"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

const CONFIRM_STYLES = {
  danger:  "bg-rose-600 hover:bg-rose-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
  default: "bg-indigo-600 hover:bg-indigo-700 text-white",
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm" hideClose>
      <div className="space-y-5">
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors border-0 cursor-pointer disabled:opacity-60 ${CONFIRM_STYLES[variant]}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border-0 cursor-pointer disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── PromptDialog (replaces window.prompt) ─────────────────────────────────────

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  submitLabel?: string;
}

export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  defaultValue = "",
  multiline = false,
  submitLabel = "Submit",
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {label && (
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        {multiline ? (
          <textarea
            ref={inputRef as any}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
          />
        ) : (
          <input
            ref={inputRef as any}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors border-0 cursor-pointer disabled:opacity-50"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={() => { setValue(""); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Missing React import for useState
import { useState } from "react";
