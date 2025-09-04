// components/SectionTitle.jsx
import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export default function SectionTitle({
  as = "h3",
  size = "md",
  uppercase = true,
  icon,
  actions,
  subtitle,
  className,
  wrapperClassName,
  children,
}) {
  const Tag = as;

  const sizeMap = {
    sm: "text-lg md:text-xl font-bold",
    md: "text-xl md:text-2xl font-extrabold",
    lg: "text-2xl md:text-3xl font-extrabold",
  };

  const titleClasses = twMerge(
    clsx(
      sizeMap[size],
      "leading-tight tracking-tight",
      uppercase && "uppercase",
      className
    )
  );

  return (
    <div className={twMerge("mb-3 md:mb-4", wrapperClassName)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <Tag className={titleClasses}>{children}</Tag>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {subtitle ? <p className="mt-1 text-sm md:text-base text-gray-500">{subtitle}</p> : null}
    </div>
  );
}
