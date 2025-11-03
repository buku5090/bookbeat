// PENTRU EDITUL TEXTULUI DIN PROFIL

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

export function EditableField({
  label,
  value,
  onSave,
  type = "text",
  isPrice = false,
  canEdit = true,
  inputClassName = "",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");
  const [isFree, setIsFree] = useState(value === "Gratis");

  useEffect(() => {
    if (value === "Gratis") {
      setIsFree(true);
      setLocalValue("");
    } else {
      setIsFree(false);
      setLocalValue(value?.toString() || "");
    }
  }, [value]);

  const handleSave = () => {
    const finalValue = isPrice
      ? isFree
        ? "Gratis"
        : `${Number(localValue)} RON / set`
      : localValue;

    onSave(finalValue);
    setIsEditing(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="text-xl font-bold mb-2 !uppercase">
          {label}
        </label>
      )}

      {isEditing ? (
        <div className="space-y-2 mb-1 mt-1">
          {isPrice && (
            <label className="flex items-center gap-2 text-sm">
              <input
                className={`border p-2 w-full rounded text-sm ${isFree ? "bg-gray-100" : ""}`}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onInput={(e) => {
                  if (type === "number") e.target.value = e.target.value.replace(/\D/g, "");
                }}
                onKeyDown={(e) => {
                  if (type === "number" && ["e", "E", "+", "-", "."].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                type={isPrice ? "number" : type}
                disabled={isFree}
              />

              Este gratis
            </label>
          )}
          <div className="flex gap-2">
            <input
              className={`border p-2 w-full rounded text-sm ${isFree ? "bg-gray-100" : ""}`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              type={isPrice ? "number" : type}
              disabled={isFree}
            />
            <button
              onClick={handleSave}
              className="!bg-green-500 text-white px-3 py-1 rounded text-sm"
            >
              ✔
            </button>
            <button
              onClick={() => {
                setLocalValue(value === "Gratis" ? "" : value || "");
                setIsFree(value === "Gratis");
                setIsEditing(false);
              }}
              className="!bg-gray-300 text-black px-3 py-1 rounded text-sm"
            >
              ✖
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={`flex-1 ${inputClassName}`}>
            {value || <span className="italic text-gray-400">Fără valoare</span>}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="!bg-white !px-3 !py-1 !text-gray-400 hover:text-gray-700 transition"
              aria-label="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
