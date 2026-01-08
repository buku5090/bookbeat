/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
// components/profilepage/LeftPanel.jsx

import { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "../uiux";
import ProfileAvatarWithProgress from "./ProfilePhotoWithAvatar";
import { EditableField } from "../editablecontent/EditableField";
import ReviewsSummaryFromCollabs from "./ReviewsSummaryFromCollabs";
import AccountTypeSwitcher from "./AccountTypeSwitcher";
import SectionTitle from "../styling/SectionTitle";
import CityAutocomplete from "./CityAutocomplete";
import InlineSelect from "../editablecontent/InlineSelect";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

// firebase
import { db } from "../../src/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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
  applyUpdate, // <- primește { field, value }
  progressPercent,
  verificationStatus,
  canRequestVerification,
  onOpenKYC,
  onLogout,
  cities,
  locationTypes,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* ---------------- Tip cont local pentru UI instant ---------------- */
  const [localType, setLocalType] = useState(userData?.type || "user");

  useEffect(() => {
    setLocalType(userData?.type || "user");
  }, [userData?.type]);

  // tipul care controlează UI-ul
  const effectiveType = isOwnProfile ? localType : userData?.type || "user";
  const effectiveIsArtist = effectiveType === "artist";
  const effectiveIsLocation = effectiveType === "location";

  /* ---------------- Confirmare schimbare tip cont + reset ---------------- */
  const [nextType, setNextType] = useState(null); // "artist" | "location" | "user"
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      djEquipment: [],
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
      djEquipment: [],
    }),
    []
  );

  const requestTypeChange = ({ field, value }) => {
    if (field === "type") {
      // UI se schimbă instant
      setLocalType(value);
      // păstrezi logica ta de confirmare
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

    if (
      (fromType === "artist" && toType === "location") ||
      (fromType === "location" && toType === "artist")
    ) {
      wipe = { ...wipe, ...artistOnlyResets, ...locationOnlyResets };
    }

    return wipe;
  };

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

  const handleCancelTypeChange = () => {
    // dacă anulează, revii la tipul real din userData
    setLocalType(userData?.type || "user");
    setConfirmOpen(false);
    setNextType(null);
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

    // ---------------------------
    // ---------------------------
  // MY BOOKINGS (doar pentru propriul profil)
  // ---------------------------
  const handleGoToMyBookings = useCallback(() => {
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    // înainte: navigate("/my-bookings");
    // acum îl ducem în BookArtistPage pentru propriul profil
    navigate(`/book/${authUser.uid}`);
  }, [authUser?.uid, navigate]);

  // ---------------------------
  // MESAJELE MELE (inbox/chat root)
  // ---------------------------
  const handleGoToMyMessages = useCallback(() => {
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    // adaptează la routing-ul tău real: /messages, /chat, etc.
    navigate("/messages");
  }, [authUser?.uid, navigate]);


  // ---------------------------
  // BOOK MODAL (GlobalDialog)
  // ---------------------------
  const handleGoToVerificationPage = useCallback(() => {
    // doar userul autenticat își poate cere verificarea
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    if (!isOwnProfile) return;

    navigate("/verification");
  }, [authUser?.uid, isOwnProfile, navigate]);

  // ---------------------------
  // BOOK (redirect la /book/:id)
  // ---------------------------
  const handleBookClick = useCallback(() => {
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    // id-ul public al profilului (artist sau locație)
    const targetUid =
      userData?.uid || userData?.id || userData?.userId;

    // nu are sens să te book-uiești pe tine
    if (!targetUid || targetUid === authUser.uid) return;

    navigate(`/book/${targetUid}`);
  }, [authUser?.uid, userData?.uid, userData?.id, userData?.userId, navigate]);


  // ---------------------------
  // BUTON "TRIMITE MESAJ"
  // ---------------------------
  const handleSendMessage = useCallback(() => {
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    const targetUid =
      userData?.uid || userData?.id || userData?.userId;

    if (!targetUid || targetUid === authUser.uid) return;

    // înainte: navigate(`/chat/${targetUid}`)
    navigate(`/messages/${targetUid}`);
  }, [authUser?.uid, userData?.uid, userData?.id, userData?.userId, navigate]);

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="w-full lg:w-1/4 flex flex-col items-center lg:items-start">
      <div className="w-full py-5 border border-[#a855f7]/80 rounded">
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

        {/* Zona butoanelor sub avatar */}
        <div className="mt-3 w-full flex flex-col gap-2 px-4">
          {isOwnProfile ? (
            <>
              <Button
                variant="primary"
                className="w-full !bg-violet-600 hover:!bg-violet-700"
                onClick={handleGoToMyBookings}
              >
                My bookings
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoToMyMessages}
              >
                Mesajele mele
              </Button>
            </>
          ) : (
            <>
              {(isArtist || isLocation) && (
                <Button
                  variant="primary"
                  className="w-full !bg-violet-600 hover:!bg-violet-700"
                  onClick={handleBookClick}
                >
                  {isArtist ? "Book artist" : "Book location"}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendMessage}
              >
                Trimite mesaj
              </Button>
            </>
          )}
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

        {badge}

        {/* Rezumat review-uri */}
        {userData?.type && (
          <ReviewsSummaryFromCollabs
            profileUid={isOwnProfile ? authUser?.uid : undefined}
            side={
              effectiveIsArtist
                ? "artist"
                : effectiveIsLocation
                ? "location"
                : "user"
            }
          />
        )}
      </div>

      {/* oras */}
      <div className="my-3 w-full">
        <SectionTitle>
          {effectiveIsLocation ? "Adresa" : t("profile.city_label")}
        </SectionTitle>

        {effectiveIsLocation ? (
          <EditableField
            value={userData.city || ""}
            onSave={(val) =>
              applyUpdate({
                field: "city",
                value: String(val || "").trim(),
              })
            }
            placeholder="Adresa"
            canEdit={isOwnProfile}
            linkToGoogleMaps // ✅ doar link, fără isPrice / type="number"
          />
        ) : (
          <>
            {isOwnProfile ? (
              // 👤 Artist – rămâne CityAutocomplete
              <CityAutocomplete
                value={userData.city || ""}
                onChange={(val) =>
                  applyUpdate({
                    field: "city",
                    value: String(val).trim(),
                  })
                }
                options={cities}
                placeholder={t("profile.city_placeholder")}
              />
            ) : (
              // 👤 Artist – view simplu
              <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
                {userData.city || "—"}
              </div>
            )}
          </>
        )}
      </div>

      {/* Doar locații: capacitate/buget/tip */}
      {effectiveIsLocation && (
        <div className="!my-3 w-full space-y-2">
          {/* Capacitate */}
          <SectionTitle>{t("profile.capacity_label")}</SectionTitle>
          <EditableField
            value={
              Number.isFinite(userData.capacity)
                ? String(userData.capacity)
                : ""
            }
            placeholder={t("profile.capacity_placeholder")}
            canEdit={isOwnProfile}
            type="number"
            suffix="persoane"
            onSave={(val) =>
              applyUpdate({
                field: "capacity",
                value: Number(val || 0),
              })
            }
          />

          {/* Buget */}
          <SectionTitle>{t("profile.budget_label")}</SectionTitle>
          <EditableField
            value={userData.budget ?? ""}
            placeholder={t("profile.budget_placeholder")}
            canEdit={isOwnProfile}
            type="number"
            suffix="RON"
            onSave={(val) =>
              applyUpdate({
                field: "budget",
                value: Number(val || 0),
              })
            }
          />

          <div className="w-full !mt-4">
            <SectionTitle>{t("profile.location_type_label")}</SectionTitle>
            {isOwnProfile ? (
              <InlineSelect
                value={userData.locationType || ""}
                onChange={(val) =>
                  applyUpdate({ field: "locationType", value: val })
                }
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

      {/* Tarif artist */}
      {effectiveIsArtist && (
        <div className="w-full my-3">
          <SectionTitle>{t("profile.rate_label")}</SectionTitle>
          <EditableField
            value={userData.price || ""}
            placeholder={t("profile.price_placeholder")}
            canEdit={isOwnProfile}
            isPrice
            suffix="RON"
            onSave={(val) =>
              applyUpdate({
                field: "price",
                value: val, // ex: "123 RON / set"
              })
            }
          />
        </div>
      )}

      {/* Switch tip cont */}
      {isOwnProfile && (
        <AccountTypeSwitcher
          value={localType}
          onConfirm={requestTypeChange}
          disabled={!isOwnProfile}
          className="w-full"
        />
      )}

      <div className="!my-6 space-y-3 text-sm w-full">
        {/* Toggle promovat */}
        {isOwnProfile && (
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span className="text-sm font-medium">
              {t("profile.promoted_label")}
            </span>
            <Button
              variant={userData?.promoted ? "secondary" : "primary"}
              onClick={() =>
                applyUpdate({
                  field: "promoted",
                  value: !userData?.promoted,
                })
              }
            >
              {userData?.promoted
                ? t("profile.deactivate")
                : t("profile.activate")}
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
            onClick={handleGoToVerificationPage}
            disabled={!canRequestVerification || !isOwnProfile}
          >
            {verificationStatus === "verified"
              ? t("kyc.verified_btn")
              : t("kyc.verify_btn")}
          </Button>
        </div>

      </div>

      {/* AICI trebuie să ai modalul tău de confirmare.
          La "Confirmă" chemi handleConfirmTypeChange,
          la "Anulează" chemi handleCancelTypeChange. */}
    </div>
  );
}
