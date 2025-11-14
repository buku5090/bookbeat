import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../utilities/ToastProvider"; // ← adjust path if needed

export default function EditableChips({
  value = [],
  canEdit = false,
  onSave,
  onExceedMax,
  suggestions = [],
  placeholder,
  max = 12,
  allowCustom = true,
  variant = "genres", // "genres" | "specializations"
  maxMessage,
  onChipClick,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(Array.isArray(value) ? value : []);
  const [input, setInput] = useState("");

  useEffect(() => setSel(Array.isArray(value) ? value : []), [value]);

  const lowerSel = useMemo(() => sel.map((x) => String(x).toLowerCase()), [sel]);

  const available = useMemo(
    () => suggestions.filter((s) => !lowerSel.includes(String(s).toLowerCase())),
    [suggestions, lowerSel]
  );

  // ---- Global toast (replaces old TopPopup) ----
  const notifyLimit = (attempt) => {
    const message = maxMessage || t("editable_chips.limit_reached", { max });
    showToast(message, { variant: "warning", duration: 2400 });
    onExceedMax?.(max, attempt);
  };

  // ---- Actions ----
  const toggle = (item) => {
    const id = String(item).trim();
    if (!id) return;
    const exists = lowerSel.includes(id.toLowerCase());
    if (exists) {
      setSel((p) => p.filter((x) => x.toLowerCase() !== id.toLowerCase()));
      return;
    }
    if (sel.length >= max) {
      notifyLimit(id);
      return;
    }
    setSel((p) => [...p, id]);
  };

  const addCustom = () => {
    const id = input.trim();
    if (!id) return;
    if (lowerSel.includes(id.toLowerCase())) {
      setInput("");
      return;
    }
    if (sel.length >= max) {
      notifyLimit(id);
      setInput("");
      return;
    }
    setSel((p) => [...p, id]);
    setInput("");
  };

  const save = async () => {
    const cleaned = Array.from(
      new Map(sel.map((s) => [String(s).toLowerCase(), String(s).trim()]))
    )
      .map(([, v]) => v)
      .filter(Boolean);

    await onSave?.(cleaned);
    setEditing(false);
  };

  // ---- Styling (force with Tailwind `!`) ----
  const viewChipClasses =
    variant === "specializations"
      ? "!bg-black !text-white !border-[#00CED1]"
      : "!bg-black !text-white !border-[#8A2BE2]"; // genres (default)

  const suggestionChipClasses =
    variant === "specializations"
      ? "!bg-[#00CED1] !text-white !border-[#00CED1]"
      : "!bg-[#8A2BE2] !text-white !border-[#8A2BE2]"; // genres

  return (
    <section className="relative">
      {canEdit && !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
          title={t("editable_chips.edit")}
        >
          <Pencil size={14} />
        </button>
      ) : null}

      {/* VIEW */}
      {!editing && (
        <div className="flex flex-wrap gap-2 pr-12">
          {sel.length ? (
            sel.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChipClick?.(g)}
                title={t("editable_chips.view_results_for", { item: g })}
                className={`px-3 py-1 rounded-full text-sm border focus:!outline-none focus:ring ${viewChipClasses}`}
              >
                {g}
              </button>
            ))
          ) : (
            <span className="text-gray-500 text-sm">
              {t("editable_chips.no_selection")}
            </span>
          )}
        </div>
      )}

      {/* EDIT */}
      {editing && canEdit && (
        <div className="space-y-3">
          {/* selected */}
          <div className="flex flex-wrap gap-2">
            {sel.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggle(g)}
                title={t("editable_chips.remove")}
                className="px-3 py-1 rounded-full border !bg-black !text-white !border-white text-sm hover:opacity-90"
              >
                {g} ×
              </button>
            ))}
          </div>

          {/* suggestions */}
          {available.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {available.map((s) => {
                const atMax = sel.length >= max;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    aria-disabled={atMax}
                    className={`px-3 py-1 rounded-full border text-sm ${suggestionChipClasses} hover:!opacity-80 focus:outline-none focus:ring ${
                      atMax ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}

          {/* custom input */}
          {allowCustom && (
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder={placeholder || t("editable_chips.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                aria-disabled={sel.length >= max}
              />
              <button
                onClick={addCustom}
                aria-disabled={!input.trim()}
                className={`px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900 ${
                  !input.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {t("editable_chips.add")}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900"
            >
              {t("editable_chips.save")}
            </button>
            <button
              onClick={() => {
                setSel(Array.isArray(value) ? value : []);
                setEditing(false);
              }}
              className="px-4 py-2 text-sm rounded border"
            >
              {t("editable_chips.cancel")}
            </button>
            <span className="ml-auto text-xs text-gray-500">
              {t("editable_chips.count", { count: sel.length, max })}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
