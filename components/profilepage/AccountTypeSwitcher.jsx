import React from "react";
import SectionTitle from "../styling/SectionTitle";
import { useTranslation } from "react-i18next";

export default function AccountTypeSwitcher({
  value,
  onConfirm,
  disabled = false,
  className = "",
  showTitle = true,
}) {
  const { t } = useTranslation();

  const setType = (tVal) => {
    if (disabled) return;
    onConfirm?.({ field: "type", value: tVal });
  };

  const base = "flex-1 py-2 px-4 rounded-lg border transition text-sm font-medium";
  const active = "!bg-black !text-white border-black";
  const inactive = "!bg-white !text-black !border-gray-300 hover:bg-gray-50";

  const isArtist = value === "artist";
  const isLocation = value === "location";

  return (
    <div className={className}>
      {showTitle && <SectionTitle>{t("account_type.title")}</SectionTitle>}

      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${isArtist ? active : inactive}`}
          onClick={() => setType("artist")}
          disabled={disabled}
          aria-pressed={isArtist}
          aria-label={t("account_type.aria_artist")}
          title={t("account_type.title_artist")}
        >
          {t("account_type.artist")}
        </button>

        <button
          type="button"
          className={`${base} ${isLocation ? active : inactive}`}
          onClick={() => setType("location")}
          disabled={disabled}
          aria-pressed={isLocation}
          aria-label={t("account_type.aria_location")}
          title={t("account_type.title_location")}
        >
          {t("account_type.location")}
        </button>
      </div>

      {!isArtist && !isLocation && (
        <p className="mt-2 text-xs text-gray-600">
          {t("account_type.current_user")}
        </p>
      )}

      {(isArtist || isLocation) && (
        <p className="mt-2 text-xs text-gray-600">
          {t("account_type.current_selected", { type: t(`account_type.${value}`) })}
        </p>
      )}
    </div>
  );
}
