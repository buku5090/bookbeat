// components/ReviewsSummaryFromCollabs.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../../src/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Summary bazat pe colaborări:
 * - pe profil ARTIST → media din reviewByLocation.rating
 * - pe profil LOCAȚIE → media din reviewByArtist.rating
 */
export default function ReviewsSummaryFromCollabs({ profileUid, side = "artist" }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!profileUid) return;
    const q = query(
      collection(db, "collaborations"),
      where(side === "artist" ? "artistId" : "locationId", "==", profileUid),
      orderBy("eventDate", "desc")
    );
    const unsub = onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [profileUid, side]);

  const { avg, count } = useMemo(() => {
    const ratings = rows
      .map((r) => (side === "artist" ? r?.reviewByLocation?.rating : r?.reviewByArtist?.rating))
      .filter((x) => typeof x === "number" && x > 0);
    if (!ratings.length) return { avg: 0, count: 0 };
    const a = Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10;
    return { avg: a, count: ratings.length };
  }, [rows, side]);

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`w-5 h-5 ${i <= Math.round(avg) ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-400"}`} />
        ))}
      </div>
      <span className="text-sm text-gray-600">
        {avg ? t("reviews.avg_out_of", { avg }) : ""} ({count})
      </span>
    </div>
  );
}
