/* eslint-disable react-refresh/only-export-components */
// context/LanguageContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext({ language: "ro", setLanguage: () => {} });
const LANG_KEY = "bookmix.lang";
import i18n from "../src/i18n/i18n"; // ✅ importă i18n

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "ro";
    return localStorage.getItem(LANG_KEY) || "ro";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_KEY, language);
      i18n.changeLanguage(language); // 🌍 schimbă limba global
      window.dispatchEvent(
        new CustomEvent("bookmix:languagechange", { detail: { code: language } })
      );
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// ⬇️ opțional, doar dacă vrei să folosești contextul brut
export { LanguageContext };
