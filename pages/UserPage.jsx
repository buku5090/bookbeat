import { useEffect, useState, useRef } from "react";
import { auth } from "../src/firebase";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../src/firebase";
import { Pencil } from "lucide-react"; // folosește lucide-react pentru icon

export default function UserPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      setUser({ ...auth.currentUser }); // Refresh UI cu noul avatar
    } catch (err) {
      console.error("Eroare la încărcarea avatarului:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 px-4">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md text-center">
        {/* 🔵 Avatar cu iconiță */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div>
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || "User"}`}
              alt="User avatar"
              className="w-24 h-24 rounded-full object-cover border border-gray-300"
            />
          <button
            className="w-10 !rounded-full !p-0 absolute bottom-0 right-0 h-10 !bg-white shadow flex items-center justify-center"
            onClick={() => fileInputRef.current.click()}
          >
            <Pencil size={12} className="text-blue-600" />
          </button>
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            ref={fileInputRef}
            className="hidden"
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {user.displayName || "Utilizator"}
        </h2>
        <p className="text-gray-600 mb-4">{user.email}</p>

        <div className="space-y-2">
          <button
            onClick={() => navigate("/create")}
            className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition"
          >
            ➕ Creează anunț
          </button>
          <button
            onClick={() => navigate("/userannoucements")}
            className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition"
          >
            📃 Anunțurile mele
          </button>
          <button
            onClick={handleLogout}
            className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition"
          >
            🚪 Deconectare
          </button>
        </div>
      </div>
    </div>
  );
}
