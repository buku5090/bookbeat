import { useEffect, useState, useRef } from "react";
import { auth, db } from "../src/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import ProfileAvatarWithProgress from "../components/ProfilePhotoWithAvatar";
import { EditableField } from "../components/EditableField";
import EditableGenres from "../components/EditableGenres";
import FakeRating from "../components/FakeRating";
import Dialog from "../components/Dialog"; // Îți dau imediat acest fișier simplu


export default function ProfilePage() {
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return navigate("/login");

      setAuthUser(firebaseUser);
      const userRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) setUserData(docSnap.data());

      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  const openConfirmModal = ({ field, value }) => {
    setPendingUpdate({ field, value });
    setModalOpen(true);
  };

  const confirmSave = async () => {
    if (!authUser || !pendingUpdate) return;

    const userRef = doc(db, "users", authUser.uid);
    await updateDoc(userRef, {
      [pendingUpdate.field]: pendingUpdate.value,
    });

    setUserData((prev) => ({ ...prev, [pendingUpdate.field]: pendingUpdate.value }));
    setPendingUpdate(null);
    setModalOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const getProgress = () => {
    if (!userData) return 0;

    const fields = userData.type === "artist"
      ? ["stageName", "realName", "myWork", "wherePlayed", "genres", "rate", "bio"]
      : ["locationName", "address", "locationType", "capacity", "equipment", "acceptedGenres", "googleMaps", "schedule"];

    const filled = fields.filter((f) =>
      Array.isArray(userData[f]) ? userData[f].length > 0 : !!userData[f]
    );

    return Math.round((filled.length / fields.length) * 100);
  };

  const progress = getProgress();
  const isArtist = userData?.type === "artist";
  const username = (userData?.stageName || userData?.locationName || userData?.name || "Utilizator").trim();
  const imageSrc = userData?.photoURL || `https://ui-avatars.com/api/?name=${username}`;

  if (loading || !authUser || !userData) return null;

  return (
    <div className="min-h-screen bg-black text-black p-6 mt-20">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className={`mb-4 text-sm font-medium rounded px-4 py-2 ${progress < 100 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
          {progress < 100
            ? `⚠️ Completează toate câmpurile. Progres: ${progress}%`
            : "✅ Profil complet!"}
        </div>

        <div className="md:flex gap-10">
          {/* Stânga */}
          <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
            <ProfileAvatarWithProgress
              imageSrc={imageSrc}
              progress={progress}
              fileInputRef={fileInputRef}
              handleAvatarChange={(e) => openConfirmModal({ field: "photoURL", value: e })}
            />

            <EditableField
              value={username}
              placeholder="Username"
              canEdit
              onSave={(val) => openConfirmModal({ field: isArtist ? "stageName" : "locationName", value: val })}
              inputClassName="text-2xl font-bold"
            />


            <EditableField
              value={userData.realName || "Anonim"}
              placeholder="Nume real"
              canEdit
              onSave={(val) => openConfirmModal({ field: "realName", value: val })}
              inputClassName="text-sm text-gray-500"
            />

            <FakeRating value={4.6} />

            <div className="mt-6 space-y-2 text-sm w-full">
              <EditableField
                label="Tarif"
                value={userData.rate}
                isPrice
                canEdit
                onSave={(val) => openConfirmModal({ field: "rate", value: val })}
              />

              {isArtist && (
                <div>
                  <p className="font-semibold">Disponibilitate</p>
                  <p className="text-sm text-gray-500 italic">Calendar (în lucru)</p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-black text-white py-3 mt-6 rounded-lg hover:bg-gray-800 transition"
            >
              🚪 Deconectare
            </button>
          </div>

          {/* Dreapta */}
          <div className="w-full md:w-2/3 space-y-6">
            <section>
              <h3 className="text-2xl font-semibold mb-2">Despre</h3>
              <EditableField
                value={userData.bio || ""}
                multiline
                placeholder="Scrie câteva rânduri despre tine..."
                canEdit
                onSave={(val) => openConfirmModal({ field: "bio", value: val })}
              />
            </section>

            {isArtist && (
              <>
                <EditableGenres
                  value={userData.genres || []}
                  canEdit
                  onSave={(genres) => openConfirmModal({ field: "genres", value: genres })}
                />

                <EditableField
                  label="Unde a pus muzică"
                  value={userData.wherePlayed || ""}
                  canEdit
                  onSave={(val) => openConfirmModal({ field: "wherePlayed", value: val })}
                />

                <EditableField
                  label="Lucrări"
                  value={userData.myWork || ""}
                  canEdit
                  onSave={(val) => openConfirmModal({ field: "myWork", value: val })}
                />
              </>
            )}

            <section>
              <h3 className="text-2xl font-semibold mb-2">Social</h3>
              <EditableField
                value={userData.instagram || ""}
                placeholder="@instagram"
                canEdit
                onSave={(val) => openConfirmModal({ field: "instagram", value: val })}
                isLink
                linkPrefix="https://instagram.com/"
              />
            </section>
          </div>
        </div>
      </div>

      {/* Modal confirmare */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmSave}
      />

    </div>
  );
}
