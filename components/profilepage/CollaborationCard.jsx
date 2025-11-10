import CollabReviewForm from "./CollabReviewForm";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";

export default function CollaborationCard({ collab, viewerSide, authUser, showForm = true }) {
  const { t } = useTranslation();

  const partnerName =
    viewerSide === "artist"
      ? (collab.locationName || collab.locationId)
      : (collab.artistName || collab.artistId);

  const shownReview =
    viewerSide === "artist" ? collab.reviewByLocation : collab.reviewByArtist;

  const reviewerSide = viewerSide === "artist" ? "location" : "artist";
  const reviewerId =
    reviewerSide === "artist" ? collab.artistId : collab.locationId;

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
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i <= (shownReview.rating || 0)
                      ? "fill-yellow-400 stroke-yellow-400"
                      : "stroke-gray-300"
                  }`}
                />
              ))}
            </div>
            {shownReview.comment && (
              <p className="line-clamp-2">{shownReview.comment}</p>
            )}
          </>
        ) : showForm && canReviewerWrite ? (
          <CollabReviewForm
            collabId={collab.id}
            reviewerSide={reviewerSide}
            onDone={() => {}}
          />
        ) : (
          <span className="italic text-gray-400">
            {t("collab.no_reviews_yet")}
          </span>
        )}
      </div>
    </div>
  );
}
