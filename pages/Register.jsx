import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../src/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Salvează numele în profilul Firebase
      await updateProfile(user, {
        displayName: fullName,
      });

      // Salvează și în Firestore (colecția "users")
      await setDoc(doc(db, "users", user.uid), {
        email,
        fullName,
        createdAt: new Date(),
      });

      alert("✅ Cont creat cu succes!");
      navigate("/profil");
    } catch (err) {
      alert("❌ Eroare: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Creează-ți un cont
        </h2>

        <div className="space-y-4">
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder="Nume complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder="Parolă"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-violet-600 text-black font-semibold py-3 rounded-lg hover:bg-violet-700 transition"
          >
            {loading ? "Se creează contul..." : "🔐 Creează cont"}
          </button>
        </div>
      </div>
    </div>
  );
}
