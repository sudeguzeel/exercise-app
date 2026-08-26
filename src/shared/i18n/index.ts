import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import tr from "./locales/tr.json";

export type AppLanguage = "tr" | "en";
export const SUPPORTED_LANGUAGES: AppLanguage[] = ["tr", "en"];

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: "tr",
  fallbackLng: "tr",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
