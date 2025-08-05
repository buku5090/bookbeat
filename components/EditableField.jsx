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
    <div className="mb-4 w-full">
      {label && (
        <label className="text-sm font-semibold text-gray-700 block mb-1">
          {label}
        </label>
      )}

      {isEditing ? (
        <div className="space-y-2">
          {isPrice && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFree}
                onChange={() => setIsFree(!isFree)}
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
              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
            >
              ✔
            </button>
            <button
              onClick={() => {
                setLocalValue(value === "Gratis" ? "" : value || "");
                setIsFree(value === "Gratis");
                setIsEditing(false);
              }}
              className="bg-gray-300 text-black px-3 py-1 rounded text-sm"
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
              className="text-gray-400 hover:text-gray-700 transition"
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
