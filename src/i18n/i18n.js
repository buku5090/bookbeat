import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ro from "./locales/ro.json";
import en from "./locales/en.json";
import tr from "./locales/tr.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

const resources = {
  ro: { translation: ro },
  en: { translation: en },
  tr: { translation: tr },
  fr: { translation: fr },
  es: { translation: es },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("bookmix.lang") || "ro",
    fallbackLng: "ro",
    interpolation: { escapeValue: false },
  });

export default i18n;
