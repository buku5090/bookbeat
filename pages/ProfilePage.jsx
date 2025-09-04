// pages/ProfilePage.jsx
import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { auth, db, storage } from "../src/firebase";
import {
  doc, getDoc, updateDoc, collection, addDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";

import ProfileAvatarWithProgress from "../components/ProfilePhotoWithAvatar";
import { EditableField } from "../components/EditableField";
import EditableGenres from "../components/EditableGenres";
import SocialSection from "../components/SocialSection";
import MediaGalleryGrid from "../components/MediaGalleryGrid";


import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../src/components/ui/dialog";

import {
  Instagram, Youtube, Music2, Facebook, Link as LinkIcon,
  Star, Trash2, Maximize2, ChevronLeft, ChevronRight, Pencil, LogOut,
} from "lucide-react";

import LoadingPage from "./LoadingPage";
import EditableSpecializations from "../components/EditableSpecializations";
import EditableBio from "../components/EditableBio"
import Button from "../components/Button"; // <— asigură-te că acesta e path-ul corect
import CollaborationsCarousel from "../components/CollaborationsCarousel";
import SectionTitle from "../components/SectionTitle"

/* ============================== REVIEWS HOOK ============================== */
function useReviews(profileUid) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    if (!profileUid) return;
    const q = query(collection(db, "users", profileUid, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [profileUid]);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return Math.round(
      (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) * 10
    ) / 10;
  }, [reviews]);

  return { reviews, avg };
}

/* ============================== DEMOS (AUDIO) ============================== */
function DemosUploader({ canEdit, authUser, current = [], onAdded, onDeleted }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const inputRef = useRef(null);

  const list = Array.isArray(current) ? current : [];
  const remaining = Math.max(0, 3 - list.length);
  const openPicker = () => canEdit && remaining > 0 && inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!authUser || files.length === 0) return;
    const take = files.slice(0, remaining);
    setUploading(true);
    const results = [];
    for (const f of take) {
      if (!f.type.startsWith("audio/")) continue;
      const safeName = f.name.replace(/\s+/g, "-");
      const path = `users/${authUser.uid}/demos/${Date.now()}-${safeName}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, f);
      const url = await getDownloadURL(ref);
      results.push({ id: path, url, title: f.name });
    }
    setUploading(false);
    onAdded?.(results);
    e.target.value = "";
  };

  const deleteOne = async (item) => {
    try {
      setDeleting(item.id || item.url);
      if (item.id) await deleteObject(storageRef(storage, item.id));
      onDeleted?.(item.id || item.url);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id || d.url} className="bg-gray-50 rounded-lg p-3 border flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1 truncate">{d.title || d.url}</p>
              <audio controls className="w-full">
                <source src={d.url} />
              </audio>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteOne(d)}
                disabled={deleting === (d.id || d.url)}
                title="Șterge"
              >
                <Trash2 className="w-5 h-5 text-gray-700" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3">
          <input ref={inputRef} type="file" accept="audio/*" multiple hidden onChange={handleFiles} />
          <Button onClick={openPicker} disabled={uploading || remaining === 0} variant="primary">
            {uploading ? "Se încarcă…" : remaining === 0 ? "Limită atinsă (3)" : "+ Adaugă demo-uri"}
          </Button>
          <p className="text-xs text-gray-500 mt-1">Max 3 fișiere audio. Se salvează automat după upload.</p>
        </div>
      )}
    </div>
  );
}

/* ============================== REVIEWS ============================== */
function ReviewsSummary({ profileUid }) {
  const { reviews, avg } = useReviews(profileUid);
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`w-5 h-5 ${i <= Math.round(avg) ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-400"}`} />
          ))}
        </div>
        <span className="text-sm text-gray-600">{avg ? `${avg} / 5` : "Fără rating încă"} ({reviews.length})</span>
      </div>
    </div>
  );
}

function ReviewsSection({ profileUid, authUser }) {
  const navigate = useNavigate();
  const { reviews, avg } = useReviews(profileUid);
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!authUser) return navigate("/login");
    if (!myRating) return;
    setSending(true);
    await addDoc(collection(db, "users", profileUid, "reviews"), {
      uid: authUser.uid,
      rating: myRating,
      comment: comment?.slice(0, 400) || "",
      createdAt: serverTimestamp(),
    });
    setMyRating(0);
    setComment("");
    setSending(false);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`w-5 h-5 ${i <= Math.round(avg) ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-400"}`} />
          ))}
        </div>
        <span className="text-sm text-gray-600">{avg ? `${avg} / 5` : "Fără rating încă"} ({reviews.length})</span>
      </div>

      <div className="mt-3">
        {authUser ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setMyRating(i)} aria-label={`${i} stele`}>
                  <Star className={`w-7 h-7 ${i <= myRating ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-400"}`} />
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded p-2 resize-none"
              rows={2}
              maxLength={400}
              placeholder="Lasă un comentariu (opțional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button variant="primary" onClick={submit} disabled={sending || !myRating}>
              Trimite review
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => navigate("/login")}>
            Loghează-te pentru a lăsa un review
          </Button>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mt-3 space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="border rounded p-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${i <= (r.rating || 0) ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-300"}`} />
                  ))}
                </div>
                <span>{r.rating}/5</span>
              </div>
              {r.comment && <p className="text-sm mt-1 whitespace-pre-wrap break-words">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    return () => { alive = false; unsub(); };
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

  const handleAvatarChange = useCallback(async (payload) => {
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
  }, [uploadAvatarAndGetUrl]);

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

  const addDemos = useCallback(async (newItems) => {
    if (!profileUid || !newItems?.length) return;
    const ref = doc(db, "users", profileUid);
    const prev = Array.isArray(userData?.demos) ? userData.demos : [];
    const demos = [...prev, ...newItems].slice(0, 3);
    await updateDoc(ref, { demos });
    setUserData((p) => ({ ...p, demos }));
  }, [profileUid, userData]);

  const deleteDemo = useCallback(async (idOrUrl) => {
    if (!profileUid) return;
    const ref = doc(db, "users", profileUid);
    const prev = Array.isArray(userData?.demos) ? userData.demos : [];
    const demos = prev.filter((x) => (x.id || x.url) !== idOrUrl);
    await updateDoc(ref, { demos });
    setUserData((p) => ({ ...p, demos }));
  }, [profileUid, userData]);

  const addGallery = useCallback(async (newItems) => {
    if (!profileUid || !newItems?.length) return;
    const ref = doc(db, "users", profileUid);
    const prev = Array.isArray(userData?.gallery) ? userData.gallery : [];
    const gallery = [...prev, ...newItems];
    await updateDoc(ref, { gallery });
    setUserData((p) => ({ ...p, gallery }));
  }, [profileUid, userData]);

  const deleteMedia = useCallback(async (idOrUrl) => {
    if (!profileUid) return;
    const ref = doc(db, "users", profileUid);
    const prev = Array.isArray(userData?.gallery) ? userData.gallery : [];
    const gallery = prev.filter((x) => (x.id || x.url) !== idOrUrl);
    await updateDoc(ref, { gallery });
    setUserData((p) => ({ ...p, gallery }));
  }, [profileUid, userData]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate("/login");
  }, [navigate]);

  const progress = useMemo(() => {
    if (!userData) return 0;
    const isArtist = userData?.type === "artist";
    const fields = isArtist
      ? ["stageName", "realName", "bio", "genres", "rate", "instagram", "photoURL", "demos"]
      : ["locationName", "address", "locationType", "capacity", "equipment", "acceptedGenres", "googleMaps", "schedule", "photoURL", "instagram"];
    const filled = fields.filter((f) => Array.isArray(userData[f]) ? userData[f].length > 0 : !!userData[f]);
    return Math.round((filled.length / fields.length) * 100);
  }, [userData]);

  const isArtist = userData?.type === "artist";
  const usernameRaw = userData?.stageName || userData?.locationName || userData?.name || "Utilizator";
  const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "Utilizator";
  const imageSrc = userData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`;

  const normalizedRate = normalizeRate(userData?.rate);
  const isFree = normalizedRate === "gratis";
  const rateClass = isFree ? "text-green-600 font-bold uppercase text-xl" : "text-red-600 font-bold text-xl";

  if (loading) return <LoadingPage />;

  if (!userData) {
    return (
      <div className="min-h-screen bg-black text-white md:p-6">
        <div className="max-w-3xl mx-auto text-center"><p>Profilul nu a fost găsit.</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8 text-black">
        {typeof progress === "number" && isOwnProfile && (
          <div className={`mb-4 text-sm font-medium rounded px-4 py-2 ${progress < 100 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
            {progress < 100 ? `⚠️ Completează toate câmpurile. Progres: ${progress}%` : "✅ Profil complet!"}
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
              placeholder="Username"
              canEdit={isOwnProfile}
              onSave={(val) => openConfirmModal({ field: isArtist ? "stageName" : "locationName", value: val })}
              inputClassName="text-2xl font-bold"
            />

            <EditableField
              value={userData.realName || "Anonim"}
              placeholder="Nume real"
              canEdit={isOwnProfile}
              onSave={(val) => openConfirmModal({ field: "realName", value: val })}
              inputClassName="text-sm text-gray-500 mb-3"
            />

            <ReviewsSummary profileUid={profileUid} />

            <div className="mt-6 space-y-2 text-sm w-full">
              <EditableField
                label="Tarif"
                value={normalizedRate}
                isPrice
                canEdit={isOwnProfile}
                onSave={(val) => openConfirmModal({ field: "rate", value: normalizeRate(val) })}
                inputClassName={rateClass}
              />
              {isArtist && (
                <div>
                  <p className="font-semibold">Disponibilitate</p>
                  <p className="text-sm text-gray-500 italic">Calendar (în lucru)</p>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <Button variant="secondary" onClick={handleLogout} className="w-full mt-6" leftIcon={<LogOut className="w-4 h-4" />}>
                Deconectare
              </Button>
            )}
          </div>

          {/* Dreapta */}
          <div className="w-full md:w-2/3 space-y-8">
            {/* Despre */}
            <section>
              <SectionTitle>Despre</SectionTitle>
              <EditableBio
                value={userData.bio || ""}
                canEdit={isOwnProfile}
                onSave={(val) => openConfirmModal({ field: "bio", value: val })}
                maxLength={1000}
                minLength={300}
              />
            </section>

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
                  <SectionTitle>Colaborări (cu locații BookMix)</SectionTitle>
                  <CollaborationsCarousel
                    title={null} // deja ai heading mai sus; sau setează direct titlul aici și scoate <h4>
                    items={Array.isArray(userData.collaborations) ? userData.collaborations : []}
                    // dacă vrei să NU apară locațiile demo când e gol:
                    // useDemoWhenEmpty={false}
                  />
                </section>


                {/* Demo-uri */}
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

                {/* Galerie media */}
                <section>
                  <SectionTitle>Galerie media</SectionTitle>
                  <MediaGalleryGrid
                    canEdit={isOwnProfile}
                    authUser={authUser}
                    items={userData.gallery}         // opțional; poate fi string[] sau [{id,url}]
                    title="Galerie media"
                    max={5}                          // limita (implicit 5)
                    addButtonMode="hide"             // sau "disable"
                    onChange={(items) => setUserData(u => ({ ...u, gallery: items }))} // opțional
                    onExceedMax={(m) => console.log(`Limita de ${m} imagini atinsă`)}   // opțional
                  />
                </section>

                {/* Reviews complete sub galerie */}
                <section id="reviews" className="pt-2">
                  <SectionTitle>Recenzii</SectionTitle>
                  <ReviewsSection profileUid={profileUid} authUser={authUser} />
                </section>
              </>
            )}

            {/* Social */}
            <SocialSection
              user={userData}
              canEdit={isOwnProfile}
              onConfirm={openConfirmModal}
            // normalizeInstagramHandle={normalizeInstagramHandle} // dacă vrei s-o folosești pe a ta
            />
          </div>
        </div>
      </div>

      {/* Modal confirmare */}
      {isOwnProfile && (
        <Dialog
          open={modalOpen}
          onOpenChange={(open) => { if (!saving) setModalOpen(open); }}
        >
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
