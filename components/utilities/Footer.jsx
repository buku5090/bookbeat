// components/Footer.jsx
import React from "react"
import { useTranslation } from "react-i18next"

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-black text-white border-t border-gray-800 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} BookMix. {t("footer.all_rights_reserved")}</p>
        </div>
        <div className="flex gap-4">
          <a href="/despre" className="hover:underline">{t("footer.about")}</a>
          <a href="/contact" className="hover:underline">{t("footer.contact")}</a>
          <a href="/termeni" className="hover:underline">{t("footer.terms")}</a>
        </div>
      </div>
    </footer>
  )
}
