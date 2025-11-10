// components/CompleteProfile.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../../src/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const REQUIRED = {
  artist: ["stageName", "genres", "price", "instagram"],       // exemplu
  location: ["name", "address", "capacity", "instagram"],      // exemplu
};

export default function CompleteProfile() {
  const { t } = useTranslation();
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return navigate("/login");

    const load = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const tRole = (userDoc.data()?.type ?? "user").trim().toLowerCase();
      setRole(tRole);

      const profRef = tRole === "artist"
        ? doc(db, "artistProfiles", user.uid)
        : doc(db, "locationProfiles", user.uid);

      const prof = await getDoc(profRef);
      setProfile(prof.data() ?? {});
    };
    load();
  }, [user, navigate]);

  const completion = (() => {
    if (!role) return 0;
    const fields = REQUIRED[role] || [];
    const have = fields.filter(k => {
      const v = profile?.[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    return fields.length ? Math.round((have / fields.length) * 100) : 0;
  })();

  const publish = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        completion,
        isPublic: completion >= 80, // prag
        updatedAt: serverTimestamp(),
      });
      if (completion >= 80) {
        alert(t("complete_profile.published_success"));
        navigate(`/user/${user.uid}`);
      } else {
        alert(t("complete_profile.missing_fields_info"));
      }
    } catch (e) {
      alert(t("complete_profile.publish_error", { message: e.message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">{t("complete_profile.title")}</h1>
        <p className="opacity-80">
          {t("complete_profile.account_type")} <b>{role}</b> • {t("complete_profile.progress")} <b>{completion}%</b>
        </p>

        <div className="p-4 rounded-xl border border-gray-700">
          <div className="opacity-80">
            {t("complete_profile.placeholder_fields", { role })}
          </div>
          <div className="text-sm mt-2">
            {t("complete_profile.required_fields")} { (REQUIRED[role] || []).join(", ") }
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={publish}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
          >
            {saving ? t("complete_profile.verifying") : t("complete_profile.publish")}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-3 rounded-xl border border-gray-700"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
