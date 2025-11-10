// src/pages/EventsPage.jsx
import React from "react";
import EventCard from "../components/eventspage/EventCard";
import { events } from "../src/data/events";
import { useTranslation } from "react-i18next";

export default function EventsPage() {
  const { t } = useTranslation();
  const upcoming = [...events].sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">{t("events.title")}</h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map(evt => <EventCard key={evt.id} event={evt} />)}
        </div>
      </section>
    </div>
  );
}
