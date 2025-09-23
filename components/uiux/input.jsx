import React from "react";
import { cn } from "./utils";

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none",
        "focus:ring-2 focus:ring-black/10 focus:border-neutral-400",
        "placeholder:text-neutral-400",
        className
      )}
      {...props}
    />
  );
});
