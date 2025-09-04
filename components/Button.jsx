// components/buttons.jsx
import React, { forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

/**
 * Universal Button
 * - variant: "primary" | "secondary" | "outline" | "danger" | "ghost" | "link"
 * - size:    "sm" | "md" | "lg" | "icon"
 * - as/href: renders <a> when href is provided (or override with `as`)
 * - isLoading: shows spinner, disables interactions (no "se salvează" text)
 * - leftIcon/rightIcon: React nodes
 * - fullWidth: stretches to container width
 */
const Button = forwardRef(
  (
    {
      as,               // override element (e.g., "a", Link)
      href,
      type = "button",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className,
      children,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const Comp = as ?? (href ? "a" : "button");

    const base =
      "inline-flex items-center justify-center rounded-md font-medium transition " +
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:cursor-not-allowed";

    // Use Tailwind utilities with `!` to resist global overrides.
    const variants = {
      primary:
        "!bg-black !text-white hover:!bg-gray-900 focus-visible:!ring-gray-900",
      secondary:
        "!border !border-gray-300 !bg-white !text-gray-900 hover:!bg-gray-50 focus-visible:!ring-gray-400",
      outline:
        "!border !border-gray-300 !bg-transparent !text-gray-900 hover:!bg-gray-50 focus-visible:!ring-gray-400",
      danger:
        "!bg-red-600 !text-white hover:!bg-red-700 focus-visible:!ring-red-600",
      ghost:
        "!bg-transparent !text-gray-700 hover:!bg-gray-100 focus-visible:!ring-gray-300",
      link:
        "!bg-transparent !p-0 !h-auto !text-blue-600 underline underline-offset-4 hover:!no-underline focus-visible:!ring-blue-600",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-9 w-9 p-0",
    };

    const width = fullWidth ? "w-full" : "";

    const spinner =
      "mr-2 inline-block h-4 w-4 animate-spin rounded-full " +
      (variant === "primary" || variant === "danger"
        ? "!border-2 !border-white/40 !border-t-white"
        : "!border-2 !border-gray-400/40 !border-t-gray-600");

    const classes = twMerge(
      clsx(base, variants[variant], sizes[size], width, className)
    );

    const buttonProps =
      Comp === "button"
        ? { type, disabled: disabled || isLoading }
        : { href };

    return (
      <Comp
        ref={ref}
        className={classes}
        aria-busy={isLoading || undefined}
        aria-disabled={disabled || isLoading || undefined}
        {...buttonProps}
        {...props}
      >
        {isLoading && <span className={spinner} aria-hidden />}
        {leftIcon && size !== "icon" && <span className="mr-2">{leftIcon}</span>}
        {/* hide children when icon-only */}
        {size === "icon" ? leftIcon || rightIcon || null : children}
        {rightIcon && size !== "icon" && <span className="ml-2">{rightIcon}</span>}
      </Comp>
    );
  }
);

export default Button;
