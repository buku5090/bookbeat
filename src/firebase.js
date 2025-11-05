// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0ma4eCnDEy6f-Frncp4D06PQ2XSRkr3Q",
  authDomain: "bookbeat-7cd25.firebaseapp.com",
  projectId: "bookbeat-7cd25",
  storageBucket: "bookbeat-7cd25.firebasestorage.app", // OK pentru noile proiecte
  messagingSenderId: "963075110428",
  appId: "1:963075110428:web:1761721987477a4ffe91d9",
};

// ——— init app (rezistent la hot-reload) ———
const alreadyInitialized = getApps().length > 0;
export const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig);

// ——— init Firestore ———
// Dacă abia am inițializat app-ul, setăm opțiuni care evită blocaje de rețea/proxy.
// Dacă app exista deja, luăm instanța existentă.
export const db = alreadyInitialized
  ? getFirestore(app)
  : initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true, // ajută la erorile „due to access control checks”
      // useFetchStreams: false, // deblochează unele browsere/stack-uri (activează doar dacă mai vezi probleme)
    });

// Log Firestore doar în dev (altfel e prea zgomotos)
if (import.meta?.env?.DEV) {
  setLogLevel("debug");
}

// ——— Auth & Storage ———
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app /*, "europe-west1" */);

// Log simplu pentru statusul autentificării (util la debugging)
onAuthStateChanged(auth, async (u) => {
  if (!u) {
    console.log("[AUTH] not signed in");
    return;
  }
  try {
    const token = await u.getIdToken(false);
    console.log("[AUTH] signed in:", u.email, "token:", token ? "ok" : "missing");
  } catch (e) {
    console.error("[AUTH] token error:", e);
  }
});
