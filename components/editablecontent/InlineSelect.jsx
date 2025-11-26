// components/profilepage/InlineSelect.jsx
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { EditableField } from "./EditableField";

export default function InlineSelect({
  value,
  onChange,
  options = [],
  placeholder, // fallback la t('common.select') dacă nu e dat
  otherValue, // 🔹 textul pentru cazul "Altele"
  onOtherChange, // 🔹 callback când se salvează textul de la "Altele"
  canEdit = true,
}) {
  const { t } = useTranslation();
  const ph = placeholder ?? t("common.select");

  const [v, setV] = useState(value || "");

  useEffect(() => {
    setV(value || "");
  }, [value]);

  const isOtherSelected = useMemo(() => {
    if (!v) return false;
    return v.toString().trim().toLowerCase() === "altele";
  }, [v]);

  const handleSelectChange = (e) => {
    const next = e.target.value;
    setV(next);
    onChange?.(next);
  };

  return (
    <div className="w-full space-y-2">
      {/* wrapper modern pentru select */}
      <div className="relative">
        <select
          value={v}
          onChange={handleSelectChange}
          disabled={!canEdit}
          className={`
            w-full appearance-none
            rounded-xl px-3 pr-9 py-2 text-sm
            bg-black/40 text-white
            border border-white/15
            placeholder:text-white/40
            outline-none
            transition
            ${canEdit ? "cursor-pointer" : "cursor-default opacity-70"}
            focus:border-[#9b5cff]
            focus:shadow-[0_0_12px_#9b5cff88]
          `}
          aria-label={ph}
        >
          <option value="">{ph}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* icon de dropdown */}
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/60">
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Dacă e "Altele", apară un EditableField dedesubt */}
      {isOtherSelected && (
        <div className="mt-1">
          <EditableField
            value={otherValue || ""}
            onSave={(val) => onOtherChange?.(val)}
            canEdit={canEdit}
            placeholder={t("profile.location_type_other_placeholder") || "Ce fel de locație este?"}
            inputClassName="mt-1"
          />
        </div>
      )}
    </div>
  );
}
