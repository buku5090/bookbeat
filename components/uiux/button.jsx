import React from "react";
import { cn } from "./utils";

const variants = {
  default: "bg-black! text-white! hover:opacity-90!",
  outline: "border! border-neutral-300! hover:bg-neutral-50!",
  secondary: "!bg-neutral-200 hover:!bg-neutral-300",
  ghost: "hover:bg-neutral-100!",
  link: "underline! underline-offset-4 p-0",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6",
  icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef(function Button(
  {
    className,
    variant = "default",
    size = "md",
    asChild,
    leftIcon,   // ✅ consumăm aici
    rightIcon,  // ✅ și aici
    children,
    ...props    // ❗ fără leftIcon/rightIcon în DOM
  },
  ref
) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {leftIcon ? <span className="inline-flex">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
    </Comp>
  );
});
