import React, { useEffect, useState } from "react";
import SectionTitle from "../styling/SectionTitle";
import { useTranslation } from "react-i18next";

/**
 * AccountTypeSwitcher
 * - Neonish BookMix UI
 * - Fully controlled component: it only reflects `value`
 * - IMPORTANT: parent MUST update `value` when onConfirm fires
 */
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

  const base =
    "flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all duration-200 " +
    "relative overflow-hidden select-none disabled:opacity-40 disabled:cursor-not-allowed";

  const active =
    "!bg-[#8A2BE2] !text-white !border-[#8A2BE2] !shadow-[0_0_12px_#8A2BE280] " +
    "!ring-2 !ring-[#c9afff] !scale-[1.03]";

  const inactive =
    "!bg-black/40 !text-white/70 !border-white/10 " +
    "hover:!bg-[#9b5cff]/10 hover:!text-white hover:!border-[#9b5cff]/60 " +
    "hover:!shadow-[0_0_8px_#9b5cff66]";

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
        <p className="mt-2 text-xs text-gray-400">
          {t("account_type.current_user")}
        </p>
      )}

      {(isArtist || isLocation) && (
        <p className="mt-2 text-xs text-gray-400">
          {t("account_type.current_selected", {
            type: t(`account_type.${value}`),
          })}
        </p>
      )}
    </div>
  );
}

/**
 * OPTIONAL DEMO/REFERENCE USAGE
 * If your switcher "doesn't work", compare your parent to this.
 * You can delete this export in your project if you don't need it.
 */
export function AccountTypeSwitcherDemo({ initialType = "" }) {
  const [type, setType] = useState(initialType);

  // Example: sync from props/user if needed
  useEffect(() => {
    setType(initialType || "");
  }, [initialType]);

  const handleConfirm = ({ field, value }) => {
    if (field === "type") {
      setType(value); // <-- THIS is the crucial line your parent must do
    }
    // then you can save to Firebase / context / redux, etc.
  };

  return (
    <div className="max-w-sm">
      <AccountTypeSwitcher value={type} onConfirm={handleConfirm} />
      <div className="mt-3 text-xs text-white/70">
        Current value in parent: <span className="text-white">{type || "—"}</span>
      </div>
    </div>
  );
}