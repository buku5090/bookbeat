import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import { useTranslation } from "react-i18next";

/** Escape HTML simplu (pt. view mode) */
function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Linkify URL-uri în text simplu. */
function linkify(text = "") {
  const esc = escapeHtml(text);
  const urlRegex = /(?:https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const withLinks = esc.replace(urlRegex, (match) => {
    const href = match.startsWith("www.") ? `http://${match}` : match;
    const safeHref = href.replace(/"/g, "&quot;");
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });
  return withLinks.replace(/\r?\n/g, "<br/>");
}

export default function EditableBio({ value, canEdit, onSave, maxLength = 1000 }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false); // 👈 nou
  const taRef = useRef(null);

  useEffect(() => {
    setVal(value || "");
    setExpanded(false); // când se schimbă bio-ul din afară, resetezi „afișează mai mult”
  }, [value]);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (!editing || !taRef.current) return;
    const el = taRef.current;
    el.style.height = "0px";
    el.style.height = el.scrollHeight + "px";
  }, [editing, val]);

  const start = () => canEdit && setEditing(true);

  const cancel = () => {
    setVal(value || "");
    setEditing(false);
  };

  const confirm = async () => {
    if (saving) return;
    const trimmed = (val || "").trim();
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // ✅ numără exact ca maxLength (fără trim), ca să nu apară discrepanțe
  const count = (val || "").length;
  const nearMax = count >= Math.floor(maxLength * 0.9);

  // 🔽 LOGICA de „afișează mai mult”
  const PREVIEW_CHAR_LIMIT = 260; // poți să-l faci prop dacă vrei
  const raw = (value || "").trim();
  const isLong = raw.length > PREVIEW_CHAR_LIMIT;

  const displayText =
    !expanded && isLong
      ? raw.slice(0, PREVIEW_CHAR_LIMIT).trimEnd() + "…"
      : raw;

  const htmlForView = displayText
    ? linkify(displayText)
    : `<span class="text-gray-400 italic">${escapeHtml(
        t("editable_bio.placeholder")
      )}</span>`;

  return (
    <div className="relative">
      {canEdit && !editing && (
        <button
          onClick={start}
          className="absolute top-0 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
          aria-label={t("editable_bio.edit")}
          title={t("editable_bio.edit")}
        >
          <Pencil size={14} />
        </button>
      )}

      {!editing ? (
        <div className="cursor-text">
          {/* textul în sine pornește editarea la click */}
          <div
            className="whitespace-pre-wrap break-words prose prose-sm max-w-none"
            onClick={start}
            dangerouslySetInnerHTML={{
              __html: htmlForView,
            }}
          />

          {/* butonul de show more/less NU trebuie să pornească editarea */}
          {isLong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="
                mt-1 !text-xs !font-medium
                !text-[#9b5cff]
                hover:!text-white
                !px-2 !py-[3px]
                !rounded-md
                !transition-all
                duration-200
                !bg-[#9b5cff]/10
                hover:!bg-[#9b5cff]/30
                shadow-[0_0_6px_#9b5cff80]
                hover:shadow-[0_0_10px_#9b5cffcc]
                backdrop-blur-sm
              "
            >
              {expanded
                ? t("editable_bio.show_less", "Afișează mai puțin")
                : t("editable_bio.show_more", "Afișează mai mult")}
            </button>
          )}

        </div>
      ) : (
        <div className="relative">
          {/* ✅ Counter fix în colțul din textarea */}
          <div className="pointer-events-none absolute right-3 top-2">
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] leading-none",
                "bg-black/80 text-white",
                nearMax ? "ring-1 ring-orange-500/60" : "",
              ].join(" ")}
            >
              {t("editable_bio.counter", { count, max: maxLength })}
            </span>
          </div>

          <textarea
            ref={taRef}
            dir="ltr"
            style={{ direction: "ltr" }}
            className="w-full border rounded-xl px-3 pr-16 py-2 resize-none overflow-hidden whitespace-pre-wrap break-words
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={val}
            maxLength={maxLength}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
                e.preventDefault();
                confirm();
              }
            }}
            rows={4}
            autoFocus
            placeholder={t("editable_bio.placeholder")}
            aria-label={t("editable_bio.placeholder")}
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={confirm}
              disabled={saving}
              title={t("editable_bio.save_hint")}
              className="inline-flex items-center rounded-lg !bg-white !text-black !border-black px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {t("common.save")}
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
