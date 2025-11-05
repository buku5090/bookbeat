import React, { useEffect, useRef } from "react";

export default function TopPopup({ open, message, onClose, duration = 2400 }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, duration, onClose, message]);

  return (
    <div
      className={[
        "fixed left-1/2 -translate-x-1/2 top-4 z-[1000]",
        "transition-all duration-300",
        open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="rounded-full bg-red-500 !text-white px-4 py-2 shadow-lg text-sm">
        {message}
      </div>
    </div>
  );
}
