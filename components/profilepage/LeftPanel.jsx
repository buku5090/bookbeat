/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
// components/profilepage/LeftPanel.jsx
import { useMemo, useState } from "react";
import { Button } from "../uiux";
import ProfileAvatarWithProgress from "./ProfilePhotoWithAvatar";
import { EditableField } from "../editablecontent/EditableField";
import ReviewsSummaryFromCollabs from "./ReviewsSummaryFromCollabs";
import AccountTypeSwitcher from "./AccountTypeSwitcher";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { LogOut } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import CityAutocomplete from "./CityAutocomplete";
import InlineSelect from "./InlineSelect";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../uiux/dialog";
import { useTranslation } from "react-i18next";

export default function LeftPanel({
  isOwnProfile,
  isArtist,
  isLocation,
  isNewAccount,
  authUser,
  userData,
  username,
  imageSrc,
  fileInputRef,
  handleAvatarChange,
  applyUpdate,          // <- primește { field, value }
  progressPercent,
  verificationStatus,
  canRequestVerification,
  onOpenKYC,
  onLogout,
  cities,
  locationTypes,
}) {
  const { t } = useTranslation();

  /* ---------------- Confirmare schimbare tip cont + reset ---------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextType, setNextType] = useState(null); // "artist" | "location" | "user"

  const baseResets = useMemo(
    () => ({
      bio: "",
      city: "",
      gallery: [],
      promoted: false,
      verificationStatus: "unverified",
    }),
    []
  );

  const artistOnlyResets = useMemo(
    () => ({
      rate: "",
      genres: [],
      specializations: [],
      djEquipment: [],     // pentru artist
      demos: [],
    }),
    []
  );

  const locationOnlyResets = useMemo(
    () => ({
      capacity: null,
      budget: "",
      locationType: "",
      address: "",
      googleMapsLink: "",
      djEquipment: [],     // pentru locație
    }),
    []
  );

  const requestTypeChange = ({ field, value }) => {
    if (field === "type") {
      setNextType(value);
      setConfirmOpen(true);
    } else {
      applyUpdate({ field, value });
    }
  };

  const buildResetMap = (fromType, toType) => {
    let wipe = { ...baseResets };

    if (toType === "user") {
      wipe = { ...wipe, ...artistOnlyResets, ...locationOnlyResets };
    } else if (toType === "artist") {
      wipe = { ...wipe, ...locationOnlyResets };
    } else if (toType === "location") {
      wipe = { ...wipe, ...artistOnlyResets };
    }

    if ((fromType === "artist" && toType === "location") || (fromType === "location" && toType === "artist")) {
      wipe = { ...wipe, ...artistOnlyResets, ...locationOnlyResets };
    }

    return wipe;
  };

  // 👇 cont promovat = gradient pe username
  const isPromoted = !!userData?.promoted;

  const handleConfirmTypeChange = async () => {
    try {
      const currentType = userData?.type ?? "user";
      const toType = nextType || "user";

      const resetMap = buildResetMap(currentType, toType);

      for (const [field, value] of Object.entries(resetMap)) {
        await applyUpdate({ field, value });
      }
      await applyUpdate({ field: "type", value: toType });
    } finally {
      setConfirmOpen(false);
      setNextType(null);
    }
  };

  const fieldsWipedPreview = useMemo(() => {
    if (!nextType) return [];
    const currentType = userData?.type ?? "user";
    const map = buildResetMap(currentType, nextType);
    return Object.keys(map);
  }, [nextType, userData?.type, buildResetMap]);

  /* ------------------------ Badge-uri vizuale ------------------------ */
  const badge = (
    <div className="flex flex-wrap items-center gap-2 mt-2 flex w-full justify-center column">
      {isNewAccount && (
        <span
          title={t("profile.badge_new_title")}
          className="text-xs font-semibold uppercase bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1"
        >
          <span>✨</span> {t("profile.badge_new")}
        </span>
      )}
      {userData?.promoted && (
        <span
          className="text-sm font-semibold uppercase 
                    bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 
                    text-white px-3 py-1.5 rounded-full shadow-md
                    tracking-wide select-none"
        >
          {t("profile.badge_promoted")}
        </span>
      )}

      {verificationStatus === "verified" && (
        <span className="text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
          {t("profile.badge_verified")}
        </span>
      )}
      {verificationStatus === "pending" && (
        <span className="text-xs font-semibold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          {t("profile.badge_pending")}
        </span>
      )}
    </div>
  );

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
      {/* Avatar */}
      <div className="relative w-[160px] h-fit rounded-full overflow-visible !w-full !flex justify-center">
        <ProfileAvatarWithProgress
          imageSrc={imageSrc}
          progress={progressPercent}
          canEdit={isOwnProfile}
          fileInputRef={fileInputRef}
          handleAvatarChange={handleAvatarChange}
        />
      </div>

      {/* Username */}
      <p
        className={
          "text-xl font-semibold mt-2 text-center md:text-left !flex w-full !justify-center " +
          (isPromoted
            ? "!bg-gradient-to-r !from-violet-500 !via-fuchsia-500 !to-blue-500 !bg-clip-text !text-transparent"
            : "text-gray-200")
        }
      >
        {username}
      </p>

      {/* 🔻 Badge-urile (inclusiv Promovat) afisate imediat sub username */}
      {badge}

      {/* Oraș */}
      <div className="mt-3 w-full">
        <SectionTitle>
          {t("profile.city_label")}
        </SectionTitle>
        {isOwnProfile ? (
          <CityAutocomplete
            value={userData.city || ""}
            onChange={(val) => applyUpdate({ field: "city", value: String(val).trim() })}
            options={cities}
            placeholder={t("profile.city_placeholder")}
          />
        ) : (
          <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
            {userData.city || "—"}
          </div>
        )}
      </div>

      {/* Doar locații: capacitate/buget/tip */}
      {isLocation && (
        <div className="mt-2 w-full space-y-2">
          <EditableField
            label={t("profile.capacity_label")}
            value={Number.isFinite(userData.capacity) ? String(userData.capacity) : ""}
            placeholder={t("profile.capacity_placeholder")}
            canEdit={isOwnProfile}
            type="number"
            onSave={(val) => applyUpdate({ field: "capacity", value: Number(val || 0) })}
          />
          <EditableField
            label={t("profile.budget_label")}
            value={
              userData.budget === 0
                ? t("common.free")
                : typeof userData.budget === "number"
                ? String(userData.budget)
                : ""
            }
            placeholder={t("profile.budget_placeholder")}
            canEdit={isOwnProfile}
            type="number"
            onSave={(val) => {
              const num = Number(val || 0);
              applyUpdate({ field: "budget", value: num === 0 ? t("common.free") : num });
            }}
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t("profile.location_type_label")}
            </label>
            {isOwnProfile ? (
              <InlineSelect
                value={userData.locationType || ""}
                onChange={(val) => applyUpdate({ field: "locationType", value: val })}
                options={locationTypes}
                placeholder={t("profile.location_type_placeholder")}
              />
            ) : (
              <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
                {userData.locationType || "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Switch tip cont */}
      {isOwnProfile && (
        <AccountTypeSwitcher
          value={userData?.type}
          onConfirm={requestTypeChange}
          disabled={!isOwnProfile}
          className="w-full"
        />
      )}

      {/* Rezumat review-uri */}
      {userData?.type && (
        <ReviewsSummaryFromCollabs
          profileUid={isOwnProfile ? authUser?.uid : undefined}
          side={isArtist ? "artist" : isLocation ? "location" : "user"}
        />
      )}

      <div className="mt-6 space-y-3 text-sm w-full">
        {/* Tarif artist */}
        {isArtist && (
          <div>
            <SectionTitle>{t("profile.rate_label")}</SectionTitle>
            <EditableField
              value={
                userData.rate === 0 || /^gratis$/i.test(String(userData.rate))
                  ? t("common.free")
                  : String(userData.rate || "")
              }
              placeholder={t("profile.rate_placeholder")}
              canEdit={isOwnProfile}
              isPrice
              type="number"
              onSave={(val) => {
                const num = Number(String(val).replace(/[^\d]/g, "")) || 0;
                const finalValue = num === 0 ? t("common.free") : `${num} RON / set`;
                applyUpdate({ field: "rate", value: finalValue });
              }}
            />
          </div>
        )}

        {/* Toggle promovat */}
        {isOwnProfile && (
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span className="text-sm font-medium">{t("profile.promoted_label")}</span>
            <Button
              variant={userData?.promoted ? "secondary" : "primary"}
              onClick={() => applyUpdate({ field: "promoted", value: !userData?.promoted })}
            >
              {userData?.promoted ? t("profile.deactivate") : t("profile.activate")}
            </Button>
          </div>
        )}

        {/* Verificare identitate */}
        <div className="flex items-center justify-between border rounded-lg px-3 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{t("kyc.title")}</span>
            <span className="text-xs text-gray-500">
              {verificationStatus === "verified"
                ? t("kyc.status_verified")
                : verificationStatus === "pending"
                ? t("kyc.status_pending")
                : t("kyc.status_locked")}
            </span>
          </div>
          <Button
            variant="primary"
            onClick={onOpenKYC}
            disabled={!canRequestVerification || !isOwnProfile}
          >
            {verificationStatus === "verified" ? t("kyc.verified_btn") : t("kyc.verify_btn")}
          </Button>
        </div>
      </div>

      {isOwnProfile && (
        <div className="flex flex-col gap-3 w-full mt-6">
          <Button
            variant="primary"
            onClick={() => window.location.assign("/settings")}
            className="w-full"
          >
            {t("settings.advanced")}
          </Button>
          <Button
            variant="secondary"
            onClick={onLogout}
            className="w-full"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            {t("auth.logout")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => applyUpdate({ field: "deleteAccount", value: true })}
            className="w-full"
          >
            {t("account.delete")}
          </Button>
        </div>
      )}

      {/* Dialog confirmare schimbare tip cont */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[96%] max-w-md bg-[#0a0a0a] text-white border border-white/10">
          <DialogHeader>
            <DialogTitle>{t("account.switch_title")}</DialogTitle>
            <DialogDescription className="text-white/70">
              {t("account.switch_desc")}
            </DialogDescription>
          </DialogHeader>

          {fieldsWipedPreview.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 text-xs text-white/70">
              <div className="mb-1 font-semibold text-white/80">
                {t("account.fields_reset_title")}
              </div>
              <ul className="list-disc ml-5 space-y-0.5">
                {fieldsWipedPreview.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => { setConfirmOpen(false); setNextType(null); }}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmTypeChange}>
              {t("account.confirm_switch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
