import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../src/firebase";
import { Link, useNavigate } from "react-router-dom";

function isEmbeddedWebView() {
  const ua = navigator.userAgent || "";
  const vendors = ["FBAN", "FBAV", "Instagram", "Line", "Twitter", "TikTok"];
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroidWebView = /\bwv\b/.test(ua) || /Android.*Version\/[\d.]+/.test(ua);
  return vendors.some(v => ua.includes(v)) || isAndroidWebView || isIOS && !window.navigator.standalone;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // persistence (important pe iOS)
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }, []);

  // 1) Procesează rezultatul redirect-ului (obligatoriu pt mobil)
  useEffect(() => {
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res?.user) {
          await saveUserIfNotExists(res.user);
          navigate("/profil");
          return;
        }
      } catch (e) {
        console.warn("Google redirect error:", e?.code, e?.message);
        // afișează un mesaj prietenos sau fallback pe email login
      }
    })();
  }, [navigate]);

  // 2) Dacă userul e deja logat
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await saveUserIfNotExists(user);
        navigate("/profil");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loginWithEmail = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await saveUserIfNotExists(cred.user);
      navigate("/profil");
    } catch (err) {
      alert("❌ Eroare: " + err.message);
    }
  };

  // 3) Google login: popup pe desktop, redirect pe mobil/webview
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (isMobile() || isEmbeddedWebView()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      const result = await signInWithPopup(auth, provider);
      await saveUserIfNotExists(result.user);
      navigate("/profil");
    } catch (error) {
      // orice eroare pe popup -> fallback redirect
      console.warn("Popup failed, fallback to redirect:", error?.code);
      await signInWithRedirect(auth, provider);
    }
  };

  const saveUserIfNotExists = async (user) => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">Autentificare în BookBeat</h2>

        <div className="space-y-4">
          <input className="w-full text-black !placeholder-gray-400 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                 placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <input className="w-full !text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                 placeholder="Parolă" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button onClick={loginWithEmail}
                  className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition">
            🔐 Login cu Email
          </button>

          <div className="text-center text-gray-500 text-sm">sau</div>

          <button onClick={loginWithGoogle}
                  className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition">
            🔓 Login cu Google
          </button>

          {/* Mesaj util pt. in-app browsers */}
          {isEmbeddedWebView() && (
            <p className="text-xs text-gray-500 text-center">
              Dacă loginul nu pornește, apasă ⋯ și deschide în browserul implicit (Safari/Chrome).
            </p>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          Nu ai cont? <Link to="/register" className="text-violet-600 font-bold">Înregistrează-te</Link>
        </p>
      </div>
    </div>
  );
}
