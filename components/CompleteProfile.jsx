import { useEffect, useState } from "react";
import { auth, db } from "../src/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const REQUIRED = {
  artist: ["stageName", "genres", "price", "instagram"],       // exemplu
  location: ["name", "address", "capacity", "instagram"],      // exemplu
};

export default function CompleteProfile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return navigate("/login");

    const load = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const t = (userDoc.data()?.type ?? "user").trim().toLowerCase();
      setRole(t);

      const profRef = t === "artist"
        ? doc(db, "artistProfiles", user.uid)
        : doc(db, "locationProfiles", user.uid);

      const prof = await getDoc(profRef);
      setProfile(prof.data() ?? {});
    };
    load();
  }, [user, navigate]);

  const completion = (() => {
    if (!role) return 0;
    const fields = REQUIRED[role];
    const have = fields.filter(k => {
      const v = profile?.[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    return Math.round((have / fields.length) * 100);
  })();

  const publish = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        completion,
        isPublic: completion >= 80, // pragul tău
        updatedAt: serverTimestamp(),
      });
      alert(completion >= 80 ? "✅ Profil publicat!" : "ℹ️ Mai ai câmpuri de completat.");
      if (completion >= 80) navigate(`/user/${user.uid}`);
    } catch (e) {
      alert("Eroare la publicare: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Aici adaugi formularele tale detaliate pentru artist/location (EditableField etc.)
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Completează-ți profilul</h1>
        <p className="opacity-80">Tip cont: <b>{role}</b> • Progres: <b>{completion}%</b></p>

        {/* TODO: înlocuiește cu componentele tale de editare */}
        <div className="p-4 rounded-xl border border-gray-700">
          <div className="opacity-80">Aici vin câmpurile tale dedicate ({role}).</div>
          <div className="text-sm mt-2">Câmpuri esențiale (exemplu): {REQUIRED[role]?.join(", ")}</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={publish}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
          >
            {saving ? "Se verifică..." : "Publică profilul"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-3 rounded-xl border border-gray-700"
          >
            Înapoi
          </button>
        </div>
      </div>
    </div>
  );
}
