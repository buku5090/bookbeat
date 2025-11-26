import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

export default function CityAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  showPencil = true,
  onPencilClick,
}) {
  const { t } = useTranslation();
  const ph = placeholder ?? t("city_autocomplete.placeholder");

  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePencil = () => {
    onPencilClick?.();
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setIsFocused(true);
        }}
        onBlur={() => setIsFocused(false)}
        placeholder={ph}
        className="w-full rounded-lg border border-neutral-700 bg-black text-white px-3 pr-10 py-2
                   placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      {/* 👇 Ascunde iconița când editezi (focus sau open = true) */}
      {showPencil && !isFocused && !open && (
        <button
          type="button"
          onClick={handlePencil}
          aria-label="Editează orașul"
          className="absolute top-0 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
        >
          <Pencil size={14} />
        </button>
      )}

      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto
                        bg-black border border-neutral-800 rounded-lg shadow-lg">
          {filtered.map((c) => (
            <div
              key={c.label}
              onClick={() => {
                setQuery(c.label);
                setOpen(false);
                onChange?.(c.label);
              }}
              className="px-3 py-2 text-sm text-white hover:bg-neutral-800 cursor-pointer"
            >
              {c.label}
              {c.county && (
                <span className="text-xs text-neutral-400 ml-1">({c.county})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
