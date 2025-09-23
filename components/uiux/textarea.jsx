import React from "react";
import { cn } from "./utils";

export const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[100px] rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none",
        "focus:ring-2 focus:ring-black/10 focus:border-neutral-400",
        "placeholder:text-neutral-400",
        className
      )}
      {...props}
    />
  );
});
