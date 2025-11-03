/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-undef */
// pages/ProfilePage.jsx

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { auth, db, storage } from "../src/firebase";
import { doc, deleteDoc, updateDoc, onSnapshot as onDocSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import ProfileAvatarWithProgress from "../components/ProfilePhotoWithAvatar";
import { EditableField } from "../components/EditableField";
import EditableGenres from "../components/EditableGenres";
import MediaGallery from "../components/MediaGallery";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import EditableDJEquipment from "../components/EditableDJEquipment";
import ArtistDemos from "../components/ArtistDemos";

import { LogOut } from "lucide-react";

import LoadingPage from "./LoadingPage";
import EditableSpecializations from "../components/EditableSpecializations";
import EditableBio from "../components/EditableBio";
import { Button } from "../components/uiux";

import SectionTitle from "../components/SectionTitle";
import CollaborationsWithReviews from "../components/CollaborationsWithReviews";
import ReviewsSummaryFromCollabs from "../components/ReviewsSummaryFromCollabs";
import AccountTypeSwitcher from "../components/AccountTypeSwitcher";
import LocationAddressSimple from "../components/LocationAddressSimple";
import KYCDialog from "../components/KYCDialog";
import cities from "../src/data/cities";

/* ----------------------------- Helpers (local) ----------------------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// taie tot ce nu e cifră
const toNumberOnly = (v) => {
  if (v == null) return null;
  const digits = String(v).replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
};

/* ============================== PAGE ============================== */
export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // KYC modal (buletin)
  const [kycOpen, setKycOpen] = useState(false);

  const isOwnProfile = useMemo(() => !id || (authUser && authUser.uid === id), [id, authUser]);
  const profileUid = useMemo(() => id || authUser?.uid, [id, authUser]);

  const isTypeChosen = userData?.type === "artist" || userData?.type === "location";
  const isArtist = userData?.type === "artist";
  const isLocation = userData?.type === "location";

  const goToGenre = (term) => navigate(`/search?q=${encodeURIComponent(term)}&type=genre`);
  const goToPref = (term) => navigate(`/search?q=${encodeURIComponent(term)}&type=pref`);

  const normalizeRate = useCallback((v) => {
    if (v == null) return "";
    const s = String(v).trim().toLowerCase().replace(/\s+/g, " ");
    if (s === "gratis" || s === "free") return "gratis";
    if (s === "0" || s === "0 ron" || s === "0 lei") return "gratis";
    const num = Number(String(v).replace(/[^\d.]/g, ""));
    if (!Number.isNaN(num) && num === 0) return "gratis";
    if (!Number.isNaN(num) && num > 0) return `${num} RON / set`;
    return s;
  }, []);

  const handleGalleryChange = useCallback(
    async (nextItems) => {
      setUserData((u) => ({ ...u, gallery: nextItems }));
      if (!profileUid) return;
      try {
        const userRef = doc(db, "users", profileUid);
        await updateDoc(userRef, { gallery: nextItems });
      } catch (e) {
        console.error("Eroare la salvarea galeriei:", e);
      }
    },
    [profileUid]
  );

  // Auth + live load profil
  useEffect(() => {
    let alive = true;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!alive) return;
      setAuthUser(firebaseUser);
      const uidToLoad = id || firebaseUser?.uid;
      if (!uidToLoad) {
        navigate("/login");
        if (alive) setLoading(false);
        return;
      }
      const ref = doc(db, "users", uidToLoad);
      const unsubDoc = onDocSnapshot(ref, (snap) => {
        if (!alive) return;
        setUserData(snap.exists() ? snap.data() : null);
        setLoading(false);
      });
      return () => unsubDoc();
    });
    return () => {
      alive = false;
      unsubAuth();
    };
  }, [id, navigate]);

  // doar ca să nu mai existe dialogul vechi pe schimbarea rutei
  useEffect(() => {
    // nimic aici acum
  }, [location.pathname]);

  /* ------------------------------------------------------------------ */
  /* 1. helper general: salvează direct în Firestore, fără dialog       */
  /* ------------------------------------------------------------------ */
  const applyUpdate = useCallback(
    async ({ field, value }) => {
      if (!authUser) return;
      const userRef = doc(db, "users", authUser.uid);

      // ștergere cont – păstrăm confirmare de browser
      if (field === "deleteAccount") {
        const ok = window.confirm("Ești sigur că vrei să ștergi contul? Acțiunea e definitivă.");
        if (!ok) return;
        try {
          await deleteDoc(userRef);
        } catch (e) {
          console.warn("Nu s-a putut șterge documentul:", e?.message || e);
        }
        try {
          await deleteUser(authUser);
        } catch (e) {
          if (e?.code === "auth/requires-recent-login") {
            await signOut(auth);
            navigate("/login");
            return;
          }
          throw e;
        }
        await signOut(auth);
        setUserData(null);
        navigate("/", { replace: true });
        return;
      }

      // toggle tip cont
      if (field === "type") {
        const currentType = userData?.type ?? "user";
        const clickedType = value;
        value = currentType === clickedType ? "user" : clickedType;
      }

      try {
        await updateDoc(userRef, { [field]: value });
        setUserData((prev) => ({ ...prev, [field]: value }));
      } catch (err) {
        console.error("Eroare la salvare imediată:", err);
      }
    },
    [authUser, navigate, userData]
  );

  /* ------------------------------------------------------------------ */
  /* 2. upload avatar -> salvează direct                                */
  /* ------------------------------------------------------------------ */
  const uploadAvatarAndGetUrl = useCallback(
    async (file) => {
      if (!authUser || !file) throw new Error("Nu ești autentificat sau nu există fișier.");
      const isImage = file.type?.startsWith("image/");
      if (!isImage) throw new Error("Fișierul selectat nu este imagine.");
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 5) throw new Error("Imaginea depășește 5MB.");
      const ext = file.name?.split(".").pop() || "jpg";
      const path = `users/${authUser.uid}/avatar.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      return await getDownloadURL(ref);
    },
    [authUser]
  );

  const handleAvatarChange = useCallback(
    async (payload) => {
      try {
        let url = null;
        if (typeof payload === "string" && payload.startsWith("http")) url = payload;
        else if (payload?.target?.files?.[0]) url = await uploadAvatarAndGetUrl(payload.target.files[0]);
        else if (payload instanceof File) url = await uploadAvatarAndGetUrl(payload);
        else return;

        await applyUpdate({ field: "photoURL", value: url });
      } catch (err) {
        console.error(err);
      }
    },
    [uploadAvatarAndGetUrl, applyUpdate]
  );

  /* ---------------------------- DEMO LINKS (artist) ---------------------------- */
  const addDemos = useCallback(
    async (newItems) => {
      if (!profileUid || !newItems?.length) return;
      const ref = doc(db, "users", profileUid);
      const prev = Array.isArray(userData?.demos) ? userData.demos : [];
      const incoming = newItems
        .map((x) => (typeof x === "string" ? { url: x } : x))
        .map((x) => ({ url: String(x.url || "").trim() }))
        .filter((x) => x.url && !prev.some((p) => (p.url || p) === x.url));

      const demos = [...prev, ...incoming].slice(0, 3);
      await updateDoc(ref, { demos });
      setUserData((p) => ({ ...p, demos }));
    },
    [profileUid, userData]
  );

  const deleteDemo = useCallback(
    async (url) => {
      if (!profileUid) return;
      const ref = doc(db, "users", profileUid);
      const prev = Array.isArray(userData?.demos) ? userData.demos : [];
      const demos = prev.filter((x) => (x.url || x) !== url);
      await updateDoc(ref, { demos });
      setUserData((p) => ({ ...p, demos }));
    },
    [profileUid, userData]
  );

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate("/login");
  }, [navigate]);

  const username = useMemo(() => {
    if (isArtist) return userData?.stageName || userData?.name || "Utilizator";
    if (isLocation) return userData?.locationName || userData?.name || "Utilizator";
    return userData?.name || "Utilizator";
  }, [isArtist, isLocation, userData]);

  // NEW: badge "Nou" dacă profilul a fost creat în ultimele 3 zile
  const isNewAccount = useMemo(() => {
    try {
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      let createdAtMs = null;
      // Folosește users.createdAt (Firestore Timestamp) dacă există
      if (userData?.createdAt?.toMillis) {
        createdAtMs = userData.createdAt.toMillis();
      }
      // Fallback: metadata din Firebase Auth
      if (!createdAtMs && authUser?.metadata?.creationTime) {
        createdAtMs = Date.parse(authUser.metadata.creationTime);
      }
      if (!createdAtMs || Number.isNaN(createdAtMs)) return false;
      return Date.now() - createdAtMs <= THREE_DAYS_MS;
    } catch {
      return false;
    }
  }, [userData?.createdAt, authUser?.metadata?.creationTime]);

  // progress bar (simplu)
  const progress = useMemo(() => {
    if (!userData) return { percent: 0, missing: [] };
    if (!isTypeChosen) return { percent: 0, missing: [] };

    const fields = isArtist
      ? [
          { key: "stageName", label: "numele de scenă" },
          { key: "bio", label: "descrierea" },
          { key: "genres", label: "genurile muzicale" },
          { key: "djEquipment", label: "echipamentul DJ" },
          { key: "rate", label: "tariful" },
          { key: "photoURL", label: "fotografia de profil" },
          { key: "demos", label: "demo-urile" },
          { key: "city", label: "orașul" },
        ]
      : [
          { key: "locationName", label: "numele locației" },
          { key: "capacity", label: "capacitatea" },
          { key: "djEquipment", label: "echipamentul" },
          { key: "photoURL", label: "fotografia locației" },
          { key: "address", label: "adresa" },
          { key: "budget", label: "bugetul" },
          { key: "city", label: "orașul" },
        ];

    const filled = fields.filter((f) => {
      const val = userData[f.key];
      return Array.isArray(val) ? val.length > 0 : !!val;
    });

    const missing = fields
      .filter((f) => !filled.some((x) => x.key === f.key))
      .map((f) => f.label);

    const percent = Math.round((filled.length / fields.length) * 100);
    return { percent, missing };
  }, [userData, isTypeChosen, isArtist]);

  const imageSrc =
    userData?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`;

  const normalizedRate = normalizeRate(userData?.rate);
  const isFree = normalizedRate === "gratis";
  const rateClass = isFree ? "text-green-600 font-bold uppercase text-xl" : "text-red-600 font-bold text-xl";

  const verificationStatus = userData?.verificationStatus || "unverified"; // 'unverified' | 'pending' | 'verified'
  const canRequestVerification = progress.percent === 100 && verificationStatus !== "verified";

  if (loading) return <LoadingPage />;

  if (!userData) {
    return (
      <div className="min-h-screen bg-black text-white md:p-6">
        <div className="max-w-3xl mx-auto text-center">
          <p>Profilul nu a fost găsit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8 text-black">
        {/* Banner progres */}
        {isOwnProfile && (
          <div
            className={`mb-4 text-sm font-medium rounded px-4 py-2 ${
              progress.percent < 100 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
            }`}
          >
            {!isTypeChosen ? (
              "⚠️ Selectează tipul de cont (Artist sau Locație) când ești gata. Până atunci, poți edita câmpurile generale."
            ) : progress.percent < 100 ? (
              <>
                ⚠️ Progres: {progress.percent}% — mai completează{" "}
                <span className="font-semibold">{progress.missing.join(", ")}</span> pentru un profil complet.
              </>
            ) : (
              "✅ Profil complet!"
            )}
          </div>
        )}

        <div className="md:flex gap-10">
          {/* STÂNGA */}
          <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
            <div className="relative w-[128px] h-[128px] rounded-full overflow-visible">
              <ProfileAvatarWithProgress
                imageSrc={imageSrc}
                progress={progress.percent}
                canEdit={isOwnProfile}
                fileInputRef={fileInputRef}
                handleAvatarChange={handleAvatarChange}
              />
            </div>

            {/* Nume + badge-uri */}
            {/* Nume (non-editabil in pagina de profil) */}
            <SectionTitle>{username}</SectionTitle>

            {/* Oraș / Comună — identic pentru artist și locație */}
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
                <div className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-800">
                  {userData.city || "—"}
                </div>
              )}
            </div>

            {/* doar pentru locații: capacitate + buget */}
            {isLocation && (
              <div className="mt-2 w-full space-y-2">
                {/* CAPACITATE – numeric only */}
                <EditableField
                  label="Capacitate"
                  value={Number.isFinite(userData.capacity) ? String(userData.capacity) : ""}
                  placeholder="ex: 120"
                  canEdit={isOwnProfile}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    onInput: (e) => {
                      // taie orice nu e cifră
                      e.target.value = e.target.value.replace(/\D/g, "");
                    },
                    onKeyDown: (e) => {
                      // blochează e, E, +, -, .
                      if (["e", "E", "+", "-", "."].includes(e.key)) {
                        e.preventDefault();
                      }
                    },
                  }}
                  onSave={(val) => {
                    const num = toNumberOnly(val);
                    applyUpdate({
                      field: "capacity",
                      value: num,
                    });
                  }}
                />

                {/* BUGET – numeric only */}
                <EditableField
                  label="Buget (RON)"
                  value={typeof userData.budget === "number" ? String(userData.budget) : ""}
                  placeholder="ex: 500"
                  canEdit={isOwnProfile}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  onSave={(val) => {
                    const num = toNumberOnly(val);
                    applyUpdate({
                      field: "budget",
                      value: num,
                    });
                  }}
                />
              </div>
            )}

            {/* Badges vizuale */}
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

            {isOwnProfile && (
              <AccountTypeSwitcher
                value={userData?.type}
                onConfirm={applyUpdate}
                disabled={!isOwnProfile}
                className="w-full"
              />
            )}

            {isTypeChosen && (
              <ReviewsSummaryFromCollabs profileUid={profileUid} side={isArtist ? "artist" : "location"} />
            )}

            <div className="mt-6 space-y-3 text-sm w-full">
              {isArtist && (
                <EditableField
                  label="Tarif"
                  value={normalizedRate}
                  isPrice
                  canEdit={isOwnProfile}
                  onSave={(val) => applyUpdate({ field: "rate", value: normalizeRate(val) })}
                  inputClassName={rateClass}
                />
              )}

              {/* Toggle Promovat (doar pentru propriul profil) */}
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
                  onClick={() => setKycOpen(true)}
                  disabled={!canRequestVerification || !isOwnProfile}
                >
                  {verificationStatus === "verified" ? "Verificat" : "Verifică identitatea"}
                </Button>
              </div>

              <div className="mt-6">
                <SectionTitle>Disponibilitate</SectionTitle>
                {!isTypeChosen ? (
                  <p className="text-xs text-gray-500">
                    Alege tipul de cont pentru a seta disponibilitatea (Artist / Locație).
                  </p>
                ) : (
                  <AvailabilityCalendar
                    userId={profileUid}
                    currentUser={authUser}
                    type={isArtist ? "artist" : "location"}
                    editable={authUser?.uid === profileUid}
                  />
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="flex flex-col gap-3 w-full mt-6">
                <Button variant="primary" onClick={() => navigate("/settings")} className="w-full">
                  Setări avansate
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleLogout}
                  className="w-full"
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
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
          </div>

          {/* DREAPTA */}
          <div className="w-full md:w-2/3 space-y-8">
            {/* DESPRE – doar dacă e al tău sau are conținut */}
            {(isOwnProfile || (userData.bio && userData.bio.trim().length > 0)) && (
              <section>
                <EditableBio
                  value={userData.bio || ""}
                  canEdit={isOwnProfile}
                  onSave={(val) => applyUpdate({ field: "bio", value: val })}
                  maxLength={1000}
                  minLength={0}
                />
              </section>
            )}

            {/* ARTIST */}
            {isArtist && (
              <>
                {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
                  <EditableDJEquipment
                    type="artist"
                    value={userData.djEquipment}
                    canEdit={isOwnProfile}
                    onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
                  />
                )}

                <EditableSpecializations
                  value={Array.isArray(userData.specializations) ? userData.specializations : []}
                  canEdit={isOwnProfile}
                  onSave={(arr) => applyUpdate({ field: "specializations", value: arr })}
                  onChipClick={goToPref}
                />

                <EditableGenres
                  value={Array.isArray(userData.genres) ? userData.genres : []}
                  canEdit={isOwnProfile}
                  onSave={(genres) => applyUpdate({ field: "genres", value: genres })}
                  onChipClick={goToGenre}
                />

                <section>
                  <SectionTitle>Colaborări</SectionTitle>
                  <CollaborationsWithReviews
                    profileUid={profileUid}
                    side="artist"
                    authUser={authUser}
                    pageSize={20}
                  />
                </section>

                <section>
                  <SectionTitle>Demo-uri</SectionTitle>
                  <ArtistDemos
                    canEdit={isOwnProfile}
                    current={
                      Array.isArray(userData.demos)
                        ? userData.demos.map((x) => (typeof x === "string" ? { url: x } : x))
                        : []
                    }
                    onAdded={addDemos}
                    onDeleted={deleteDemo}
                  />
                </section>
              </>
            )}

            {/* LOCAȚIE */}
            {isLocation && (
              <>
                {(isOwnProfile || (userData.djEquipment && userData.djEquipment.length > 0)) && (
                  <EditableDJEquipment
                    type="location"
                    value={userData.djEquipment}
                    canEdit={isOwnProfile}
                    onSave={(payload) => applyUpdate({ field: "djEquipment", value: payload })}
                  />
                )}

                {/* ADRESĂ SIMPLĂ */}
                <section>
                  <SectionTitle>Adresă</SectionTitle>
                  <LocationAddressSimple
                    address={userData.address}
                    mapsLink={userData.googleMapsLink}
                    canEdit={isOwnProfile}
                    onChange={({ address, googleMapsLink }) => {
                      applyUpdate({ field: "address", value: address });
                      applyUpdate({ field: "googleMapsLink", value: googleMapsLink });
                    }}
                  />
                </section>

                <section>
                  <SectionTitle>Colaborări</SectionTitle>
                  <CollaborationsWithReviews
                    profileUid={profileUid}
                    side="location"
                    authUser={authUser}
                    pageSize={20}
                  />
                </section>
              </>
            )}

            {/* GALERIE */}
            <section>
              <SectionTitle>Galerie media</SectionTitle>
              <MediaGallery
                canEdit={isOwnProfile}
                authUser={authUser}
                items={userData.gallery}
                title="Galerie media"
                max={5}
                addButtonMode="hide"
                onChange={handleGalleryChange}
                onExceedMax={(m) => console.log(`Limita de ${m} imagini atinsă`)}
                maxFileSizeMB={8}
                minWidth={600}
                minHeight={600}
                maxWidth={5000}
                maxHeight={5000}
              />
            </section>
          </div>
        </div>
      </div>

      {/* KYC rămâne */}
      <KYCDialog
        open={kycOpen}
        onOpenChange={setKycOpen}
        authUser={authUser}
        userData={userData}
        setUserData={setUserData}
      />
    </div>
  );
}

/* ========================================================================== */
/* ====================== COMPONENTE MICI (în același fișier) ================ */
/* ========================================================================== */

function CityAutocomplete({ value, onChange, options, placeholder = "Caută oraș..." }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 30);
    const q = query.toLowerCase();
    return options.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 30);
  }, [query, options]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border rounded-lg shadow-lg">
          {filtered.map((c) => (
            <div
              key={c.label}
              onClick={() => {
                setQuery(c.label);
                setOpen(false);
                onChange?.(c.label);
              }}
              className="px-3 py-2 text-sm text-gray-800 hover:bg-violet-50 cursor-pointer"
            >
              {c.label}
              {c.county ? <span className="text-xs text-gray-400 ml-1">({c.county})</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressSearchGlovoLike({
  value,
  onSelect,
  placeholder = "Caută adresa...",
  enableCurrentLocation = true,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const ADDRESS_SUGGESTIONS = useMemo(
    () => [
      { label: "Aleea Lunca Cernei", city: "București", country: "România" },
      { label: "Aleea Lunca Mureșului", city: "București", country: "România" },
      { label: "Aleea Lunca Bradului", city: "București", country: "România" },
      { label: "Aleea Lunca Siretului", city: "București", country: "România" },
      { label: "Aleea Lunca Moldovei", city: "București", country: "România" },
      { label: "Bulevardul Unirii", city: "București", country: "România" },
      { label: "Strada Doamnei", city: "București", country: "România" },
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query) return ADDRESS_SUGGESTIONS.slice(0, 6);
    const q = query.toLowerCase();
    return ADDRESS_SUGGESTIONS.filter((item) => item.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, ADDRESS_SUGGESTIONS]);

  const handleSelect = (item) => {
    const full = `${item.label}, ${item.city}, ${item.country}`;
    setQuery(full);
    setOpen(false);
    onSelect?.(full, item);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border rounded-full px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-violet-500">
        <span className="text-gray-400 text-lg">🔍</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent text-sm text-gray-900"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(true);
              onSelect?.("");
            }}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl shadow-2xl overflow-hidden border">
          {enableCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  const fakeText = "Locația ta curentă";
                  setQuery(fakeText);
                  setOpen(false);
                  onSelect?.(fakeText, {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  });
                });
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-violet-50"
            >
              📍
              <span className="font-medium text-gray-800">Utilizează locația curentă</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Nicio adresă găsită.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.label + item.city}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-violet-50"
              >
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">
                  {item.city}, {item.country}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
