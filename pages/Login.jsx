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
import { useTranslation } from "react-i18next";

function isEmbeddedWebView() {
  const ua = navigator.userAgent || "";
  const vendors = ["FBAN", "FBAV", "Instagram", "Line", "Twitter", "TikTok"];
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroidWebView = /\bwv\b/.test(ua) || /Android.*Version\/[\d.]+/.test(ua);
  return vendors.some(v => ua.includes(v)) || isAndroidWebView || (isIOS && !window.navigator.standalone);
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }, []);

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
      }
    })();
  }, [navigate]);

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
      alert(t("auth.error_generic", { message: err.message }));
    }
  };

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
        <h2 className="text-2xl font-bold text-center text-gray-800">{t("auth.login_title")}</h2>

        <div className="space-y-4">
          <input
            className="w-full text-black !placeholder-gray-400 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder={t("auth.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
          <input
            className="w-full !text-black px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder={t("auth.password_placeholder")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={loginWithEmail}
            className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition"
          >
            {t("auth.login_with_email")}
          </button>

          <div className="text-center text-gray-500 text-sm">{t("common.or")}</div>

          <button
            onClick={loginWithGoogle}
            className="w-full !bg-black !border-black !text-white font-semibold py-3 rounded-lg hover:!bg-gray-800 transition"
          >
            {t("auth.login_with_google")}
          </button>

          {isEmbeddedWebView() && (
            <p className="text-xs text-gray-500 text-center">
              {t("auth.webview_hint")}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          {t("auth.no_account")}{" "}
          <Link to="/register" className="text-violet-600 font-bold">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
