// components/profilepage/CityAutocomplete.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function CityAutocomplete({
  value,
  onChange,
  options,
  placeholder,
}) {
  const { t } = useTranslation();
  const ph = placeholder ?? t("city_autocomplete.placeholder");

  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 30);
    const q = query.toLowerCase();
    return options
      .filter((c) => c.label.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, options]);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={ph}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border rounded-lg shadow-lg">
          {filtered.map((c) => (
            <div
              key={c.label}
              onClick={() => {
                setQuery(c.label);
                setOpen(false);
                onChange?.(c.label);
              }}
              className="px-3 py-2 text-sm text-gray-800 hover:bg-violet-50 cursor-pointer"
            >
              {c.label}
              {c.county ? (
                <span className="text-xs text-gray-400 ml-1">({c.county})</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
