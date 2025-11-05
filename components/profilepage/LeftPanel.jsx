// components/profilepage/LeftPanel.jsx
import { useMemo, useState } from "react";
import { Button } from "../uiux";
import ProfileAvatarWithProgress from "./ProfilePhotoWithAvatar";
import { EditableField } from "../editablecontent/EditableField";
import ReviewsSummaryFromCollabs from "./ReviewsSummaryFromCollabs";
import AccountTypeSwitcher from "./AccountTypeSwitcher";
import AvailabilityCalendar from "./AvailabilityCalendar";
import EditableDJEquipment from "../editablecontent/EditableDJEquipment";
import EditableSpecializations from "../editablecontent/EditableSpecializations";
import EditableGenres from "../editablecontent/EditableGenres";
import { LogOut } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import CityAutocomplete from "./CityAutocomplete";
import InlineSelect from "./InlineSelect";

// Dialog minimalist (același sistem ca în pagini)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../uiux/dialog";

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
  /* ---------------- Confirmare schimbare tip cont + reset ---------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextType, setNextType] = useState(null); // "artist" | "location" | "user"

  // câmpuri ce vor fi resetate (map general)
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

  // Interceptează cererea din AccountTypeSwitcher
  const requestTypeChange = ({ field, value }) => {
    if (field === "type") {
      setNextType(value);      // noul tip cerut
      setConfirmOpen(true);    // deschide dialogul
    } else {
      applyUpdate({ field, value });
    }
  };

  // Construiește lista de câmpuri de șters în funcție de tranziție
  const buildResetMap = (fromType, toType) => {
    // Resetăm mereu baza
    let wipe = { ...baseResets };

    // Dacă merg la "user" => șterg TOT ce e specific ambelor
    if (toType === "user") {
      wipe = { ...wipe, ...artistOnlyResets, ...locationOnlyResets };
    } else if (toType === "artist") {
      // merg spre artist -> curăț doar câmpurile de locație
      wipe = { ...wipe, ...locationOnlyResets };
    } else if (toType === "location") {
      // merg spre locație -> curăț doar câmpurile de artist
      wipe = { ...wipe, ...artistOnlyResets };
    }

    // În plus, dacă schimb între artist <-> location, e tot un reset bidirecțional
    if ((fromType === "artist" && toType === "location") || (fromType === "location" && toType === "artist")) {
      wipe = { ...wipe, ...artistOnlyResets, ...locationOnlyResets };
    }

    return wipe;
  };

  const handleConfirmTypeChange = async () => {
    try {
      const currentType = userData?.type ?? "user";
      const toType = nextType || "user";

      const resetMap = buildResetMap(currentType, toType);

      // aplică resetările (secvențial e ok aici)
      for (const [field, value] of Object.entries(resetMap)) {
        await applyUpdate({ field, value });
      }
      // setează tipul la final
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
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {isNewAccount && (
        <span
          title="Profil creat recent"
          className="text-xs font-semibold uppercase bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1"
        >
          <span>✨</span> Nou
        </span>
      )}
      {userData?.promoted && (
        <span className="text-xs font-semibold uppercase bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
          Promovat
        </span>
      )}
      {verificationStatus === "verified" && (
        <span className="text-xs font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
          Verificat
        </span>
      )}
      {verificationStatus === "pending" && (
        <span className="text-xs font-semibold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          Verificare în curs
        </span>
      )}
    </div>
  );

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
      {/* Avatar */}
      <div className="relative w-[160px] h-[160px] rounded-full overflow-visible !w-full !flex justify-center">
        <ProfileAvatarWithProgress
          imageSrc={imageSrc}
          progress={progressPercent}
          canEdit={isOwnProfile}
          fileInputRef={fileInputRef}
          handleAvatarChange={handleAvatarChange}
        />
      </div>

      {/* Nume */}
      <p className="text-base font-semibold text-gray-700">{username}</p>

      {/* Oraș */}
      <div className="mt-3 w-full">
        <label className="block text-xs font-semibold text-gray-500 mb-1">Oraș / Comună</label>
        {isOwnProfile ? (
          <CityAutocomplete
            value={userData.city || ""}
            onChange={(val) => applyUpdate({ field: "city", value: String(val).trim() })}
            options={cities}
            placeholder="ex: București"
          />
        ) : (
          <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">{userData.city || "—"}</div>
        )}
      </div>

      {/* Doar locații: capacitate/buget/tip */}
      {isLocation && (
        <div className="mt-2 w-full space-y-2">
          <EditableField
            label="Capacitate"
            value={Number.isFinite(userData.capacity) ? String(userData.capacity) : ""}
            placeholder="ex: 120"
            canEdit={isOwnProfile}
            type="number"
            onSave={(val) => applyUpdate({ field: "capacity", value: Number(val || 0) })}
          />
          <EditableField
            label="Buget (RON)"
            value={
              userData.budget === 0
                ? "Gratis"
                : typeof userData.budget === "number"
                ? String(userData.budget)
                : ""
            }
            placeholder="ex: 500"
            canEdit={isOwnProfile}
            type="number"
            onSave={(val) => {
              const num = Number(val || 0);
              applyUpdate({ field: "budget", value: num === 0 ? "Gratis" : num });
            }}
          />
          <div className="w-full">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tip locație</label>
            {isOwnProfile ? (
              <InlineSelect
                value={userData.locationType || ""}
                onChange={(val) => applyUpdate({ field: "locationType", value: val })}
                options={locationTypes}
                placeholder="Alege tipul"
              />
            ) : (
              <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
                {userData.locationType || "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {badge}

      {/* Switch tip cont — acum cu confirmare + reset */}
      {isOwnProfile && (
        <AccountTypeSwitcher
          value={userData?.type}
          onConfirm={requestTypeChange}   // <-- interceptăm aici
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
          <EditableField
            label="Tarif (RON / set)"
            value={
              userData.rate === 0 || /^gratis$/i.test(String(userData.rate))
                ? "Gratis"
                : String(userData.rate || "")
            }
            placeholder="ex: 300"
            canEdit={isOwnProfile}
            isPrice
            type="number"
            onSave={(val) => {
              const num = Number(String(val).replace(/[^\d]/g, "")) || 0;
              const finalValue = num === 0 ? "Gratis" : `${num} RON / set`;
              applyUpdate({ field: "rate", value: finalValue });
            }}
          />
        )}

        {/* Toggle promovat */}
        {isOwnProfile && (
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span className="text-sm font-medium">Promovat</span>
            <Button
              variant={userData?.promoted ? "secondary" : "primary"}
              onClick={() => applyUpdate({ field: "promoted", value: !userData?.promoted })}
            >
              {userData?.promoted ? "Dezactivează" : "Activează"}
            </Button>
          </div>
        )}

        {/* Verificare identitate */}
        <div className="flex items-center justify-between border rounded-lg px-3 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Verificare identitate</span>
            <span className="text-xs text-gray-500">
              {verificationStatus === "verified"
                ? "Cont verificat"
                : verificationStatus === "pending"
                ? "În curs de verificare"
                : "Disponibil după ce profilul este complet 100%"}
            </span>
          </div>
          <Button
            variant="primary"
            onClick={onOpenKYC}
            disabled={!canRequestVerification || !isOwnProfile}
          >
            {verificationStatus === "verified" ? "Verificat" : "Verifică identitatea"}
          </Button>
        </div>

        <div className="mt-6">
          <SectionTitle>Disponibilitate</SectionTitle>
          {!userData?.type ? (
            <p className="text-xs text-gray-500">Alege tipul de cont pentru a seta disponibilitatea.</p>
          ) : (
            <AvailabilityCalendar
              userId={isOwnProfile ? authUser?.uid : undefined}
              currentUser={authUser}
              type={isArtist ? "artist" : "location"}
              editable={!!isOwnProfile}
            />
          )}
        </div>
      </div>

      {isOwnProfile && (
        <div className="flex flex-col gap-3 w-full mt-6">
          <Button variant="primary" onClick={() => window.location.assign("/settings")} className="w-full">
            Setări avansate
          </Button>
          <Button variant="secondary" onClick={onLogout} className="w-full" leftIcon={<LogOut className="w-4 h-4" />}>
            Deconectare
          </Button>
          <Button
            variant="destructive"
            onClick={() => applyUpdate({ field: "deleteAccount", value: true })}
            className="w-full"
          >
            Șterge contul
          </Button>
        </div>
      )}

      {/* ----- Dialog de confirmare reset la schimbarea tipului de cont ----- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[96%] max-w-md bg-[#0a0a0a] text-white border border-white/10">
          <DialogHeader>
            <DialogTitle>Schimbi tipul de cont?</DialogTitle>
            <DialogDescription className="text-white/70">
              Trecerea la alt tip de cont va <b>șterge definitiv</b> majoritatea setărilor și datelor tale
              specifice tipului curent (tarif/buget, capacitate, genuri, echipament, adrese, demo-uri, galerie,
              oraș, statut promovat/verificare etc.). Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>

          {fieldsWipedPreview.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 text-xs text-white/70">
              <div className="mb-1 font-semibold text-white/80">Câmpuri ce vor fi resetate:</div>
              <ul className="list-disc ml-5 space-y-0.5">
                {fieldsWipedPreview.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => { setConfirmOpen(false); setNextType(null); }}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleConfirmTypeChange}>
              Da, șterge și schimbă tipul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
