// components/ReviewsSection.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../src/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import Button from "./Button";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// Hook privat (separat de pagină)
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

export default function ReviewsSection({ profileUid, authUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reviews, avg } = useReviews(profileUid);
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!authUser) return navigate("/login");
    if (!myRating) return;
    setSending(true);
    await addDoc(collection(db, "users", profileUid, "reviews"), {
      uid: authUser.uid,
      rating: myRating,
      comment: comment?.slice(0, 400) || "",
      createdAt: serverTimestamp(),
    });
    setMyRating(0);
    setComment("");
    setSending(false);
  };

  return (
    <div className="w-full">
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

      <div className="mt-3">
        {authUser ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setMyRating(i)} aria-label={t("reviews.stars_aria", { count: i })}>
                  <Star
                    className={`w-7 h-7 ${
                      i <= myRating
                        ? "fill-yellow-400 stroke-yellow-400"
                        : "stroke-gray-400"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded p-2 resize-none"
              rows={2}
              maxLength={400}
              placeholder={t("reviews.comment_placeholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button variant="primary" onClick={submit} disabled={sending || !myRating}>
              {t("reviews.submit_review")}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => navigate("/login")}>
            {t("reviews.login_to_review")}
          </Button>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mt-3 space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="border rounded p-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= (r.rating || 0)
                          ? "fill-yellow-400 stroke-yellow-400"
                          : "stroke-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span>{t("reviews.avg_out_of", { avg: r.rating })}</span>
              </div>
              {r.comment && (
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
