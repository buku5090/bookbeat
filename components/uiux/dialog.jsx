import React, { createContext, useContext, useEffect } from "react";
import { cn } from "./utils";

const DialogCtx = createContext({ open: false, onOpenChange: () => {} });

export function Dialog({ open, onOpenChange, children }) {
  // închidere cu Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <DialogCtx.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogCtx.Provider>
  );
}

export function DialogContent({ className, children }) {
  const { open, onOpenChange } = useContext(DialogCtx);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {/* content */}
      <div
        className={cn(
          "relative z-10 w-[92%] max-w-lg rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-end gap-2 border-t pt-3",
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <p
      className={["text-sm text-neutral-500", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

