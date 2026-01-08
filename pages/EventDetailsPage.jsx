// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../src/firebase";
import { Badge, Button } from "../components/uiux";
import { useTranslation } from "react-i18next";

function formatDateLong(dt) {
  const d = dt?.toDate ? dt.toDate() : new Date(dt);
  return d.toLocaleString("ro-RO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setEvent(null);
          return;
        }

        const data = { id: snap.id, ...snap.data() };

        // ✅ Privacy gate:
        // If private and not owner -> treat as not found / unauthorized
        const user = auth.currentUser;
        const isOwner = user?.uid && data.ownerId === user.uid;

        if (data.visibility === "private" && !isOwner) {
          setEvent(null);
          return;
        }

        setEvent(data);
      } catch (e) {
        console.error("Error loading event:", e);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>{t("events.event_not_found")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {/* dacă vrei cover, îl poți adăuga în event doc (coverUrl).
              altfel punem un placeholder simplu */}
          {event.coverUrl ? (
            <img
              src={event.coverUrl}
              alt={event.title}
              className="h-[360px] w-full object-cover"
            />
          ) : (
            <div className="h-[360px] w-full bg-white/5" />
          )}

          <div className="p-6">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {Array.isArray(event.genres) &&
                event.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="bg-white/10 text-white">
                    {g}
                  </Badge>
                ))}

              <Badge className="bg-white/10 text-white">
                {event.visibility === "public" ? "Public" : "Privat"}
              </Badge>
            </div>

            <h1 className="text-3xl font-bold">{event.title}</h1>

            <p className="mt-2 text-white/80">
              {event.startDate ? formatDateLong(event.startDate) : ""}
              {event.endDate ? ` — ${formatDateLong(event.endDate)}` : ""}
              {event.venue ? ` • ${event.venue}` : ""}
              {event.timeRange ? ` • ${event.timeRange}` : ""}
            </p>

            {event.description && <p className="mt-4 text-white/90">{event.description}</p>}

            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-sm text-white/70">
                {event.budget ? `Buget: ${event.budget}` : ""}
              </span>

              {/* aici poți pune ce acțiune vrei; momentan placeholder */}
              <Button className="bg-white text-black hover:opacity-90">
                {t("events.reserve_tickets")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
