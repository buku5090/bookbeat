// pages/ProfilePage.jsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { auth, db, storage } from "../src/firebase";
import { doc, deleteDoc, updateDoc, onSnapshot as onDocSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import LoadingPage from "./LoadingPage";
import KYCDialog from "../components/profilepage/KYCDialog";
import cities from "../src/data/cities";

/* —— componente noi —— */
import ProgressBanner from "../components/profilepage/ProgressBanner";
import LeftPanel from "../components/profilepage/LeftPanel";
import RightPanel from "../components/profilepage/RightPanel";

const LOCATION_TYPES = [
  "Bar","Pub","Cafenea","Restaurant","Club","Terasa","Hotel","Lounge",
  "Teatru","Sală evenimente","Beach bar","Beer garden","Altele",
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const fileInputRef = useRef();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycOpen, setKycOpen] = useState(false);

  const isOwnProfile = useMemo(() => !id || (authUser && authUser.uid === id), [id, authUser]);
  const profileUid   = useMemo(() => id || authUser?.uid, [id, authUser]);

  const isArtist  = userData?.type === "artist";
  const isLocation= userData?.type === "location";
  const isTypeChosen = isArtist || isLocation;

  /* ---------------- Auth + live profile ---------------- */
  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!alive) return;
      setAuthUser(fbUser);

      const uidToLoad = id || fbUser?.uid;
      if (!uidToLoad) {
        navigate("/login");
        if (alive) setLoading(false);
        return;
      }
      const ref = doc(db, "users", uidToLoad);
      const stopDoc = onDocSnapshot(ref, (snap) => {
        if (!alive) return;
        setUserData(snap.exists() ? snap.data() : null);
        setLoading(false);
      });
      return () => stopDoc();
    });
    return () => { alive = false; unsub(); };
  }, [id, navigate]);

  /* ---------------- save/update helpers ---------------- */
  const applyUpdate = useCallback(
    async ({ field, value }) => {
      if (!authUser) return;
      const userRef = doc(db, "users", authUser.uid);

      // delete
      if (field === "deleteAccount") {
        const ok = window.confirm(t("profile.confirmDelete"));
        if (!ok) return;

        try { await deleteDoc(userRef); } catch {}
        try { await deleteUser(authUser); }
        catch (e) {
          if (e?.code === "auth/requires-recent-login") {
            await signOut(auth);
            navigate("/login");
            return;
          }
        }
        await signOut(auth);
        setUserData(null);
        navigate("/");
        return;
      }

      // toggle type
      if (field === "type") {
        const currentType = userData?.type ?? "user";
        const clickedType = value;
        value = currentType === clickedType ? "user" : clickedType;
      }

      try {
        await updateDoc(userRef, { [field]: value });
        setUserData((p) => ({ ...p, [field]: value }));
      } catch (err) {
        console.error("save error:", err);
      }
    },
    [authUser, navigate, userData, t]
  );

  /* ---------------- Avatar upload ---------------- */
  const uploadAvatarAndGetUrl = useCallback(
    async (file) => {
      if (!authUser || !file)
        throw new Error(t("profile.notAuthenticated"));

      if (!file.type.startsWith("image/"))
        throw new Error(t("profile.invalidImage"));

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 5)
        throw new Error(t("profile.imageTooLarge"));

      const ext = file.name.split(".").pop() || "jpg";
      const path = `users/${authUser.uid}/avatar.${ext}`;

      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      return getDownloadURL(ref);
    },
    [authUser, t]
  );

  const handleAvatarChange = useCallback(
    async (payload) => {
      try {
        let url = null;
        if (typeof payload === "string" && payload.startsWith("http")) url = payload;
        else if (payload?.target?.files?.[0]) url = await uploadAvatarAndGetUrl(payload.target.files[0]);
        else if (payload instanceof File) url = await uploadAvatarAndGetUrl(payload);

        if (url) await applyUpdate({ field: "photoURL", value: url });
      } catch (err) {
        console.error(err);
      }
    },
    [uploadAvatarAndGetUrl, applyUpdate]
  );

  /* ---------------- Demos ---------------- */
  const addDemos = useCallback(
    async (items) => {
      if (!profileUid || !items?.length) return;

      const ref = doc(db, "users", profileUid);
      const prev = Array.isArray(userData?.demos) ? userData.demos : [];

      const incoming = items
        .map((x) => (typeof x === "string" ? { url: x } : x))
        .map((x) => ({ url: String(x.url).trim() }))
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

  /* ---------------- Derived UI ---------------- */
  const username = useMemo(() => {
    if (isArtist) return userData?.stageName || userData?.name || t("profile.user");
    if (isLocation) return userData?.locationName || userData?.name || t("profile.user");
    return userData?.name || t("profile.user");
  }, [isArtist, isLocation, userData, t]);

  const isNewAccount = useMemo(() => {
    try {
      const THREE_DAYS = 3 * 24 * 3600 * 1000;

      let createdAtMs = null;
      if (userData?.createdAt?.toMillis) createdAtMs = userData.createdAt.toMillis();
      if (!createdAtMs && authUser?.metadata?.creationTime)
        createdAtMs = Date.parse(authUser.metadata.creationTime);

      if (!createdAtMs) return false;
      return Date.now() - createdAtMs <= THREE_DAYS;
    } catch {
      return false;
    }
  }, [userData?.createdAt, authUser]);

  const progress = useMemo(() => {
    if (!userData) return { percent: 0, missing: [] };
    if (!isTypeChosen) return { percent: 0, missing: [] };

    const fields = isArtist
      ? [
          { key: "bio", label: t("profile.missing.bio") },
          { key: "genres", label: t("profile.missing.genres") },
          { key: "djEquipment", label: t("profile.missing.equipment") },
          { key: "rate", label: t("profile.missing.rate") },
          { key: "photoURL", label: t("profile.missing.photo") },
          { key: "demos", label: t("profile.missing.demos") },
          { key: "city", label: t("profile.missing.city") },
        ]
      : [
          { key: "locationName", label: t("profile.missing.locationName") },
          { key: "capacity", label: t("profile.missing.capacity") },
          { key: "djEquipment", label: t("profile.missing.equipment") },
          { key: "photoURL", label: t("profile.missing.locationPhoto") },
          { key: "address", label: t("profile.missing.address") },
          { key: "budget", label: t("profile.missing.budget") },
          { key: "city", label: t("profile.missing.city") },
          { key: "locationType", label: t("profile.missing.locationType") },
        ];

    const filled = fields.filter((f) => {
      const val = userData[f.key];
      return Array.isArray(val) ? val.length > 0 : !!val;
    });

    const missing = fields.filter((f) => !filled.some((x) => x.key === f.key)).map((f) => f.label);
    const percent = Math.round((filled.length / fields.length) * 100);

    return { percent, missing };
  }, [userData, isTypeChosen, isArtist, t]);

  const imageSrc =
    userData?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`;

  const verificationStatus = userData?.verificationStatus || "unverified";
  const canRequestVerification = progress.percent === 100 && verificationStatus !== "verified";

  /* ---------------- Render ---------------- */
  if (loading) return <LoadingPage />;

  if (!userData) {
    return (
      <div className="min-h-screen bg-black text-white md:p-6">
        <div className="max-w-3xl mx-auto text-center">
          <p>{t("profile.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 text-black">

        {isOwnProfile && (
          <ProgressBanner
            isTypeChosen={isTypeChosen}
            percent={progress.percent}
            missing={progress.missing}
          />
        )}

        <div className="md:flex gap-10">
          <LeftPanel
            isOwnProfile={isOwnProfile}
            isArtist={isArtist}
            isLocation={isLocation}
            isNewAccount={isNewAccount}
            authUser={authUser}
            userData={userData}
            username={username}
            imageSrc={imageSrc}
            fileInputRef={fileInputRef}
            handleAvatarChange={handleAvatarChange}
            applyUpdate={applyUpdate}
            progressPercent={progress.percent}
            verificationStatus={verificationStatus}
            canRequestVerification={canRequestVerification}
            onOpenKYC={() => setKycOpen(true)}
            onLogout={handleLogout}
            cities={cities}
            locationTypes={LOCATION_TYPES}
          />

          <RightPanel
            isOwnProfile={isOwnProfile}
            isArtist={isArtist}
            isLocation={isLocation}
            authUser={authUser}
            profileUid={profileUid}
            userData={userData}
            applyUpdate={applyUpdate}
            addDemos={addDemos}
            deleteDemo={deleteDemo}
            onGalleryChange={(next) => {
              setUserData((u) => ({ ...u, gallery: next }));
              if (!profileUid) return;
              updateDoc(doc(db, "users", profileUid), { gallery: next }).catch(console.error);
            }}
          />
        </div>
      </div>

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
