// src/pages/EventDetailsPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { events } from "../src/data/events";
import { Badge, Button } from "../components/uiux";
import { useTranslation } from "react-i18next";

function formatDateLong(dt, t) {
  const d = new Date(dt);
  return d.toLocaleString("ro-RO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function EventDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const event = events.find(e => e.id === id);

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
          <img src={event.cover} alt={event.title} className="h-[360px] w-full object-cover" />

          <div className="p-6">
            <div className="mb-3 flex items-center gap-2">
              {event.genres?.map(g => (
                <Badge key={g} variant="secondary" className="bg-white/10 text-white">{g}</Badge>
              ))}
            </div>

            <h1 className="text-3xl font-bold">{event.title}</h1>

            <p className="mt-2 text-white/80">
              {formatDateLong(event.date, t)} • {event.venue}
            </p>

            <p className="mt-4 text-white/90">{event.description}</p>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xl font-semibold">{event.price}</span>
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
