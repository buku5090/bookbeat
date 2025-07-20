import { useEffect, useState } from "react";
import { auth } from "../src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function UserPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center mt-20">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-md text-center">
        <img
          src={user.photoURL || "https://ui-avatars.com/api/?name=" + user.displayName}
          alt="User avatar"
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {user.displayName || "Utilizator"}
        </h2>
        <p className="text-gray-600 mb-4">{user.email}</p>

        <div className="space-y-2">
          <button
            onClick={() => navigate("/create")}
            className="w-full bg-violet-600 text-black py-2 rounded-lg hover:bg-violet-700 transition"
          >
            ➕ Creează anunț
          </button>
          <button
            onClick={() => navigate("/my-announcements")}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            📃 Anunțurile mele
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-black py-2 rounded-lg hover:bg-red-600 transition"
          >
            🚪 Deconectare
          </button>
        </div>
      </div>
    </div>
  );
}
