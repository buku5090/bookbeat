// src/pages/EventsPage.jsx
import React from "react";
import EventCard from "../components/EventCard";
import { events } from "../src/data/events";

export default function EventsPage() {
  const upcoming = [...events].sort((a,b) => new Date(a.date) - new Date(b.date));
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Evenimente</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map(evt => <EventCard key={evt.id} event={evt} />)}
        </div>
      </section>
    </div>
  );
}
