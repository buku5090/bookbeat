import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EditableField({
  value,
  onSave,
  type = "text",
  isPrice = false,
  canEdit = true,
  inputClassName = "",
  placeholder = "",
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || "");
  const [isFree, setIsFree] = useState(isPrice && /^gratis$/i.test(String(value || "")));
  const inputRef = useRef(null);

  const numericOnly = isPrice || type === "number";

  useEffect(() => {
    const v = value?.toString() || "";
    setIsFree(isPrice && /^gratis$/i.test(v));
    setLocalValue(isPrice && /^gratis$/i.test(v) ? "" : v.replace(/[^\d]/g, ""));
  }, [value, isPrice]);

  const cleanDigits = (s) => (s == null ? "" : String(s).replace(/[^\d]/g, ""));

  const handleSave = () => {
    let finalValue = localValue;
    if (isPrice) {
      finalValue = isFree
        ? t("editable_field.is_free")
        : t("editable_field.currency_format", { price: Number(localValue || 0) });
    } else if (type === "number") {
      finalValue = localValue === "" ? "" : String(Number(localValue || 0));
    }
    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const v = value?.toString() || "";
    setIsFree(isPrice && /^gratis$/i.test(v));
    setLocalValue(isPrice && /^gratis$/i.test(v) ? "" : numericOnly ? cleanDigits(v) : v);
    setIsEditing(false);
  };

  return (
    <div className="w-full relative">

      {isEditing ? (
        <div className="space-y-2 mb-1 mt-1">
          {isPrice && (
            <label className="flex items-center gap-2 text-sm select-none">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsFree(checked);
                  if (checked) setLocalValue("");
                }}
              />
              {t("editable_field.is_free")}
            </label>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              className={`border p-2 w-full rounded text-sm ${isFree ? "bg-gray-100" : ""}`}
              value={localValue}
              onChange={(e) => setLocalValue(numericOnly ? cleanDigits(e.target.value) : e.target.value)}
              placeholder={placeholder}
              type="text"
              disabled={isFree}
            />

            <button
              onClick={handleSave}
              className="!bg-green-500 text-white px-3 py-1 rounded text-sm"
              aria-label={t("editable_field.save")}
            >
              ✔
            </button>
            <button
              onClick={handleCancel}
              className="!bg-gray-300 text-black px-3 py-1 rounded text-sm"
              aria-label={t("editable_field.cancel")}
            >
              ✖
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={`flex-1 ${inputClassName}`}>
            {value && String(value).length > 0 ? (
              value
            ) : (
              <span className="italic text-gray-400">{t("editable_field.no_value")}</span>
            )}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-0 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
              aria-label={t("editable_field.edit")}
              type="button"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
