// components/LanguageSelectorJSX.jsx
import React from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export default function LanguageSelectorJSX({ onChange, className = "" }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();

  // refs pentru focus
  const triggerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    onChange?.(language);
  }, [language, onChange]);

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // lock body scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // focus pe dialog la deschidere
  React.useEffect(() => {
    if (open && contentRef.current) {
      setTimeout(() => contentRef.current?.focus(), 0);
    }
  }, [open]);

  // refocus pe trigger la închidere
  React.useEffect(() => {
    if (!open) {
      const id = setTimeout(() => triggerRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const currentLabel = t(`languages.${current.code}`, current.label);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`w-full flex items-center gap-8 px-12 py-8 text-left rounded-md transition border-0 bg-transparent hover:bg-[rgba(0,0,0,0.05)] ${className}`}
        style={{ alignItems: "center", gap: 8, padding: 8, width: "100%" }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("select_language")}
        title={t("select_language")}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🇷🇴</span>
        <span style={{ fontSize: 14 }}>{t("select_language")}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
          {currentLabel}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: "18vh",
              paddingBottom: "6vh",
              paddingLeft: "2vw",
              paddingRight: "2vw",
              zIndex: 9999,
            }}
          >
            <div
              ref={contentRef}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{
                width: "min(92vw, 520px)",
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
                padding: 20,
                maxHeight: "76vh",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                boxSizing: "border-box",
                outline: "none",
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>
                  {t("select_language")}
                </div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {t("choose_language_description")}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {LANGUAGES.map((lang) => {
                  const label = t(`languages.${lang.code}`, lang.label);
                  return (
                    <label
                      key={lang.code}
                      htmlFor={`lang-${lang.code}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: 12,
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24, lineHeight: 1 }}>{lang.flag}</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <span style={{ fontSize: 12, opacity: 0.6 }}>
                            {lang.code.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <input
                        id={`lang-${lang.code}`}
                        type="radio"
                        name="bookmix-lang"
                        value={lang.code}
                        checked={language === lang.code}
                        onChange={(e) => setLanguage(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={label}
                        style={{ width: 18, height: 18 }}
                      />
                    </label>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#111",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
