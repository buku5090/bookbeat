import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import TopPopup from "../utilities/TopPopup";
import { useTranslation } from "react-i18next";

const THEMES = {
  genres: { bg: "#E7F0FF", text: "#1F2A44", border: "#E7F0FF", hint: "#4A4A4A" },
  specializations: { bg: "#FFE9F1", text: "#5A0E30", border: "#FFE9F1", hint: "#4A4A4A" },
};

export default function EditableChips({
  label,
  value = [],
  canEdit = false,
  onSave,
  onExceedMax,
  suggestions = [],
  placeholder,
  max = 12,
  allowCustom = true,
  variant = "genres",
  customTheme,
  maxMessage,
  onChipClick,
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(Array.isArray(value) ? value : []);
  const [input, setInput] = useState("");

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");

  useEffect(() => setSel(Array.isArray(value) ? value : []), [value]);

  const lowerSel = useMemo(() => sel.map((x) => String(x).toLowerCase()), [sel]);

  const available = useMemo(
    () => suggestions.filter((s) => !lowerSel.includes(String(s).toLowerCase())),
    [suggestions, lowerSel]
  );

  const theme = { ...(THEMES[variant] || THEMES.genres), ...(customTheme || {}) };

  const showMaxPopup = (attempt) => {
    setPopupMsg(maxMessage || t("editable_chips.limit_reached", { max }));
    setPopupOpen(false);
    requestAnimationFrame(() => setPopupOpen(true));
    onExceedMax?.(max, attempt);
  };

  const toggle = (item) => {
    const id = String(item).trim();
    if (!id) return;
    const exists = lowerSel.includes(id.toLowerCase());
    if (exists) {
      setSel((p) => p.filter((x) => x.toLowerCase() !== id.toLowerCase()));
      return;
    }
    if (sel.length >= max) {
      showMaxPopup(id);
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
      showMaxPopup(id);
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

  return (
    <section className="relative">
      <TopPopup
        open={popupOpen}
        message={popupMsg}
        onClose={() => setPopupOpen(false)}
        duration={2400}
      />

      {label && (
        <SectionTitle
          as="h4"
          size="md"
          actions={
            canEdit && !editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="absolute right-0 !top-2 !p-3 rounded !bg-white !px-3 !py-1 !text-gray-400 transition"
                title={t("editable_chips.edit")}
              >
                <Pencil size={14} />
              </button>
            ) : null
          }
        >
          {label}
        </SectionTitle>
      )}

      {/* VIEW */}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          {sel.length ? (
            sel.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChipClick?.(g)}
                className="px-3 py-1 rounded-full text-sm border focus:outline-none focus:ring"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: theme.border,
                }}
                title={t("editable_chips.view_results_for", { item: g })}
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
          {/* selectate */}
          <div className="flex flex-wrap gap-2">
            {sel.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggle(g)}
                className="px-3 py-1 rounded-full border bg-black text-white text-sm hover:opacity-90"
                title={t("editable_chips.remove")}
              >
                {g} ×
              </button>
            ))}
          </div>

          {/* sugestii */}
          {available.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {available.map((s) => {
                const atMax = sel.length >= max;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`px-3 py-1 rounded-full border text-sm !bg-white hover:!bg-gray-50 ${
                      atMax ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    style={{ borderColor: theme.border, color: theme.text }}
                    aria-disabled={atMax}
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
                className={`px-4 py-2 text-sm rounded bg-black text-white hover:bg-gray-900 ${
                  !input.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
                aria-disabled={!input.trim()}
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
