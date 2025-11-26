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
    md: "text-xl md:text-2xl font-extrabold",
  };

  const titleClasses = twMerge(
    clsx(
      sizeMap[size],
      "leading-tight tracking-tight",
      uppercase && "uppercase",

      // Neon profesional, violet soft
      "text-white",
      "![text-shadow:0_0_7px_rgba(168,85,247,0.65),0_0_18px_rgba(168,85,247,0.45)]",

      className
    )
  );

  return (
    <div
      className={twMerge(
        "mb-3 md:mb-4 pb-2",

        // Border violet, clar definit
        "!border-b !border-[#a855f7]/80",

        wrapperClassName
      )}
    >

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <Tag className={titleClasses}>{children}</Tag>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {subtitle && (
        <p className="mt-1 text-sm md:text-base text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
