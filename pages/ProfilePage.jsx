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
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/uiux";

import SectionTitle from "../components/SectionTitle";
import CollaborationsWithReviews from "../components/CollaborationsWithReviews";
import ReviewsSummaryFromCollabs from "../components/ReviewsSummaryFromCollabs";
import AccountTypeSwitcher from "../components/AccountTypeSwitcher";

/* ----------------------------- Helpers (local) ----------------------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ============================== PAGE ============================== */
export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // KYC modal (buletin)
  const [kycOpen, setKycOpen] = useState(false);
  const [kycFront, setKycFront] = useState(null);
  const [kycBack, setKycBack] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState("");

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

  useEffect(() => {
    setModalOpen(false);
  }, [location.pathname]);

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
        setErrorMsg("");
        let url = null;
        if (typeof payload === "string" && payload.startsWith("http")) url = payload;
        else if (payload?.target?.files?.[0]) url = await uploadAvatarAndGetUrl(payload.target.files[0]);
        else if (payload instanceof File) url = await uploadAvatarAndGetUrl(payload);
        else return;
        setPendingUpdate({ field: "photoURL", value: url });
        setModalOpen(true);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Eroare la uploadul avatarului.");
      }
    },
    [uploadAvatarAndGetUrl]
  );

  const openConfirmModal = useCallback(({ field, value }) => {
    setPendingUpdate({ field, value });
    setModalOpen(true);
  }, []);

  const confirmSave = useCallback(async () => {
    if (!authUser || !pendingUpdate) return;
    setSaving(true);
    setErrorMsg("");

    try {
      const userRef = doc(db, "users", authUser.uid);
      let { field, value } = pendingUpdate;

      // ȘTERGERE CONT
      if (field === "deleteAccount") {
        try {
          await deleteDoc(userRef);
        } catch (e) {
          console.warn("Nu s-a putut șterge documentul:", e?.message || e);
        }
        try {
          await deleteUser(authUser);
        } catch (e) {
          if (e?.code === "auth/requires-recent-login") {
            setErrorMsg("Pentru a șterge contul, trebuie să te reconectezi. Te redirecționez acum.");
            await signOut(auth);
            navigate("/login");
            setSaving(false);
            return;
          }
          throw e;
        }
        await signOut(auth);
        setUserData(null);
        setAuthUser(null);
        navigate("/", { replace: true });
        return;
      }

      // Toggle tip cont
      if (field === "type") {
        const currentType = userData?.type ?? "user";
        const clickedType = value;
        value = currentType === clickedType ? "user" : clickedType;
      }

      await updateDoc(userRef, { [field]: value });
      setUserData((prev) => ({ ...prev, [field]: value }));
      setPendingUpdate(null);
      setModalOpen(false);
    } catch (err) {
      console.error("Eroare confirmSave:", err);
      setErrorMsg("A apărut o eroare la salvare. Încearcă din nou.");
    } finally {
      setSaving(false);
    }
  }, [authUser, pendingUpdate, userData, navigate]);

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

  const handleUsernameSave = useCallback(
    (val) => {
      if (!isTypeChosen) return openConfirmModal({ field: "name", value: val });
      if (isArtist) return openConfirmModal({ field: "stageName", value: val });
      return openConfirmModal({ field: "locationName", value: val });
    },
    [isTypeChosen, isArtist, openConfirmModal]
  );

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
          { key: "acceptedGenres", label: "genurile acceptate" },
          { key: "photoURL", label: "fotografia locației" },
          { key: "mapLocation", label: "harta" },
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
          {/* Stânga */}
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
            <EditableField
              value={username}
              placeholder="Nume profil"
              canEdit={isOwnProfile}
              onSave={handleUsernameSave}
              inputClassName="text-2xl font-bold"
            />

            {/* Badges vizuale */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
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

            <EditableField
              value={userData.realName || "Anonim"}
              placeholder="Nume real"
              canEdit={isOwnProfile}
              onSave={(val) => openConfirmModal({ field: "realName", value: val })}
              inputClassName="text-sm text-gray-500 mb-3"
            />

            {isOwnProfile && (
              <AccountTypeSwitcher
                value={userData?.type}
                onConfirm={openConfirmModal}
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
                  onSave={(val) => openConfirmModal({ field: "rate", value: normalizeRate(val) })}
                  inputClassName={rateClass}
                />
              )}

              {isArtist && (
                <EditableField
                  label="Oraș"
                  value={userData.city || ""}
                  placeholder="ex: București"
                  canEdit={isOwnProfile}
                  onSave={(val) => openConfirmModal({ field: "city", value: String(val).trim() })}
                />
              )}

              {/* Toggle Promovat (doar pentru propriul profil) */}
              {isOwnProfile && (
                <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">Promovat</span>
                  <Button
                    variant={userData?.promoted ? "secondary" : "primary"}
                    onClick={() => openConfirmModal({ field: "promoted", value: !userData?.promoted })}
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
                  <p className="text-xs text-gray-500">Alege tipul de cont pentru a seta disponibilitatea (Artist / Locație).</p>
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
                <Button variant="secondary" onClick={handleLogout} className="w-full" leftIcon={<LogOut className="w-4 h-4" />}>
                  Deconectare
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setPendingUpdate({ field: "deleteAccount", value: true }) || setModalOpen(true)}
                  className="w-full"
                >
                  Șterge contul
                </Button>
              </div>
            )}
          </div>

          {/* Dreapta */}
          <div className="w-full md:w-2/3 space-y-8">
            <section>
              <EditableBio
                value={userData.bio || ""}
                canEdit={isOwnProfile}
                onSave={(val) => openConfirmModal({ field: "bio", value: val })}
                maxLength={1000}
                minLength={0}
              />
            </section>

            {isArtist && (
              <>
                <EditableDJEquipment
                  type="artist"
                  value={userData.djEquipment}
                  canEdit={isOwnProfile}
                  onSave={(payload) => openConfirmModal({ field: "djEquipment", value: payload })}
                />
                <EditableSpecializations
                  value={Array.isArray(userData.specializations) ? userData.specializations : []}
                  canEdit={isOwnProfile}
                  onSave={(arr) => openConfirmModal({ field: "specializations", value: arr })}
                  onChipClick={goToPref}
                />
                <EditableGenres
                  value={Array.isArray(userData.genres) ? userData.genres : []}
                  canEdit={isOwnProfile}
                  onSave={(genres) => openConfirmModal({ field: "genres", value: genres })}
                  onChipClick={goToGenre}
                />
                <section>
                  <SectionTitle>Colaborări</SectionTitle>
                  <CollaborationsWithReviews profileUid={profileUid} side="artist" authUser={authUser} pageSize={20} />
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

            {isLocation && (
              <>
                <EditableDJEquipment
                  type="location"
                  value={userData.djEquipment}
                  canEdit={isOwnProfile}
                  onSave={(payload) => openConfirmModal({ field: "djEquipment", value: payload })}
                />
                <EditableGenres
                  value={Array.isArray(userData.acceptedGenres) ? userData.acceptedGenres : []}
                  canEdit={isOwnProfile}
                  onSave={(genres) => openConfirmModal({ field: "acceptedGenres", value: genres })}
                />

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Capacitate maximă"
                    value={userData.capacity ?? ""}
                    placeholder="ex: 150"
                    canEdit={isOwnProfile}
                    onSave={(val) => {
                      const num = Number(String(val).replace(/[^\d]/g, ""));
                      openConfirmModal({ field: "capacity", value: Number.isFinite(num) ? num : null });
                    }}
                  />
                </section>

                <section>
                  <SectionTitle>Adresă (hartă interactivă)</SectionTitle>
                  <MapLocationEditor
                    value={userData.mapLocation}
                    canEdit={isOwnProfile}
                    onSave={(val) => openConfirmModal({ field: "mapLocation", value: val })}
                  />
                </section>

                <section>
                  <SectionTitle>Colaborări</SectionTitle>
                  <CollaborationsWithReviews profileUid={profileUid} side="location" authUser={authUser} pageSize={20} />
                </section>
              </>
            )}

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

      {/* Modal confirmare update generice */}
      {isOwnProfile && (
        <Dialog open={modalOpen} onOpenChange={(open) => !saving && setModalOpen(open)}>
          <DialogContent
            className="sm:max-w-lg"
            onInteractOutside={(e) => saving && e.preventDefault()}
            onEscapeKeyDown={(e) => saving && e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) confirmSave();
              if (e.key === "Escape" && !saving) setModalOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl">Confirmă modificarea</DialogTitle>
              <DialogDescription className="mt-1 text-base text-gray-600">
                Ești sigur că vrei să salvezi această modificare?
              </DialogDescription>
            </DialogHeader>

            {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                Anulează
              </Button>
              <Button variant="primary" onClick={confirmSave} isLoading={saving}>
                Salvează
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal KYC (buletin) */}
      <Dialog open={kycOpen} onOpenChange={(open) => !kycLoading && setKycOpen(open)}>
        <DialogContent
          className="sm:max-w-lg !bg-white !text-black !p-6 !rounded-2xl !shadow-2xl !border !border-violet-200"
          onInteractOutside={(e) => kycLoading && e.preventDefault()}
          onEscapeKeyDown={(e) => kycLoading && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="!text-2xl !font-extrabold !tracking-tight">
              Verificare identitate
            </DialogTitle>
            <DialogDescription className="!mt-1 !text-base !text-gray-600">
              Încarcă fața și verso-ul buletinului. Datele sunt folosite doar pentru verificare.
            </DialogDescription>
          </DialogHeader>

          {kycError && (
            <p className="mt-3 text-sm !text-red-600 !font-medium !bg-red-50 !border !border-red-200 !rounded-lg !px-3 !py-2">
              {kycError}
            </p>
          )}

          <div className="mt-4 space-y-4">
            {/* Față */}
            <div>
              <label className="text-sm font-semibold !text-gray-900 uppercase tracking-wide">
                Buletin – Față
              </label>

              <label
                className="mt-2 block w-full cursor-pointer rounded-xl border-2 border-dashed !border-violet-300 bg-violet-50/40 hover:bg-violet-50 transition p-4"
                title="Click pentru a selecta imaginea (față)"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setKycFront(e.target.files?.[0] || null)}
                  disabled={kycLoading}
                />
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-white border !border-violet-200 grid place-items-center">
                    <span className="text-violet-600 text-xs font-bold">FAȚĂ</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {kycFront?.name || "Alege fișierul..."}
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG sau HEIC • max 10MB</p>
                  </div>
                </div>
              </label>

              {kycFront && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(kycFront)}
                    alt="Preview față"
                    className="w-full max-h-40 object-contain rounded-lg border !border-gray-200 bg-gray-50"
                  />
                </div>
              )}
            </div>

            {/* Verso */}
            <div>
              <label className="text-sm font-semibold !text-gray-900 uppercase tracking-wide">
                Buletin – Verso
              </label>

              <label
                className="mt-2 block w-full cursor-pointer rounded-xl border-2 border-dashed !border-violet-300 bg-violet-50/40 hover:bg-violet-50 transition p-4"
                title="Click pentru a selecta imaginea (verso)"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setKycBack(e.target.files?.[0] || null)}
                  disabled={kycLoading}
                />
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-white border !border-violet-200 grid place-items-center">
                    <span className="text-violet-600 text-xs font-bold">VERSO</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {kycBack?.name || "Alege fișierul..."}
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG sau HEIC • max 10MB</p>
                  </div>
                </div>
              </label>

              {kycBack && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(kycBack)}
                    alt="Preview verso"
                    className="w-full max-h-40 object-contain rounded-lg border !border-gray-200 bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              * Asigură-te că datele sunt clare și complet vizibile.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setKycOpen(false)}
                disabled={kycLoading}
                className="!border !border-gray-300 !text-gray-800 hover:!bg-gray-100"
              >
                Renunță
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!authUser) return;
                  if (!kycFront || !kycBack) {
                    setKycError("Te rog încarcă ambele imagini (față și verso).");
                    return;
                  }
                  setKycLoading(true);
                  setKycError("");
                  try {
                    const up = async (file, name) => {
                      const path = `users/${authUser.uid}/kyc/${name}`;
                      const ref = storageRef(storage, path);
                      await uploadBytes(ref, file);
                      return await getDownloadURL(ref);
                    };
                    const frontURL = await up(kycFront, "front.jpg");
                    const backURL = await up(kycBack, "back.jpg");

                    const userRef = doc(db, "users", authUser.uid);
                    await updateDoc(userRef, {
                      verificationStatus: "pending",
                      kyc: {
                        frontURL,
                        backURL,
                        submittedAt: new Date().toISOString(),
                      },
                    });
                    setUserData((p) => ({
                      ...p,
                      verificationStatus: "pending",
                      kyc: { frontURL, backURL, submittedAt: new Date().toISOString() },
                    }));
                    setKycOpen(false);
                  } catch (e) {
                    console.error(e);
                    setKycError("A apărut o eroare la trimiterea verificării. Încearcă din nou.");
                  } finally {
                    setKycLoading(false);
                  }
                }}
                isLoading={kycLoading}
                disabled={kycLoading}
                className="!bg-black !text-white hover:!bg-neutral-900"
              >
                Trimite pentru verificare
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

          </div>
        );
      }

/* ============================== MapLocationEditor ============================== */
function MapLocationEditor({ value, canEdit, onSave }) {
  const [lat, setLat] = useState(() => Number(value?.lat ?? 44.4268)); // București default
  const [lng, setLng] = useState(() => Number(value?.lng ?? 26.1025));
  const [zoom, setZoom] = useState(() => clamp(Number(value?.zoom ?? 14), 3, 18));

  useEffect(() => {
    if (value?.lat != null) setLat(Number(value.lat));
    if (value?.lng != null) setLng(Number(value.lng));
    if (value?.zoom != null) setZoom(clamp(Number(value.zoom), 3, 18));
  }, [value?.lat, value?.lng, value?.zoom]);

  const mapSrc = useMemo(() => {
    const d = 0.01 * (19 / zoom);
    const left = lng - d,
      right = lng + d,
      top = lat + d,
      bottom = lat - d;
    const marker = `${lat}%2C${lng}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${marker}`;
  }, [lat, lng, zoom]);

  const handleSave = () => onSave({ lat: Number(lat), lng: Number(lng), zoom: Number(zoom) });

  return (
    <div className="w-full">
      <div className="rounded-xl overflow-hidden border">
        <iframe title="OSM map" className="w-full h-[320px]" src={mapSrc} />
      </div>
      {canEdit && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Latitudine</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              className="w-full border rounded px-2 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Longitudine</label>
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              className="w-full border rounded px-2 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Zoom</label>
            <input
              type="number"
              min={3}
              max={18}
              value={zoom}
              onChange={(e) => setZoom(clamp(Number(e.target.value), 3, 18))}
              className="w-full border rounded px-2 py-2"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSave}>
              Salvează locația
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Poți muta poziția modificând coordonatele sau zoom-ul. Harta este interactivă pentru explorare, iar poziția
        salvată determină marker-ul.
      </p>
    </div>
  );
}
