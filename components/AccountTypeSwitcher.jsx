// components/AccountTypeSwitcher.jsx
import React from "react";
import SectionTitle from "./SectionTitle";

/**
 * Comportament:
 * - Dacă value este "artist" sau "location", butonul activ e stilizat.
 * - Când utilizatorul apasă pe un tip (chiar dacă e deja selectat),
 *   trimitem onConfirm({ field: "type", value: "artist" | "location" }).
 *   ProfilePage face toggle-ul: dacă a fost apăsat tipul deja selectat => setează "user".
 */
export default function AccountTypeSwitcher({
  value,               // "user" | "artist" | "location" | undefined/null
  onConfirm,
  disabled = false,
  className = "",
  showTitle = true,
}) {
  const setType = (t) => {
    if (disabled) return;
    onConfirm?.({ field: "type", value: t }); // IMPORTANT: trimitem și dacă t === value
  };

  const base = "flex-1 py-2 px-4 rounded-lg border transition text-sm font-medium";
  const active = "!bg-black !text-white border-black";
  const inactive = "!bg-white !text-black !border-gray-300 hover:bg-gray-50";

  const isArtist = value === "artist";
  const isLocation = value === "location";

  return (
    <div className={className}>
      {showTitle && <SectionTitle>Tip cont</SectionTitle>}

      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${isArtist ? active : inactive}`}
          onClick={() => setType("artist")}
          disabled={disabled}
          aria-pressed={isArtist}
          aria-label="Setează tipul de cont Artist (apasă din nou pentru a reveni la cont user)"
          title="Click din nou pe Artist ca să revii la cont user"
        >
          Artist
        </button>

        <button
          type="button"
          className={`${base} ${isLocation ? active : inactive}`}
          onClick={() => setType("location")}
          disabled={disabled}
          aria-pressed={isLocation}
          aria-label="Setează tipul de cont Locație (apasă din nou pentru a reveni la cont user)"
          title="Click din nou pe Locație ca să revii la cont user"
        >
          Locație
        </button>
      </div>

      {!isArtist && !isLocation && (
        <p className="mt-2 text-xs text-gray-600">
          Tip curent: <span className="font-medium">user</span>. Poți comuta la <em>Artist</em> sau <em>Locație</em>.
        </p>
      )}

      {(isArtist || isLocation) && (
        <p className="mt-2 text-xs text-gray-600">
          Tip curent: <span className="font-medium">{value}</span>. Apasă din nou pe același buton pentru a reveni la <em>user</em>.
        </p>
      )}
    </div>
  );
}
