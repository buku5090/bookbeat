import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../src/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Card = ({ selected, title, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-5 rounded-2xl border transition
      ${selected ? "border-violet-600 ring-2 ring-violet-400" : "border-gray-700 hover:border-violet-600"}`}
  >
    <div className="text-xl font-semibold">{title}</div>
    <div className="text-sm opacity-80 mt-1">{subtitle}</div>
  </button>
);

// calculează un % minimal de completare (poți extinde ușor)
const calcCompletion = (role, data) => {
  if (role === "artist") {
    const needed = ["stageName", "genres", "price"];
    const have = needed.filter(k => {
      const v = data?.[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    return Math.round((have / needed.length) * 100);
  }
  if (role === "location") {
    const needed = ["name", "address", "capacity"];
    const have = needed.filter(k => {
      const v = data?.[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length;
    return Math.round((have / needed.length) * 100);
  }
  return 0;
};

export default function Onboarding() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [role, setRole] = useState(null); // "artist" | "location"
  const [saving, setSaving] = useState(false);

  // mini-form pentru primele câmpuri
  const [artist, setArtist] = useState({ stageName: "", genres: [], price: "" });
  const [location, setLocation] = useState({ name: "", address: "", capacity: "" });

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const completion = useMemo(
    () => calcCompletion(role, role === "artist" ? artist : location),
    [role, artist, location]
  );

  const startProfile = async () => {
    if (!role) return;

    setSaving(true);
    const uid = user.uid;
    const userRef = doc(db, "users", uid);

    try {
      // asigură-te că user doc există (deja creat la register)
      const exists = await getDoc(userRef);
      if (!exists.exists()) {
        await setDoc(userRef, {
          email: user.email ?? null,
          name: user.displayName ?? "",
          type: "user",
          isPublic: false,
          completion: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // setează rolul ales pe user
      await updateDoc(userRef, { type: role, updatedAt: serverTimestamp() });

      // creează profilul specific cu schelet minimal
      if (role === "artist") {
        await setDoc(
          doc(db, "artistProfiles", uid),
          {
            stageName: artist.stageName || "",
            genres: artist.genres || [],
            price: artist.price || "",
            instagram: "",
            description: "",
            availability: [],
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, "locationProfiles", uid),
          {
            name: location.name || "",
            address: location.address || "",
            capacity: location.capacity || "",
            equipment: [],
            instagram: "",
            description: "",
            acceptedGenres: [],
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // actualizează progresul (rămâne privat)
      await updateDoc(userRef, {
        completion,
        isPublic: false,
      });

      // mergi la completarea profilului (pagina ta existentă)
      navigate("/complete-profile");
    } catch (e) {
      alert("Eroare la inițializare profil: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-8">
        <h1 className="text-3xl font-bold">Hai să-ți configurăm contul</h1>
        <p className="opacity-80">
          Alege tipul contului. Poți schimba ulterior. Profilul tău nu devine public până nu finalizezi câmpurile esențiale.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            selected={role === "artist"}
            title="Artist"
            subtitle="DJ / muzician. Adaugă genuri, tarif, linkuri."
            onClick={() => setRole("artist")}
          />
          <Card
            selected={role === "location"}
            title="Locație"
            subtitle="Bar / pub / cafenea / club. Adaugă adresă, capacitate, echipamente."
            onClick={() => setRole("location")}
          />
        </div>

        {/* mini-form inițial (opțional), doar câmpurile esențiale pentru calculul progresului */}
        {role === "artist" && (
          <div className="space-y-3">
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Nume de scenă"
              value={artist.stageName}
              onChange={(e) => setArtist((s) => ({ ...s, stageName: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Genuri (separate prin virgulă)"
              value={artist.genres.join(", ")}
              onChange={(e) =>
                setArtist((s) => ({ ...s, genres: e.target.value.split(",").map(g => g.trim()).filter(Boolean) }))
              }
            />
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Tarif (RON/set)"
              value={artist.price}
              onChange={(e) => setArtist((s) => ({ ...s, price: e.target.value }))}
            />
          </div>
        )}

        {role === "location" && (
          <div className="space-y-3">
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Nume locație"
              value={location.name}
              onChange={(e) => setLocation((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Adresă"
              value={location.address}
              onChange={(e) => setLocation((s) => ({ ...s, address: e.target.value }))}
            />
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-black"
              placeholder="Capacitate maximă"
              value={location.capacity}
              onChange={(e) => setLocation((s) => ({ ...s, capacity: e.target.value }))}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm opacity-80">Progres inițial: {completion}%</div>
          <button
            disabled={!role || saving}
            onClick={startProfile}
            className="px-5 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
          >
            {saving ? "Se salvează..." : "Continuă ➜"}
          </button>
        </div>
      </div>
    </div>
  );
}
