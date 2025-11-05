// components/CollaborationCard.jsx
import CollabReviewForm from "./CollabReviewForm";
import { Star } from "lucide-react";

// util mic pentru inițiale
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";

/**
 * Card pentru O singură colaborare.
 * viewerSide: "artist" sau "location" — pe profilul cui ești.
 * Dacă reviewerul potrivit e logat și NU există review, poți afișa form (showForm=true).
 */
export default function CollaborationCard({ collab, viewerSide, authUser, showForm = true }) {
  const partnerName =
    viewerSide === "artist" ? (collab.locationName || collab.locationId) : (collab.artistName || collab.artistId);

  // ce recenzie arătăm SUB tile: recenzia lăsată de cealaltă parte despre profilul curent
  const shownReview = viewerSide === "artist" ? collab.reviewByLocation : collab.reviewByArtist;

  // cine ARE voie să scrie acum (dacă lipsește recenzia)
  const reviewerSide = viewerSide === "artist" ? "location" : "artist";
  const reviewerId = reviewerSide === "artist" ? collab.artistId : collab.locationId;
  const canReviewerWrite = !!authUser && authUser.uid === reviewerId;

  return (
    <div className="w-[160px] text-center">
      <div className="mx-auto h-28 w-28 rounded-full bg-slate-900 text-white grid place-items-center shadow">
        <span className="text-3xl font-semibold">{initials(partnerName)}</span>
      </div>
      <div className="mt-2 text-sm font-medium truncate">{partnerName}</div>

      <div className="mt-1 text-xs text-gray-700 min-h-[48px]">
        {shownReview ? (
          <>
            <div className="flex justify-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= (shownReview.rating || 0) ? "fill-yellow-400 stroke-yellow-400" : "stroke-gray-300"}`} />
              ))}
            </div>
            {shownReview.comment && <p className="line-clamp-2">{shownReview.comment}</p>}
          </>
        ) : showForm && canReviewerWrite ? (
          <CollabReviewForm
            collabId={collab.id}
            reviewerSide={reviewerSide}
            onDone={() => {/* opțional: toast */}}
          />
        ) : (
          <span className="italic text-gray-400">Nicio recenzie încă</span>
        )}
      </div>
    </div>
  );
}
