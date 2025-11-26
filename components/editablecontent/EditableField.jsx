import { useState, useEffect, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EditableField({
  value,
  onSave,
  type = "text",
  isPrice = false,
  canEdit = true,
  inputClassName = "",
  placeholder = "",
  suffix = "",
  linkToGoogleMaps = false,   // 🔹 nou: dacă true, view mode = link Google Maps
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || "");
  const [isFree, setIsFree] = useState(
    isPrice && /^gratis$/i.test(String(value || ""))
  );
  const inputRef = useRef(null);

  const numericOnly = isPrice || type === "number";

  useEffect(() => {
    const v = value?.toString() || "";
    const free = isPrice && /^gratis$/i.test(v);
    setIsFree(free);

    if (free) {
      setLocalValue("");
    } else if (numericOnly) {
      // doar pentru preț / număr curățăm la digits-only
      setLocalValue(v.replace(/[^\d]/g, ""));
    } else {
      // pentru adresă lăsăm textul întreg (litere + cifre)
      setLocalValue(v);
    }
  }, [value, isPrice, numericOnly]);


  const cleanDigits = (s) =>
    s == null ? "" : String(s).replace(/[^\d]/g, "");

  const handleSave = () => {
    let finalValue = localValue;

    if (isPrice) {
      finalValue = isFree
        ? t("editable_field.is_free")
        : t("editable_field.currency_format", {
            price: Number(localValue || 0),
          });
    } else if (type === "number") {
      finalValue = localValue === "" ? "" : String(Number(localValue || 0));
    }

    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const v = value?.toString() || "";
    const free = isPrice && /^gratis$/i.test(v);
    setIsFree(free);
    setLocalValue(free ? "" : numericOnly ? cleanDigits(v) : v);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const valueStr = value != null ? String(value) : "";
  const hasValue = valueStr.length > 0;

  // sufix doar în view și doar dacă nu e deja în text (pt. RON)
  const showSuffixInView =
    !!suffix &&
    !isEditing &&
    !(
      isPrice &&
      typeof value === "string" &&
      value.toLowerCase().includes(suffix.toLowerCase())
    );

  // 🔹 nodul care afișează valoarea în VIEW MODE
  const renderDisplayValue = () => {
    if (!hasValue) return null;

    // dacă vrem link către Google Maps
    if (linkToGoogleMaps) {
      return (
        <>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              valueStr
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()} // să nu intre în edit când dai click pe link
          >
            {valueStr}
          </a>
          {showSuffixInView && (
            <span className="text-xs text-white/60 whitespace-nowrap">
              {suffix}
            </span>
          )}
        </>
      );
    }

    // normal (fără link)
    return (
      <>
        {valueStr}
        {showSuffixInView && (
          <span className="text-xs text-white/60 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </>
    );
  };

  return (
    <div className="w-full relative group">
      {isEditing ? (
        <div
          className="
            mt-2 space-y-2 p-3 rounded-xl
            bg-black/60 border border-[#9b5cff]/40
            shadow-[0_0_12px_#9b5cff55]
            backdrop-blur-md
          "
        >
          {isPrice && (
            <button
              type="button"
              onClick={() => {
                const next = !isFree;
                setIsFree(next);
                if (next) setLocalValue("");
                inputRef.current?.focus();
              }}
              className="
                flex items-center gap-2 text-xs font-medium select-none
                text-white/80 hover:text-white transition
              "
            >
              <span
                className={`
                  w-9 h-5 rounded-full relative transition
                  ${isFree ? "bg-[#9b5cff]" : "bg-white/15"}
                `}
              >
                <span
                  className={`
                    absolute top-[2px] w-4 h-4 rounded-full bg-white transition
                    ${isFree ? "left-[18px]" : "left-[2px]"}
                  `}
                />
              </span>
              {t("editable_field.is_free")}
            </button>
          )}

          <div className="flex gap-2 items-center">
            {/* în edit NU afișăm sufix / link */}
            <input
              ref={inputRef}
              className={`
                w-full text-sm px-3 py-2 rounded-lg outline-none transition
                bg-black/40 text-white placeholder:text-white/40
                border border-white/10
                focus:border-[#9b5cff]
                focus:shadow-[0_0_10px_#9b5cffaa]
                ${isFree ? "opacity-60 cursor-not-allowed" : ""}
              `}
              value={localValue}
              onChange={(e) =>
                setLocalValue(
                  numericOnly ? cleanDigits(e.target.value) : e.target.value
                )
              }
              placeholder={placeholder || t("editable_field.placeholder")}
              type="text"
              disabled={isFree}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />

            <button
              onClick={handleSave}
              className="
                h-9 w-9 grid place-items-center rounded-lg
                bg-[#9b5cff] text-white
                shadow-[0_0_10px_#9b5cffcc]
                hover:shadow-[0_0_14px_#b18aff]
                transition
              "
              aria-label={t("editable_field.save")}
              type="button"
            >
              <Check size={16} />
            </button>

            <button
              onClick={handleCancel}
              className="
                h-9 w-9 grid place-items-center rounded-lg
                bg-white/10 text-white/80
                hover:bg-white/15 hover:text-white
                border border-white/10
                transition
              "
              aria-label={t("editable_field.cancel")}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`
            relative flex items-center gap-2
            px-3 py-2 rounded-xl border
            bg-black/40 border-white/10
            hover:border-${canEdit ? "[#9b5cff]/60" : "white/10"}
            hover:bg-black/60
            transition cursor-${canEdit ? "pointer" : "default"}
            ${inputClassName}
          `}
          onClick={() => canEdit && setIsEditing(true)}
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : -1}
          onKeyDown={(e) => {
            if (!canEdit) return;
            if (e.key === "Enter" || e.key === " ") setIsEditing(true);
          }}
        >
          <p className="flex-1 text-sm text-white/90 flex items-center gap-1">
            {hasValue ? (
              renderDisplayValue()
            ) : (
              <span className="italic text-white/40">
                {t("editable_field.no_value")}
              </span>
            )}
          </p>

          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="
                h-8 w-8 grid place-items-center rounded-lg
                bg-[#9b5cff]/10 text-[#c9afff]
                border border-[#9b5cff]/40
                opacity-0 group-hover:opacity-100
                shadow-[0_0_8px_#9b5cff66]
                hover:bg-[#9b5cff]/20 hover:text-white
                transition
              "
              aria-label={t("editable_field.edit")}
              type="button"
              title={t("editable_field.edit")}
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
