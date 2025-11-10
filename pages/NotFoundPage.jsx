import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h1 className="text-6xl font-extrabold mb-4">{t("errors.not_found_title")}</h1>
      <p className="text-xl mb-6 text-center">{t("errors.not_found_message")}</p>
      <Link
        to="/"
        className="bg-violet-600 hover:bg-violet-700 transition text-white font-semibold px-6 py-3 rounded-xl"
      >
        {t("errors.back_home")}
      </Link>
    </div>
  );
}
