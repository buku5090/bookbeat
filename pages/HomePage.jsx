// src/pages/HomeLanding.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Textarea, Label, Badge,
} from "../components/uiux";
import EventCard from "../components/eventspage/EventCard";
import { events } from "../src/data/events";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600">

          <div className="absolute inset-0 opacity-20">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>

          <div className="relative z-10 px-6 py-16 text-center sm:px-12 sm:py-24">

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              {t("home.hero.title")}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-white/90 sm:text-lg">
              {t("home.hero.subtitle")}
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <Link to="/discover">
                <Button size="lg" className="bg-white text-black hover:opacity-90">
                  {t("home.hero.discover")}
                </Button>
              </Link>

              {!loading && (
                user ? (
                  <Link to="/account">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                      {t("home.hero.my_account")}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                      {t("home.hero.login")}
                    </Button>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            title={t("home.features.match_title")}
            desc={t("home.features.match_desc")}
          />
          <FeatureCard
            title={t("home.features.clean_profiles_title")}
            desc={t("home.features.clean_profiles_desc")}
          />
          <FeatureCard
            title={t("home.features.simple_booking_title")}
            desc={t("home.features.simple_booking_desc")}
          />
        </div>
      </section>

      {/* CTA EVENIMENTE */}
      <section className="mx-auto my-20 max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold">{t("home.events.title")}</h2>
            <p className="mt-2 text-white/80">{t("home.events.subtitle")}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...events]
              .sort((a,b) => new Date(a.date) - new Date(b.date))
              .slice(0,3)
              .map(evt => <EventCard key={evt.id} event={evt} />)}
          </div>

          <div className="mt-8 flex justify-center">
            <Link to="/events">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10">
                {t("home.events.see_all")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-white/80">{desc}</p>
    </div>
  );
}
