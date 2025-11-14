/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState("info");
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    setOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const showToast = useCallback((msg, opts = {}) => {
    const duration = opts.duration || 2400;
    const variant = opts.variant || "info";

    setMessage(msg);
    setVariant(variant);

    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);

    timerRef.current = setTimeout(() => setOpen(false), duration);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  const color =
    variant === "success"
      ? "bg-green-500"
      : variant === "error"
      ? "bg-red-500"
      : variant === "warning"
      ? "bg-amber-500"
      : "bg-indigo-600";

  return (
    <ToastContext.Provider value={value}>
      {children}

      {createPortal(
        <div
          className={[
            "fixed left-1/2 z-[9999] -translate-x-1/2",
            "transition-all duration-300",
            "top-4",
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
          ].join(" ")}
          aria-live="polite"
        >
          <div className={`${color} text-white rounded-full px-4 py-2 shadow-lg text-sm`}>
            {message}
          </div>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
