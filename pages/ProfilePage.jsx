import { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "../src/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Pencil } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fileInputRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      setAuthUser(firebaseUser);

      const userRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }

      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !authUser) return;

    const storageRef = ref(storage, `avatars/${authUser.uid}/${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(db, "users", authUser.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      setUserData((prev) => ({ ...prev, photoURL: downloadURL }));
    } catch (err) {
      console.error("Eroare la încărcarea avatarului:", err);
    }
  };

  const getProgress = () => {
    if (!userData) return 0;

    const requiredFields =
      userData.type === "artist"
        ? ["stageName", "realName", "myWork", "wherePlayed", "genres", "rate", "bio", "availability"]
        : ["locationName", "address", "locationType", "capacity", "equipment", "acceptedGenres", "googleMaps", "schedule"];

    const filled = requiredFields.filter((field) => {
      const value = userData[field];
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    });

    return Math.round((filled.length / requiredFields.length) * 100);
  };

  const progress = getProgress();
  const isComplete = progress === 100;
  const isArtist = userData?.type === "artist";
  const imageSrc = userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.name || "User"}`;

  if (loading || !authUser || !userData) return null;

  return (
    <div className="min-h-screen bg-black p-6 text-black mt-20">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-8 md:flex gap-10">
        {/* Stânga */}
        <div className="w-full md:w-1/4 flex flex-col items-center md:items-start">
          <div className="relative w-32 h-32 mb-4">
            <img src={imageSrc} alt="avatar" className="w-32 h-32 rounded-full border object-cover" />
            <button
              className="w-10 h-10 !rounded-full !bg-white !text-blue-600 shadow !absolute bottom-0 right-0 flex items-center justify-center border border-gray-300"
              onClick={() => fileInputRef.current.click()}
            >
              <Pencil size={14} className="overflow-visible" />
            </button>

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
          <h2 className="text-xl font-bold text-center md:text-left">{userData.stageName || userData.locationName || userData.name || "Utilizator"}</h2>
          {userData.showRealName && userData.realName ? (
              <p className="text-sm text-gray-600 text-center md:text-left">{userData.realName}</p>
            ) : (
              <p className="text-sm text-gray-600 text-center md:text-left">Anonim</p>
            )}


          <div className="mt-6 space-y-2 text-sm text-gray-800 w-full">
            {userData.instagram && <p><strong>Instagram:</strong> {userData.instagram}</p>}
            {isArtist && userData.availability && <p><strong>Disponibilitate:</strong> {userData.availability}</p>}
            {!isArtist && userData.address && <p><strong>Adresă:</strong> {userData.address}</p>}
            {!isArtist && userData.capacity && <p><strong>Capacitate:</strong> {userData.capacity} persoane</p>}

            <div className="mt-6">
              <p className="text-sm text-gray-500">
                {isComplete ? "✅ Profil complet!" : `Completare profil: ${progress}%`}
              </p>
              <Link to="/complete-profile">
                <button className="bg-black text-purple-500 w-full py-3 rounded-lg mt-2">
                  {isComplete ? "✏️ Editează profilul" : "✍️ Completează profilul"}
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full bg-black text-white py-3 mt-4 rounded-lg hover:bg-gray-800 transition"
              >
                🚪 Deconectare
              </button>
            </div>
          </div>
        </div>

        {/* Dreapta */}
        <div className="w-full md:w-2/3 space-y-6">
          <div>
            <h3 className="text-2xl font-semibold mb-2">Despre</h3>
            {userData.bio ? (
              <p className="text-gray-700 leading-relaxed">{userData.bio}</p>
            ) : (
              <p className="text-gray-400 italic">Acest utilizator nu a adăugat o descriere.</p>
            )}
          </div>

          {isArtist && (
            <>
              {userData.genres?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Genuri muzicale</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {userData.genres.map((g) => (
                      <span key={g} className="px-2 py-1 bg-pink-200 text-pink-800 rounded-full text-sm">{g}</span>
                    ))}
                  </div>
                </div>
              )}
              {userData.rate && <p><strong>Tarif:</strong> {userData.rate}</p>}
              {userData.wherePlayed && <p><strong>Unde a pus muzică:</strong> {userData.wherePlayed}</p>}
              {userData.myWork && <p><strong>Lucrări:</strong> {userData.myWork}</p>}
            </>
          )}

          {!isArtist && (
            <>
              {userData.locationType && <p><strong>Tip locație:</strong> {userData.locationType}</p>}
              {userData.equipment && <p><strong>Echipament:</strong> {userData.equipment}</p>}
              {userData.schedule && <p><strong>Program:</strong> {userData.schedule}</p>}
              {userData.acceptedGenres && <p><strong>Genuri acceptate:</strong> {userData.acceptedGenres}</p>}
              {userData.googleMaps && (
                <p>
                  <strong>Google Maps:</strong>{" "}
                  <a href={userData.googleMaps} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Vezi locația
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
