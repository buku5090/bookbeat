// components/DemoCollaborationsSeeder.jsx
import { useState } from "react";
import Button from "../Button";
import { db } from "../../src/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Seeder pentru colaborări DEMO.
 * - side: "artist" (pe profilul unui artist) sau "location" (pe profilul unei locații)
 * - inserează 6 colaborări (una dublată, ca să vezi cazul "3 ori cu aceeași locație")
 * - marchează documentele cu isDemo=true ca să le poți șterge ușor
 */
export default function DemoCollaborationsSeeder({
  profileUid,
  side = "artist",
  isOwnProfile = false,
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  if (!isOwnProfile || !profileUid) return null; // arată butoanele doar proprietarului profilului

  const locations = [
    { id: "demo-loc-aurora", name: "Club Aurora" },
    { id: "demo-loc-selene", name: "Bar Selene" },
    { id: "demo-loc-neon", name: "Cafe Neon" },
    { id: "demo-loc-warehouse", name: "The Warehouse" },
    { id: "demo-loc-rooftop", name: "Rooftop 27" },
    { id: "demo-loc-subground", name: "Subground" },
  ];

  // câteva comentarii random
  const comments = [
    "Super colaborare, vibe excelent.",
    "Sunet ok, staff foarte prietenos.",
    "Organizare bună, revenim cu drag.",
    "A fost ok, mici întârzieri la setup.",
    "Public fain, energie mare.",
  ];

  const randomRating = () => 3 + Math.floor(Math.random() * 3); // 3..5
  const randomComment = () => comments[Math.floor(Math.random() * comments.length)];

  const seed = async () => {
    setBusy(true);
    setStatus("Se adaugă colaborările demo…");
    try {
      const col = collection(db, "collaborations");

      // aranjăm 7 intrări, cu 1 locație dublată, ca să vezi “apare de 2 ori”
      const order = [0, 1, 2, 3, 4, 5, 0];

      for (let i = 0; i < order.length; i++) {
        const loc = locations[order[i]];
        // dată în trecut, să pară istoric
        const daysAgo = (i + 1) * 10;
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - daysAgo);

        // pe profil ARTIST → vrei să vezi review-ul lăsat de LOCAȚIE
        // pe profil LOCAȚIE → vrei să vezi review-ul lăsat de ARTIST
        const reviewField = side === "artist" ? "reviewByLocation" : "reviewByArtist";

        const docData = {
          isDemo: true,
          createdAt: serverTimestamp(),
          eventDate: Timestamp.fromDate(eventDate),
          // participanți
          artistId: side === "artist" ? profileUid : `demo-artist-${i + 1}`,
          artistName: side === "artist" ? "Artist (tu)" : `Artist Demo ${i + 1}`,
          locationId: side === "artist" ? loc.id : profileUid,
          locationName: side === "artist" ? loc.name : "Locația (tu)",
          pairKey:
            side === "artist"
              ? `${profileUid}_${loc.id}`
              : `${`demo-artist-${i + 1}`}_${profileUid}`,
          // review-ul “de cealaltă parte” ca să se vadă sub card
          [reviewField]: {
            reviewerId: side === "artist" ? loc.id : `demo-artist-${i + 1}`,
            rating: randomRating(),
            comment: randomComment(),
            createdAt: serverTimestamp(),
          },
        };

        await addDoc(col, docData);
      }

      setStatus("✅ Colaborări demo adăugate.");
    } catch (e) {
      console.error(e);
      setStatus("❌ Eroare la inserare.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setStatus("Se șterg colaborările demo…");
    try {
      // șterge DOAR ce e marcat ca isDemo și aparține profilului curent
      const field = side === "artist" ? "artistId" : "locationId";
      const q = query(
        collection(db, "collaborations"),
        where("isDemo", "==", true),
        where(field, "==", profileUid)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setStatus("✅ Demo-urile au fost șterse.");
    } catch (e) {
      console.error(e);
      setStatus("❌ Eroare la ștergere.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button variant="primary" onClick={seed} disabled={busy}>
        Adaugă colaborări demo
      </Button>
      <Button variant="secondary" onClick={clear} disabled={busy}>
        Șterge demo-urile
      </Button>
      {status && <span className="text-xs text-gray-600">{status}</span>}
    </div>
  );
}
