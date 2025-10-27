import React from "react";
import { cn } from "./utils";

// 🎨 Variante de stil (Tailwind corecte)
const variants = {
  default: "!bg-black !text-white hover:!opacity-90",
  primary: "!bg-black !text-white hover:!opacity-90",
  outline: "!border !border-neutral-300 hover:!bg-neutral-50",
  secondary: "!bg-neutral-200 hover:!bg-neutral-300",
  ghost: "hover:!bg-neutral-100",
  link: "!underline underline-offset-4 !p-0 !bg-transparent",
  destructive: "!bg-red-600 !text-white hover:!bg-red-700",
};

// 📏 Dimensiuni prestabilite
const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6",
  icon: "h-10 w-10 !p-0",
};

// 🧩 Componenta Button
const Button = React.forwardRef(
  (
    {
      className,
      variant = "default",
      size = "md",
      asChild = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? "span" : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {leftIcon && <span className="inline-flex">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="inline-flex">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
export default Button;
