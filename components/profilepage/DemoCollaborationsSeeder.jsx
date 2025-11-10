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
import { useTranslation } from "react-i18next";

export default function DemoCollaborationsSeeder({
  profileUid,
  side = "artist",
  isOwnProfile = false,
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  if (!isOwnProfile || !profileUid) return null;

  const locations = [
    { id: "demo-loc-aurora", name: "Club Aurora" },
    { id: "demo-loc-selene", name: "Bar Selene" },
    { id: "demo-loc-neon", name: "Cafe Neon" },
    { id: "demo-loc-warehouse", name: "The Warehouse" },
    { id: "demo-loc-rooftop", name: "Rooftop 27" },
    { id: "demo-loc-subground", name: "Subground" },
  ];

  const comments = [
    t("demo.collab_good"),
    t("demo.collab_sound_ok"),
    t("demo.collab_org_ok"),
    t("demo.collab_delay"),
    t("demo.collab_energy"),
  ];

  const randomRating = () => 3 + Math.floor(Math.random() * 3);
  const randomComment = () =>
    comments[Math.floor(Math.random() * comments.length)];

  const seed = async () => {
    setBusy(true);
    setStatus(t("demo.adding"));
    try {
      const col = collection(db, "collaborations");
      const order = [0, 1, 2, 3, 4, 5, 0];

      for (let i = 0; i < order.length; i++) {
        const loc = locations[order[i]];
        const daysAgo = (i + 1) * 10;
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - daysAgo);

        const reviewField =
          side === "artist" ? "reviewByLocation" : "reviewByArtist";

        const docData = {
          isDemo: true,
          createdAt: serverTimestamp(),
          eventDate: Timestamp.fromDate(eventDate),

          artistId: side === "artist" ? profileUid : `demo-artist-${i + 1}`,
          artistName:
            side === "artist" ? t("demo.artist_you") : `Artist Demo ${i + 1}`,

          locationId: side === "artist" ? loc.id : profileUid,
          locationName:
            side === "artist" ? loc.name : t("demo.location_you"),

          pairKey:
            side === "artist"
              ? `${profileUid}_${loc.id}`
              : `${`demo-artist-${i + 1}`}_${profileUid}`,

          [reviewField]: {
            reviewerId:
              side === "artist" ? loc.id : `demo-artist-${i + 1}`,
            rating: randomRating(),
            comment: randomComment(),
            createdAt: serverTimestamp(),
          },
        };

        await addDoc(col, docData);
      }

      setStatus(t("demo.added_success"));
    } catch (e) {
      console.error(e);
      setStatus(t("demo.add_error"));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setStatus(t("demo.deleting"));
    try {
      const field = side === "artist" ? "artistId" : "locationId";
      const q = query(
        collection(db, "collaborations"),
        where("isDemo", "==", true),
        where(field, "==", profileUid)
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setStatus(t("demo.delete_success"));
    } catch (e) {
      console.error(e);
      setStatus(t("demo.delete_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button variant="primary" onClick={seed} disabled={busy}>
        {t("demo.button_add")}
      </Button>
      <Button variant="secondary" onClick={clear} disabled={busy}>
        {t("demo.button_delete")}
      </Button>
      {status && <span className="text-xs text-gray-600">{status}</span>}
    </div>
  );
}
