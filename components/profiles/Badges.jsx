// components/profiles/Badges.jsx
import React from "react";

export function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] md:text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-full"
      title="Profil verificat"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
      </svg>
      Verificat
    </span>
  );
}

export function UnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] md:text-xs text-amber-300 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full"
      title="Profil neverificat"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-2h2v2z" />
      </svg>
      Neverificat
    </span>
  );
}

export function NewBadge({ className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg ring-1 ring-white/25 backdrop-blur-sm " +
        className
      }
      title="Profil creat recent"
    >
      <span className="text-sm leading-none">✨</span>
      Nou
    </span>
  );
}

export function TypeBadge({ type }) {
  const label = type === "artist" ? "ARTIST" : type === "location" ? "LOCAȚIE" : "PROFIL";
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] md:text-xs uppercase tracking-wide text-white/75 bg-white/5 border border-white/10 backdrop-blur-sm">
      {label}
    </span>
  );
}
