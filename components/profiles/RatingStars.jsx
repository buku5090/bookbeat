import React from "react";

export function RatingStars({ value = 0, outOf = 5 }) {
  const v = Number(value) || 0;
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;
  const empty = Math.max(0, outOf - full - (hasHalf ? 1 : 0));

  const Icon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="currentColor"
      />
    </svg>
  );

  return (
    <div className="flex items-center gap-1">
      {[...Array(full)].map((_, i) => (
        <Icon key={`f${i}`} className="w-4 h-4 text-yellow-400" />
      ))}

      {hasHalf && (
        <div className="relative w-4 h-4">
          <Icon className="absolute inset-0 text-gray-300" />
          <Icon
            className="absolute inset-0 text-yellow-400"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          />
        </div>
      )}

      {[...Array(empty)].map((_, i) => (
        <Icon key={`e${i}`} className="w-4 h-4 text-gray-400/60" />
      ))}

      <span className="ml-1 text-xs text-gray-400">{v.toFixed(1)}</span>
    </div>
  );
}
