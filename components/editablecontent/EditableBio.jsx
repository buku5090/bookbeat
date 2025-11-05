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

/** Linkify URL-uri în text simplu (http(s)://… sau www.…). Sigur pentru XSS (prin escape). */
function linkify(text = "") {
  const esc = escapeHtml(text);
  const urlRegex = /(?:https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const withLinks = esc.replace(urlRegex, (match) => {
    const display = match;
    const href = match.startsWith("www.") ? `http://${match}` : match;
    const safeHref = href.replace(/"/g, "&quot;");
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${display}</a>`;
  });
  return withLinks.replace(/\r?\n/g, "<br/>");
}

export default function EditableBio({ value, canEdit, onSave, maxLength = 1000 }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const taRef = useRef(null);

  useEffect(() => setVal(value || ""), [value]);

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

  const count = (val || "").trim().length;
  const nearMax = count >= Math.floor(maxLength * 0.9);
  const counterColor = nearMax ? "text-orange-600" : "text-gray-500";

  return (
    <div className="relative">
      {canEdit && !editing && (
        <div className="flex items-center justify-between">
          <button
            onClick={start}
            className="right-0 !p-3 rounded !bg-white !text-gray-400 hover:!text-gray-600 transition"
            aria-label={t("editable_bio.edit")}
            title={t("editable_bio.edit")}
          >
            <Pencil size={14} />
          </button>
        </div>
      )}

      {!editing ? (
        <div
          className="cursor-text whitespace-pre-wrap break-words prose prose-sm max-w-none"
          onClick={start}
          dangerouslySetInnerHTML={{
            __html:
              (value || "").trim()
                ? linkify(value)
                : `<span class="text-gray-400 italic">${escapeHtml(
                    t("editable_bio.placeholder")
                  )}</span>`,
          }}
        />
      ) : (
        <div className="relative">
          {/* Counter */}
          <div className={`absolute -top-6 right-0 text-xs ${counterColor}`}>
            {t("editable_bio.counter", { count, max: maxLength })}
          </div>

          <textarea
            ref={taRef}
            dir="ltr"
            style={{ direction: "ltr" }}
            className="w-full border rounded-xl px-3 py-2 resize-none overflow-hidden whitespace-pre-wrap break-words
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
