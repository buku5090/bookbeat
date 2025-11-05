import React from "react";

export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-[#161616] border border-white/10 p-4 md:p-5 grid grid-cols-[90px_1fr] sm:grid-cols-[110px_1fr] gap-4 min-h-[150px]">
      {/* Imagine / avatar placeholder */}
      <div className="w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] rounded-xl bg-white/5" />

      {/* Text / conținut placeholder */}
      <div className="flex flex-col justify-between">
        <div>
          <div className="h-5 w-3/5 bg-white/10 rounded mb-2" />
          <div className="h-4 w-2/5 bg-white/10 rounded" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
