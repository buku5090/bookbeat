// pages/VerificationCenterPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { auth, db } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

import LoadingPage from "./LoadingPage";
import VerificationCenter from "../components/verification/VerificationCenter";

export default function VerificationCenterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!alive) return;

      if (!fbUser) {
        navigate("/login");
        return;
      }

      setAuthUser(fbUser);

      const ref = doc(db, "users", fbUser.uid);
      const unsubDoc = onSnapshot(ref, (snap) => {
        if (!alive) return;
        if (!snap.exists()) {
          setUserData(null);
        } else {
          setUserData({ uid: fbUser.uid, ...snap.data() });
        }
        setLoading(false);
      });

      return () => unsubDoc();
    });

    return () => {
      alive = false;
      unsubAuth();
    };
  }, [navigate]);

  const verificationStatus = userData?.verificationStatus || "unverified";

  const handleClose = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const handleMarkRequested = useCallback(async () => {
    if (!authUser?.uid) return;

    try {
      const ref = doc(db, "users", authUser.uid);
      await updateDoc(ref, { verificationStatus: "pending" });

      setUserData((prev) =>
        prev ? { ...prev, verificationStatus: "pending" } : prev
      );

      navigate("/profile");
    } catch (err) {
      console.error("Error updating verificationStatus:", err);
    }
  }, [authUser?.uid, navigate]);

  if (loading) return <LoadingPage />;

  if (!userData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>{t("verification.not_found", "Nu am găsit acest cont.")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">
            {t("verification.page_title", "Verificare cont BookMix")}
          </h1>
          <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
            {t(
              "verification.page_subtitle",
              "Vrem să fim siguri că în spatele fiecărui profil verificat se află un artist sau o locație reală. Urmează pașii de mai jos pentru a cere badge-ul de „verificat”."
            )}
          </p>
        </div>

        <VerificationCenter
          userData={userData}
          verificationStatus={verificationStatus}
          onClose={handleClose}
          onMarkRequested={handleMarkRequested}
        />
      </div>
    </div>
  );
}
