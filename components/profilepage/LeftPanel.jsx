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
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ro } from "date-fns/locale";
import { startOfDay, isBefore } from "date-fns";
import { useGlobalDialog } from "../../context/GlobalDialogContext";
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
  const { openDialog } = useGlobalDialog();
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
  // BOOK MODAL (GlobalDialog)
  // ---------------------------
  const openBookDialog = useCallback(() => {
    if (!authUser?.uid) {
      navigate("/login");
      return;
    }

    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 640;

    openDialog({
      title: isArtist
        ? "Book artist"
        : isLocation
        ? "Book location"
        : "Book",
      fullscreen: isMobile,
      widthClass: isMobile ? "w-full" : "w-full max-w-sm sm:max-w-4xl",
      heightClass: isMobile ? "h-[100dvh]" : "max-h-[90vh]",
      bgClass: "bg-neutral-950",
      content: ({ closeDialog }) => {
        // state LOCAL în dialog (ca să poți scrie)
        const todayStart = startOfDay(new Date());
        const [localMonth, setLocalMonth] = useState(todayStart);
        const [dialogRange, setDialogRange] = useState({
          from: undefined,
          to: undefined,
        });
        const [dialogForm, setDialogForm] = useState({
          title: "",
          notes: "",
        });

        const disabledDay = (date) => isBefore(date, todayStart);

        const sendRequest = async () => {
          if (!dialogRange?.from || !dialogRange?.to) return;

          try {
            const targetUid =
              userData?.uid || userData?.id || userData?.userId;

            if (!targetUid) {
              console.warn("No target UID for booking request.");
              return;
            }

            // notificare la owner-ul profilului
            await addDoc(
              collection(db, `users/${targetUid}/notifications`),
              {
                type: "booking_request",
                read: false,
                createdAt: serverTimestamp(),

                // cine cere
                fromUserId: authUser.uid,
                fromName:
                  authUser.displayName ||
                  authUser.email ||
                  "User",
                fromPhotoURL: authUser.photoURL || "",

                // pentru cine
                toUserId: targetUid,

                // detalii booking
                rangeFrom: dialogRange.from,
                rangeTo: dialogRange.to,
                title: dialogForm.title || "",
                notes: dialogForm.notes || "",
                targetType: isArtist
                  ? "artist"
                  : isLocation
                  ? "location"
                  : "user",
              }
            );

            closeDialog?.();
          } catch (e) {
            console.error("Booking request error:", e);
          }
        };

        return (
          <div
            className="
              w-full h-full min-h-0
              overflow-y-auto overscroll-contain
              px-1 sm:px-2 pb-24 sm:pb-4
            "
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calendar */}
              <div className="rounded-2xl border border-neutral-800 bg-black p-3">
                <DayPicker
                  locale={ro}
                  mode="range"
                  weekStartsOn={1}
                  showOutsideDays
                  fixedWeeks
                  defaultMonth={todayStart}
                  startMonth={todayStart}
                  month={localMonth}
                  onMonthChange={(m) => setLocalMonth(m || todayStart)}
                  disabled={disabledDay}
                  selected={dialogRange}
                  onSelect={setDialogRange}
                  className="!bg-black !text-white !p-0 !m-0"
                  styles={{
                    caption: { color: "#ffffff", textAlign: "left" },
                    head_cell: { color: "#a3a3a3" },
                    day: { borderRadius: "10px" },
                    day_selected: {
                      background:
                        "linear-gradient(135deg, #8A2BE2, #ff4b9f)",
                      color: "#ffffff",
                    },
                    day_today: { border: "1px solid #8A2BE2" },
                  }}
                />
                <p className="mt-2 text-xs text-neutral-400">
                  Sfârșitul este exclusiv (se salvează +1 zi automat).
                </p>
              </div>

              {/* Form */}
              <div className="space-y-3">
                {/* Aici presupunem că ai deja Label / Input / Textarea în proiect */}
                {/* Dacă nu, înlocuiește cu componenta ta de input */}
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    Titlu
                  </label>
                  <input
                    autoFocus
                    value={dialogForm.title}
                    onChange={(e) =>
                      setDialogForm((s) => ({
                        ...s,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Ex: Eveniment privat"
                    className="bg-black border border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-violet-500 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    Detalii (opțional)
                  </label>
                  <textarea
                    rows={6}
                    value={dialogForm.notes}
                    onChange={(e) =>
                      setDialogForm((s) => ({
                        ...s,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Detalii despre eveniment..."
                    className="bg-black border border-neutral-700 text-white placeholder:text-neutral-500 focus:ring-2 focus:ring-violet-500 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* Footer sticky pe mobil */}
                <div
                  className="
                    sticky bottom-0 left-0 right-0
                    bg-neutral-950/95 backdrop-blur
                    pt-3 pb-4 flex justify-end gap-2
                  "
                >
                  <Button variant="outline" onClick={() => closeDialog?.()}>
                    Anulează
                  </Button>
                  <Button
                    onClick={sendRequest}
                    disabled={
                      !dialogRange?.from ||
                      !dialogRange?.to ||
                      dialogRange.from < todayStart
                    }
                  >
                    Trimite cererea
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      },
    });
  }, [authUser, userData, isArtist, isLocation, openDialog, navigate]);

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

        {/* Book + Trimite mesaj (doar când vezi alt profil) */}
        {!isOwnProfile && (
          <div className="mt-3 w-full flex flex-col gap-2 px-4">
            {(isArtist || isLocation) && (
              <Button
                variant="primary"
                className="w-full !bg-violet-600 hover:!bg-violet-700"
                onClick={openBookDialog}
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

          </div>
        )}

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
            onClick={onOpenKYC}
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
