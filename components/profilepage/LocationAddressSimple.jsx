// components/LocationAddressSimple.jsx
import React, { useEffect, useState } from "react";

export default function LocationAddressSimple({
  canEdit,
  address,
  googleMapsLink,
  onChange,
}) {
  const [val, setVal] = useState(address || "");

  // dacă se actualizează din props (de ex. după save) – sincronizăm
  useEffect(() => {
    setVal(address || "");
  }, [address]);

  const handleBlur = () => {
    const clean = val.trim();
    onChange?.({
      address: clean,
      googleMapsLink: clean
        ? `https://www.google.com/maps?q=${encodeURIComponent(clean)}`
        : "",
    });
  };

  // MODE VIEW (nu e profilul meu)
  if (!canEdit) {
    if (!address) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-gray-500">
          <span className="text-lg">📍</span>
          <span>Adresă necompletată</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-gray-900">
          <span className="text-lg">📍</span>
          <span className="font-medium">{address}</span>
        </div>

        {googleMapsLink ? (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
          >
            Deschide în Google Maps →
          </a>
        ) : null}
      </div>
    );
  }

  // MODE EDIT
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-800">
        Adresă locație
      </label>

      {/* inputul NOU */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
          🔍
        </span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          placeholder="ex: Str. X nr. Y, București"
          className="w-full rounded-full border border-gray-200 pl-11 pr-4 py-2.5
                     focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-gray-900"
        />
        {val ? (
          <button
            type="button"
            onClick={() => {
              setVal("");
              onChange?.({ address: "", googleMapsLink: "" });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/80 text-white
                       flex items-center justify-center text-xs"
            aria-label="Șterge"
          >
            ×
          </button>
        ) : null}
      </div>

      {/* preview harta – doar dacă avem ceva scris */}
      {/* preview hartă – mereu vizibilă, cu fallback */}
      <div className="rounded-2xl overflow-hidden border border-gray-200">
        <iframe
          title="Google Maps"
          src={
            val.trim()
              ? `https://www.google.com/maps?q=${encodeURIComponent(val.trim())}&z=16&output=embed`
              : "https://www.google.com/maps?q=Bucuresti%2C%20Romania&z=12&output=embed"
          }
            className="w-full h-[240px]"
            loading="lazy"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
          />
      </div>

    </div>
  );
}
