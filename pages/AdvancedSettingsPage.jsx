// pages/AdvancedSettingsPage.jsx
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-undef */

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
import { useTranslation } from "react-i18next";

export default function AdvancedSettingsPage() {
  const { t } = useTranslation();
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
      showMsg(t("advancedSettings.messages.username_updated"));
      setUserData((p) => ({ ...p, [field]: username }));
    } catch (e) {
      showMsg(
        e?.message || t("advancedSettings.messages.username_update_error"),
        "error"
      );
    } finally {
      setSavingUsername(false);
    }
  }, [authUser, isTypeChosen, userData?.type, username, showMsg, t]);

  const handleSavePassword = useCallback(async () => {
    if (!auth.currentUser) return;
    if (!canChangePassword) {
      showMsg(t("advancedSettings.messages.google_linked_change_in_google"), "error");
      return;
    }
    if (!currentPassword) {
      showMsg(t("advancedSettings.messages.enter_current_password"), "error");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showMsg(t("advancedSettings.messages.password_min_length"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMsg(t("advancedSettings.messages.passwords_do_not_match"), "error");
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
      showMsg(t("advancedSettings.messages.password_updated"));
    } catch (e) {
      showMsg(
        e?.message || t("advancedSettings.messages.password_update_error"),
        "error"
      );
    } finally {
      setSavingPassword(false);
    }
  }, [canChangePassword, currentPassword, newPassword, confirmPassword, showMsg, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 text-black">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("advancedSettings.title")}</h1>
          <Button
            variant="secondary"
            onClick={() => navigate(`/profile/${authUser?.uid || ""}`)}
          >
            {t("advancedSettings.back_to_profile")}
          </Button>
        </div>

        {msg && (
          <div
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              msg.kind === "error"
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Banner provider */}
        <div className="mb-6 rounded-lg px-4 py-3 text-sm bg-gray-100 text-gray-800">
          <div className="font-semibold mb-1">
            {t("advancedSettings.auth_method.title")}
          </div>
          <div>
            {hasPasswordProvider
              ? t("advancedSettings.auth_method.email_password_enabled")
              : t("advancedSettings.auth_method.no_local_password")}
            {isGoogleLinked ? " • " + t("advancedSettings.auth_method.google_linked") : ""}
          </div>
          {isGoogleLinked && (
            <div className="text-xs text-gray-600 mt-1">
              {t("advancedSettings.auth_method.google_note")}
            </div>
          )}
        </div>

        {/* Username — permis pentru toți */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            {t("advancedSettings.username.section_title")}
          </h2>
          <div className="space-y-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={t("advancedSettings.username.placeholder")}
            />
            <Button
              variant="primary"
              onClick={handleSaveUsername}
              disabled={savingUsername}
            >
              {savingUsername
                ? t("advancedSettings.common.saving")
                : t("advancedSettings.username.save")}
            </Button>
            <p className="text-xs text-gray-500">
              {t("advancedSettings.username.mapping_note")}
            </p>
          </div>
        </section>

        {/* Parolă — vizibilă doar dacă NU e legat Google */}
        {canChangePassword ? (
          <section className="mb-4">
            <h2 className="text-lg font-semibold mb-3">
              {t("advancedSettings.password.section_title")}
            </h2>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={t("advancedSettings.password.current_placeholder")}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={t("advancedSettings.password.new_placeholder")}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={t("advancedSettings.password.confirm_placeholder")}
              />
              <Button
                variant="primary"
                onClick={handleSavePassword}
                disabled={savingPassword}
              >
                {savingPassword
                  ? t("advancedSettings.common.saving")
                  : t("advancedSettings.password.save")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
