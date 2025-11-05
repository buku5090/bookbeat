// PENTRU EDITUL TEXTULUI DIN PROFIL

import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

export function EditableField({
  label,
  value,
  onSave,
  type = "text",           // "text" | "number"
  isPrice = false,         // dacă e tarif (RON / set) + "Este gratis"
  canEdit = true,
  inputClassName = "",
  placeholder = "",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || "");
  const [isFree, setIsFree] = useState(isPrice && /^gratis$/i.test(String(value || "")));
  const inputRef = useRef(null);

  // numericOnly dacă e preț sau type === "number"
  const numericOnly = isPrice || type === "number";

  useEffect(() => {
    const v = value?.toString() || "";
    setIsFree(isPrice && /^gratis$/i.test(v));
    setLocalValue(isPrice && /^gratis$/i.test(v) ? "" : v.replace(/[^\d]/g, ""));
  }, [value, isPrice]);

  // ——— filtre complete pentru doar cifre ———
  const cleanDigits = (s) => (s == null ? "" : String(s).replace(/[^\d]/g, ""));

  const onBeforeInput = (e) => {
    if (!numericOnly || isFree) return;
    if (e.data && !/^\d+$/.test(e.data)) e.preventDefault();
  };

  const onKeyDown = (e) => {
    if (!numericOnly || isFree) return;
    const ctrl = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (e.ctrlKey || e.metaKey) return;  // permitem Cmd/Ctrl+A/C/V/X/Z/Y
    if (ctrl.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const onPaste = (e) => {
    if (!numericOnly || isFree) return;
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";
    if (/^\d+$/.test(text)) return; // ok
    e.preventDefault();
    const digits = (text.match(/\d+/g) || []).join("");
    if (!digits) return;
    // inserăm manual în valoarea locală
    const el = inputRef.current;
    const { selectionStart = 0, selectionEnd = 0 } = el || {};
    const current = localValue || "";
    const next = current.slice(0, selectionStart) + digits + current.slice(selectionEnd);
    setLocalValue(next);
    // repoziționăm caret-ul după render
    requestAnimationFrame(() => {
      if (el) el.setSelectionRange(selectionStart + digits.length, selectionStart + digits.length);
    });
  };

  const onDrop = (e) => {
    if (numericOnly && !isFree) e.preventDefault();
  };

  const onInput = (e) => {
    if (!numericOnly || isFree) return;
    const cleaned = cleanDigits(e.target.value);
    if (cleaned !== e.target.value) {
      e.target.value = cleaned;
    }
  };

  const handleChange = (e) => {
    const v = numericOnly ? cleanDigits(e.target.value) : e.target.value;
    setLocalValue(v);
  };

  const handleSave = () => {
    let finalValue = localValue;

    if (isPrice) {
      finalValue = isFree ? "Gratis" : `${Number(localValue || 0)} RON / set`;
    } else if (type === "number") {
      finalValue = localValue === "" ? "" : String(Number(localValue || 0));
    }

    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const v = value?.toString() || "";
    setIsFree(isPrice && /^gratis$/i.test(v));
    setLocalValue(isPrice && /^gratis$/i.test(v) ? "" : (numericOnly ? cleanDigits(v) : v));
    setIsEditing(false);
  };

  return (
    <div className="w-full">
      {label && <label className="text-xl font-bold mb-2 !uppercase">{label}</label>}

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
              Este gratis
            </label>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              className={`border p-2 w-full rounded text-sm ${isFree ? "bg-gray-100" : ""}`}
              value={localValue}
              onChange={handleChange}
              onBeforeInput={onBeforeInput}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onDrop={onDrop}
              onInput={onInput}
              inputMode={numericOnly ? "numeric" : undefined}
              pattern={numericOnly ? "[0-9]*" : undefined}
              placeholder={placeholder}
              type="text"                 // ținem text ca să controlăm filtrarea; numeric doar la format
              disabled={isFree}
            />

            <button
              onClick={handleSave}
              className="!bg-green-500 text-white px-3 py-1 rounded text-sm"
              aria-label="Salvează"
            >
              ✔
            </button>
            <button
              onClick={handleCancel}
              className="!bg-gray-300 text-black px-3 py-1 rounded text-sm"
              aria-label="Anulează"
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
              <span className="italic text-gray-400">Fără valoare</span>
            )}
          </p>
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="!bg-white !px-3 !py-1 !text-gray-400 hover:text-gray-700 transition"
              aria-label="Edit"
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
