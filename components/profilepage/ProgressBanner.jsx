// components/profilepage/ProgressBanner.jsx
import { useTranslation } from "react-i18next";

export default function ProgressBanner({ isTypeChosen, percent, missing }) {
  const { t } = useTranslation();
  const ok = percent >= 100;
  return (
    <div
      className={`mb-4 text-sm font-medium rounded px-4 py-2 ${
        !isTypeChosen
          ? "bg-amber-600 text-amber-800"
          : ok
          ? "bg-green-600 text-green-800"
          : "bg-yellow-600 text-yellow-800"
      }`}
      role="status"
      aria-live="polite"
    >
      {!isTypeChosen
        ? t("progressBanner.choose_type")
        : ok
        ? t("progressBanner.complete")
        : t("progressBanner.progress", {
            percent,
            missing: (missing || []).join(", "),
          })}
    </div>
  );
}
