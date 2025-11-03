/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-undef */
// pages/AdvancedSettingsPage.jsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { auth, db } from "../src/firebase";
import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/uiux";

export default function AdvancedSettingsPage() {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // username
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // parole
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [msg, setMsg] = useState(null); // feedback scurt

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        navigate("/login");
        return;
      }
      setAuthUser(fbUser);
      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        setUserData(data);
        // pre-populează username în funcție de tip
        const uname =
          data?.type === "artist"
            ? data?.stageName || data?.name || ""
            : data?.type === "location"
            ? data?.locationName || data?.name || ""
            : data?.name || "";
        setUsername(uname);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const isTypeChosen = userData?.type === "artist" || userData?.type === "location";

  // === Detectare provideri ===
  const signInProviders = useMemo(
    () => (authUser?.providerData || []).map((p) => p?.providerId).filter(Boolean),
    [authUser]
  );
  const hasPasswordProvider = signInProviders.includes("password");
  const isGoogleLinked = signInProviders.includes("google.com");
  const isGoogleOnly = isGoogleLinked && !hasPasswordProvider;

  // Politică: dacă e legat Google, NU permiți schimbarea parolei aici (indiferent că are și password).
  const canChangePassword = hasPasswordProvider && !isGoogleLinked;

  const showMsg = useCallback((text, kind = "info") => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const handleSaveUsername = useCallback(async () => {
    if (!authUser) return;
    const ref = doc(db, "users", authUser.uid);

    // câmpul corect în funcție de tip
    let field = "name";
    if (isTypeChosen) field = userData.type === "artist" ? "stageName" : "locationName";

    setSavingUsername(true);
    try {
      await updateDoc(ref, { [field]: username });
      try {
        await updateProfile(auth.currentUser, { displayName: username });
      } catch {}
      showMsg("Username actualizat.");
      setUserData((p) => ({ ...p, [field]: username }));
    } catch (e) {
      showMsg(e?.message || "Eroare la actualizarea username-ului.", "error");
    } finally {
      setSavingUsername(false);
    }
  }, [authUser, isTypeChosen, userData?.type, username, showMsg]);

  const handleSavePassword = useCallback(async () => {
    if (!auth.currentUser) return;
    if (!canChangePassword) {
      showMsg("Contul este conectat prin Google. Parola se schimbă din Google, nu din BookMix.", "error");
      return;
    }
    if (!currentPassword) {
      showMsg("Introdu parola curentă pentru reautentificare.", "error");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showMsg("Parola nouă trebuie să aibă minim 6 caractere.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMsg("Parolele nu coincid.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      // reautentificare explicită cu parola curentă
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);

      await updatePassword(auth.currentUser, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showMsg("Parola a fost actualizată.");
    } catch (e) {
      showMsg(e?.message || "Eroare la actualizarea parolei.", "error");
    } finally {
      setSavingPassword(false);
    }
  }, [canChangePassword, currentPassword, newPassword, confirmPassword, showMsg]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 text-black">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Setări avansate</h1>
          <Button variant="secondary" onClick={() => navigate(`/profile/${authUser?.uid || ""}`)}>
            Înapoi la profil
          </Button>
        </div>

        {msg && (
          <div
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              msg.kind === "error" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Banner provider */}
        <div className="mb-6 rounded-lg px-4 py-3 text-sm bg-gray-100 text-gray-800">
          <div className="font-semibold mb-1">Metoda de autentificare</div>
          <div>
            {hasPasswordProvider ? "Email & parolă activ" : "Fără parolă locală"}
            {isGoogleLinked ? " • Conectat și cu Google" : ""}
          </div>
          {isGoogleLinked && (
            <div className="text-xs text-gray-600 mt-1">
              Contul este conectat prin Google. Parola se gestionează în Google; aici nu poate fi schimbată.
            </div>
          )}
        </div>

        {/* Username — permis pentru toți */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Username</h2>
          <div className="space-y-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Nume de scenă / nume locație / nume"
            />
            <Button variant="primary" onClick={handleSaveUsername} disabled={savingUsername}>
              {savingUsername ? "Se salvează..." : "Salvează username"}
            </Button>
            <p className="text-xs text-gray-500">
              Mapează automat: Artist → <code>stageName</code>, Locație → <code>locationName</code>, User →{" "}
              <code>name</code>.
            </p>
          </div>
        </section>

        {/* Parolă — vizibilă doar dacă NU e legat Google */}
        {canChangePassword ? (
          <section className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Schimbă parola</h2>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Parola curentă"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Parola nouă (minim 6 caractere)"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Confirmă parola nouă"
              />
              <Button variant="primary" onClick={handleSavePassword} disabled={savingPassword}>
                {savingPassword ? "Se salvează..." : "Salvează parola"}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
