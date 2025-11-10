import React from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "../uiux";
import { useTranslation } from "react-i18next";

function formatDate(dt, locale = "ro-RO") {
  const d = new Date(dt);
  return d.toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventCard({ event }) {
  const { t, i18n } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img src={event.cover} alt={event.title} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          {event.genres?.slice(0, 3).map((g) => (
            <Badge key={g} variant="secondary" className="bg-white/10 text-white">
              {g}
            </Badge>
          ))}
          {event.status === "confirmed" && (
            <Badge className="bg-emerald-600">{t("event_card.confirmed")}</Badge>
          )}
          {event.status === "tentative" && (
            <Badge className="bg-amber-600">{t("event_card.tentative")}</Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <p className="mt-1 text-sm text-white/80">
          {formatDate(event.date, i18n.language)} • {event.venue}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-white/90 font-medium">{event.price}</span>
          <Link to={`/events/${event.id}`}>
            <Button size="sm" className="bg-white text-black hover:opacity-90">
              {t("event_card.details")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
