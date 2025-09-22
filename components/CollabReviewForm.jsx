// components/CollabReviewForm.jsx
import { useState } from "react";
import { db } from "../src/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Button from "./Button";
import { Star } from "lucide-react";

/**
 * Form pentru a lăsa recenzia PENTRU o colaborare.
 * reviewerSide: "artist" | "location" (partea care scrie recenzia)
 */
export default function CollabReviewForm({ collabId, reviewerSide, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!rating) return;
    setSending(true);
    const field = reviewerSide === "artist" ? "reviewByArtist" : "reviewByLocation";
    await updateDoc(doc(db, "collaborations", collabId), {
      [field]: {
        reviewerId: "__client__", // opțional: pune auth.uid dacă vrei strict
        rating,
        comment: (comment || "").slice(0, 400),
        createdAt: serverTimestamp(),
      },
    });
    setSending(false);
    onDone?.();
  };

  return (
    <div className="mt-2 text-xs">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i} stele`}>
            <Star className={`w-5 h-5 ${i <= rating ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-400"}`} />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={400}
        className="w-full border rounded p-2"
        placeholder="Comentariu (opțional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button variant="primary" className="mt-1" onClick={submit} disabled={sending || !rating}>
        Trimite
      </Button>
    </div>
  );
}
