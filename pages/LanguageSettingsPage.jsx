// src/pages/LanguageSettings.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useTranslation } from "react-i18next";

// Helper: gradient backgrounds approximating flags (no emblems)
const FLAG_BG = {
  ro: "https://flagcdn.com/w320/ro.png",
  en: "https://flagcdn.com/w320/gb.png",
  tr: "https://flagcdn.com/w320/tr.png",
  fr: "https://flagcdn.com/w320/fr.png",
  es: "https://flagcdn.com/w320/es.png",
};

// Map our codes to the backgrounds above
const LANGUAGES = [
  { code: "ro", label: "Română" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

export default function LanguageSettingsPage() {
  const { language, setLanguage } = useLanguage();
  const [selected, setSelected] = React.useState(language);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onSave = () => {
    if (selected !== language) setLanguage(selected);
    navigate(-1);
  };
  const onCancel = () => navigate(-1);

  return (
    <main
      role="main"
      aria-labelledby="lang-title"
      className="max-w-[680px] mx-auto px-4 pb-12 pt-6 !bg-black/0"
    >
      <header className="mb-4">
        <h1
          id="lang-title"
          className="text-[22px] font-extrabold tracking-tight !text-white"
        >
          {t("language.select", "Select language")}
        </h1>
        <p className="opacity-70 !text-white">
          {t(
            "language.choose_description",
            "Choose your preferred language for the interface."
          )}
        </p>
      </header>

      {/* Tiles */}
      <section className="grid gap-3">
        {LANGUAGES.map((l) => {
          const label = t(`languages.${l.code}`, l.label);
          const checked = selected === l.code;

          return (
            <label
              key={l.code}
              htmlFor={`lang-${l.code}`}
              className={[
                "group relative flex items-center gap-3 rounded-xl border px-2 py-2 cursor-pointer",
                "!border-white/10 !bg-[#000000] hover:!border-[#8A2BE2]/60 hover:shadow-[0_0_0_3px_rgba(138,43,226,.25)] transition-colors",
                checked ? "ring-2 !ring-[#E50914] ring-offset-0" : "ring-0",
              ].join(" ")}
            >
              {/* Flag box with real image */}
              <span
                aria-hidden
                className="shrink-0 w-20 h-12 rounded-lg overflow-hidden shadow-sm border !border-white/10"
              >
                <img
                  src={FLAG_BG[l.code]}
                  alt={label}
                  className="w-full h-full object-cover"
                />
              </span>

              {/* Text info */}
              <span className="flex-1 min-w-0">
                <span className="block font-bold !text-white leading-tight">
                  {label}
                </span>
                <span className="block text-[12px] opacity-60 !text-white">
                  {l.code.toUpperCase()}
                </span>
              </span>

              {/* Radio custom */}
              <span
                className={[
                  "ml-2 h-5 w-5 rounded-full border grid place-items-center",
                  "!border-white/30",
                  checked ? "!bg-[#00CED1]" : "bg-transparent",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    checked ? "!bg-[#111111]" : "bg-transparent",
                  ].join(" ")}
                />
              </span>

              <input
                id={`lang-${l.code}`}
                type="radio"
                name="app-language"
                value={l.code}
                checked={checked}
                onChange={(e) => setSelected(e.target.value)}
                aria-label={label}
                className="sr-only"
              />
            </label>
          );
        })}
      </section>

      {/* Actions */}
      <footer className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border !border-white/20 !bg-[#000000] !text-white hover:!border-[#8A2BE2] hover:shadow-[0_0_0_3px_rgba(138,43,226,.25)] transition"
        >
          {t("cancel", "Cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 rounded-lg !bg-[#111111] !text-white hover:shadow-[0_0_0_3px_rgba(229,9,20,.35)] hover:!bg-[#111111] border !border-white/10"
        >
          {t("save", "Save")}
        </button>
      </footer>
    </main>
  );
}
