import React from "react";
import { cn } from "./utils";

export function Badge({ className, variant = "default", ...props }) {
  const styles = {
    default: "bg-neutral-900 text-white",
    outline: "border border-neutral-300",
    success: "bg-green-600 text-white",
    warning: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant] || styles.default,
        className
      )}
      {...props}
    />
  );
}
