import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../src/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("🟢 Ești deja logat ca:", user);
        navigate("/profil");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loginWithEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/profil");
    } catch (err) {
      alert("❌ Eroare: " + err.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log("✅ Google login cu popup a mers");
      navigate("/profil");
    } catch (error) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
        console.warn("⚠️ Popup blocat sau închis — trecem pe redirect...");
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
      } else {
        alert("❌ Google login error: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Autentificare în BookBeat
        </h2>

        <div className="space-y-4">
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
            onClick={loginWithEmail}
            className="w-full bg-violet-600 text-black font-semibold py-3 rounded-lg hover:bg-violet-700 transition"
          >
            🔐 Login cu Email
          </button>
          <div className="text-center text-gray-500 text-sm">sau</div>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-red-500 text-black font-semibold py-3 rounded-lg hover:bg-red-600 transition"
          >
            🔓 Login cu Google
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center mt-4">
          Nu ai cont?{" "}
          <Link to="/register" className="text-violet-600 font-bold">
            Înregistrează-te
          </Link>
        </p>
      </div>
    </div>
  );
}
