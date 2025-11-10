// components/ReviewsSummary.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../src/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// Hook privat – nu mai e în pagină
function useReviews(profileUid) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!profileUid) return;
    const q = query(
      collection(db, "users", profileUid, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) =>
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [profileUid]);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return Math.round(
      (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) * 10
    ) / 10;
  }, [reviews]);

  return { reviews, avg };
}

export default function ReviewsSummary({ profileUid }) {
  const { t } = useTranslation();
  const { reviews, avg } = useReviews(profileUid);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i <= Math.round(avg)
                  ? "fill-yellow-400 stroke-yellow-400"
                  : "stroke-gray-400"
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {avg ? t("reviews.avg_out_of", { avg }) : t("reviews.no_rating_yet")} ({reviews.length})
        </span>
      </div>
    </div>
  );
}
