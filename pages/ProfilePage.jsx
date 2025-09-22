/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-undef */
// pages/ProfilePage.jsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { auth, db, storage } from "../src/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";

import ProfileAvatarWithProgress from "../components/ProfilePhotoWithAvatar";
import { EditableField } from "../components/EditableField";
import EditableGenres from "../components/EditableGenres";
import SocialSection from "../components/SocialSection";
import MediaGallery from "../components/MediaGallery";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import DemosUploader from "../components/DemosUploader";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../src/components/ui/dialog";

import { LogOut } from "lucide-react";

import LoadingPage from "./LoadingPage";
import EditableSpecializations from "../components/EditableSpecializations";
import EditableBio from "../components/EditableBio";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";

// Colaborări + summary din colaborări (se arată doar după alegerea tipului)
import CollaborationsWithReviews from "../components/CollaborationsWithReviews";
import ReviewsSummaryFromCollabs from "../components/ReviewsSummaryFromCollabs";

// Switcher tip cont (fără selecție implicită)
import AccountTypeSwitcher from "../components/AccountTypeSwitcher";

/* ============================== PAGE ============================== */
export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isOwnProfile = useMemo(() => !id || (authUser && authUser.uid === id), [id, authUser]);
  const profileUid = useMemo(() => id || authUser?.uid, [id, authUser]);

  const isTypeChosen = !!userData?.type;
  const isArtist = userData?.type === "artist";
  const isLocation = userData?.type === "location";

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

  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!alive) return;
      setAuthUser(firebaseUser);
      const uidToLoad = id || firebaseUser?.uid;
      if (!uidToLoad) {
        navigate("/login");
        if (alive) setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", uidToLoad));
        if (!alive) return;
        if (snap.exists()) setUserData(snap.data());
      } finally {
        if (alive) setLoading(false);
      }
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [id, navigate]);

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
      await updateDoc(userRef, { [pendingUpdate.field]: pendingUpdate.value });
      setUserData((prev) => ({ ...prev, [pendingUpdate.field]: pendingUpdate.value }));
      setPendingUpdate(null);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("A apărut o eroare la salvare. Încearcă din nou.");
    } finally {
      setSaving(false);
    }
  }, [authUser, pendingUpdate]);

  const addDemos = useCallback(
    async (newItems) => {
      if (!profileUid || !newItems?.length) return;
      const ref = doc(db, "users", profileUid);
      const prev = Array.isArray(userData?.demos) ? userData.demos : [];
      const demos = [...prev, ...newItems].slice(0, 3);
      await updateDoc(ref, { demos });
      setUserData((p) => ({ ...p, demos }));
    },
    [profileUid, userData]
  );

  const deleteDemo = useCallback(
    async (idOrUrl) => {
      if (!profileUid) return;
      const ref = doc(db, "users", profileUid);
      const prev = Array.isArray(userData?.demos) ? userData.demos : [];
      const demos = prev.filter((x) => (x.id || x.url) !== idOrUrl);
      await updateDoc(ref, { demos });
      setUserData((p) => ({ ...p, demos }));
    },
    [profileUid, userData]
  );

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate("/login");
  }, [navigate]);

  // Username: dacă nu e ales tipul → editează `name`; dacă e Artist → `stageName`; dacă e Locație → `locationName`
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

  // Progres: 0 dacă nu e ales tipul
  const progress = useMemo(() => {
    if (!userData) return 0;
    if (!isTypeChosen) return 0;
    const fields = isArtist
      ? ["stageName", "realName", "bio", "genres", "rate", "instagram", "photoURL", "demos"]
      : ["locationName", "address", "locationType", "capacity", "equipment", "acceptedGenres", "googleMaps", "schedule", "photoURL", "instagram"];
    const filled = fields.filter((f) =>
      Array.isArray(userData[f]) ? userData[f].length > 0 : !!userData[f]
    );
    return Math.round((filled.length / fields.length) * 100);
  }, [userData, isTypeChosen, isArtist]);

  const imageSrc =
    userData?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`;

  const normalizedRate = normalizeRate(userData?.rate);
  const isFree = normalizedRate === "gratis";
  const rateClass = isFree ? "text-green-600 font-bold uppercase text-xl" : "text-red-600 font-bold text-xl";

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
      {/* ===== Limităm viewer-ul din dialog să nu întindă poza pe tot ecranul ===== */}
      <style>{`
        .fixed.inset-0, [role="dialog"] { place-items: center; }
        [role="dialog"] .aspect-square,
        [role="dialog"] .aspect-video,
        [role="dialog"] [style*="aspect-ratio"] { aspect-ratio: auto !important; }
        [role="dialog"] img {
          display: block;
          width: auto !important;
          height: auto !important;
          max-width: 92vw !important;
          max-height: 86vh !important;
          object-fit: contain !important;
          border-radius: 12px;
        }
      `}</style>

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8 text-black">
        {isOwnProfile && (
          <div
            className={`mb-4 text-sm font-medium rounded px-4 py-2 ${
              progress < 100 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
            }`}
          >
            {!isTypeChosen
              ? "⚠️ Selectează tipul de cont (Artist sau Locație) când ești gata. Până atunci, poți edita câmpurile generale."
              : progress < 100
              ? `⚠️ Completează toate câmpurile. Progres: ${progress}%`
              : "✅ Profil complet!"}
          </div>
        )}

        <div className="md:flex gap-10">
          {/* Stânga */}
          <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
            <div className="relative w-[128px] h-[128px] rounded-full overflow-visible">
              <ProfileAvatarWithProgress
                imageSrc={imageSrc}
                progress={progress}
                canEdit={isOwnProfile}
                fileInputRef={fileInputRef}
                handleAvatarChange={handleAvatarChange}
              />
            </div>

            <EditableField
              value={username}
              placeholder="Nume profil"
              canEdit={isOwnProfile}
              onSave={handleUsernameSave}
              inputClassName="text-2xl font-bold"
            />

            <EditableField
              value={userData.realName || "Anonim"}
              placeholder="Nume real"
              canEdit={isOwnProfile}
              onSave={(val) => openConfirmModal({ field: "realName", value: val })}
              inputClassName="text-sm text-gray-500 mb-3"
            />

            {/* Switcher tip cont – niciun buton nu e activ până nu alegi */}
            <AccountTypeSwitcher
              value={userData?.type}
              onConfirm={openConfirmModal}
              disabled={!isOwnProfile}
              className="w-full"
            />

            {/* Summary rating din colaborări – doar după alegerea tipului */}
            {isTypeChosen && (
              <ReviewsSummaryFromCollabs
                profileUid={profileUid}
                side={isArtist ? "artist" : "location"}
              />
            )}

            <div className="mt-6 space-y-2 text-sm w-full">
              {/* Tarif – doar pentru artiști */}
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

              {/* Disponibilitate – doar după alegerea tipului */}
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
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="w-full mt-6"
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Deconectare
              </Button>
            )}
          </div>

          {/* Dreapta */}
          <div className="w-full md:w-2/3 space-y-8">
            {/* Despre – comun */}
            <section>
              <SectionTitle>Despre</SectionTitle>
              <EditableBio
                value={userData.bio || ""}
                canEdit={isOwnProfile}
                onSave={(val) => openConfirmModal({ field: "bio", value: val })}
                maxLength={1000}
                minLength={0}
              />
            </section>

            {/* Secțiuni specifice tipului */}
            {isArtist && (
              <>
                <EditableSpecializations
                  value={Array.isArray(userData.specializations) ? userData.specializations : []}
                  canEdit={isOwnProfile}
                  onSave={(arr) => openConfirmModal({ field: "specializations", value: arr })}
                />

                <EditableGenres
                  value={Array.isArray(userData.genres) ? userData.genres : []}
                  canEdit={isOwnProfile}
                  onSave={(genres) => openConfirmModal({ field: "genres", value: genres })}
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
                  <DemosUploader
                    canEdit={isOwnProfile}
                    authUser={authUser}
                    current={Array.isArray(userData.demos) ? userData.demos : []}
                    onAdded={addDemos}
                    onDeleted={deleteDemo}
                  />
                </section>
              </>
            )}

            {isLocation && (
              <>
                <EditableGenres
                  value={Array.isArray(userData.acceptedGenres) ? userData.acceptedGenres : []}
                  canEdit={isOwnProfile}
                  onSave={(genres) => openConfirmModal({ field: "acceptedGenres", value: genres })}
                />

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

            {/* Galerie media – comun */}
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

            {/* Social – comun */}
            <SocialSection
              user={userData}
              canEdit={isOwnProfile}
              onConfirm={openConfirmModal}
            />
          </div>
        </div>
      </div>

      {/* Modal confirmare */}
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
    </div>
  );
}
