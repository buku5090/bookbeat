// pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../src/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import Button from "../components/Button";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const createOrMergeUserDoc = async (user, displayName) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    // Setăm un schelet minimal + type:null (alegerea vine în ProfilePage)
    const payload = {
      uid: user.uid,
      email: user.email || email,
      name: displayName || user.displayName || "",
      photoURL: user.photoURL || "",
      type: snap.exists() ? snap.data()?.type ?? null : null, // nu forțăm dacă există deja
      // câmpuri utile pt profil (le poți extinde sau lăsa goale)
      stageName: snap.exists() ? snap.data()?.stageName ?? "" : "",
      locationName: snap.exists() ? snap.data()?.locationName ?? "" : "",
      bio: snap.exists() ? snap.data()?.bio ?? "" : "",
      genres: snap.exists() ? snap.data()?.genres ?? [] : [],
      acceptedGenres: snap.exists() ? snap.data()?.acceptedGenres ?? [] : [],
      demos: snap.exists() ? snap.data()?.demos ?? [] : [],
      gallery: snap.exists() ? snap.data()?.gallery ?? [] : [],
      instagram: snap.exists() ? snap.data()?.instagram ?? "" : "",
      updatedAt: serverTimestamp(),
      ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
    };

    await setDoc(ref, payload, { merge: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      // optional: setează displayName în Auth
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await createOrMergeUserDoc(cred.user, name.trim());
      navigate("/user");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Eroare la înregistrare.");
    } finally {
      setBusy(false);
    }
  };

  const signUpWithGoogle = async () => {
    setErr("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createOrMergeUserDoc(result.user, result.user.displayName || "");
      navigate("/user");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Eroare la autentificarea cu Google.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white text-black rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-1">Creează cont</h1>
        <p className="text-sm text-gray-600 mb-6">Cont unic, tipul îl alegi pe pagina de profil.</p>

        {err && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Nume afișat</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-black"
              placeholder="Ex: Alex Pop"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-black"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Parolă</label>
            <input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-black"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={busy}
            disabled={busy}
          >
            Creează cont
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-500">sau</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={signUpWithGoogle}
          disabled={busy}
        >
          Continuă cu Google
        </Button>

        <p className="mt-4 text-sm text-gray-600">
          Ai deja cont?{" "}
          <Link to="/login" className="text-black underline">
            Autentificare
          </Link>
        </p>
      </div>
    </div>
  );
}
