// components/AccountTypeSwitcher.jsx
import React from "react";
import SectionTitle from "./SectionTitle";

/**
 * Nu are selecție implicită: dacă value este null/undefined, ambele sunt inactive.
 * Când userul apasă, trimitem onConfirm({ field: "type", value: "artist" | "location" }).
 */
export default function AccountTypeSwitcher({
  value,               // "artist" | "location" | undefined/null
  onConfirm,
  disabled = false,
  className = "",
  showTitle = true,
}) {
  const setType = (t) => {
    if (disabled || t === value) return;
    onConfirm?.({ field: "type", value: t });
  };

  const base = "flex-1 py-2 px-4 rounded-lg border transition text-sm font-medium";
  const active = "bg-black text-white border-black";
  const inactive = "bg-white text-black border-gray-300 hover:bg-gray-50";

  return (
    <div className={className}>
      {showTitle && <SectionTitle>Tip cont</SectionTitle>}

      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${value === "artist" ? active : inactive}`}
          onClick={() => setType("artist")}
          disabled={disabled}
          aria-pressed={value === "artist"}
        >
          Artist
        </button>
        <button
          type="button"
          className={`${base} ${value === "location" ? active : inactive}`}
          onClick={() => setType("location")}
          disabled={disabled}
          aria-pressed={value === "location"}
        >
          Locație
        </button>
      </div>

      {!value && (
        <p className="mt-2 text-xs text-gray-600">
          Nu ai ales încă tipul de cont. Poți folosi în continuare câmpurile generale.
        </p>
      )}
    </div>
  );
}
