import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 🆕 Importă autentificarea

const firebaseConfig = {
  apiKey: "AIzaSyD0ma4eCnDEy6f-Frncp4D06PQ2XSRkr3Q",
  authDomain: "bookbeat-7cd25.firebaseapp.com",
  projectId: "bookbeat-7cd25",
  storageBucket: "bookbeat-7cd25.firebasestorage.app",
  messagingSenderId: "963075110428",
  appId: "1:963075110428:web:1761721987477a4ffe91d9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); // 🆕 Exportă autentificarea
