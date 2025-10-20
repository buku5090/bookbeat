// src/pages/HomeLanding.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Input, Textarea, Label, Badge,
} from "../components/uiux";
import EventCard from "../components/EventCard";
import { events } from "../src/data/events";
// 👉 ajustează importul după cum îl ai în proiect
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO / BANNER */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600">
          <div className="absolute inset-0 opacity-20">
            {/* pattern simplu */}
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
              BookMix — conectăm artiștii cu locațiile
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-white/90 sm:text-lg">
              Descoperă DJ-i, trupe și locații (baruri, cluburi, cafenele) pregătite pentru evenimentul tău.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <Link to="/discover">
                <Button size="lg" className="bg-white text-black hover:opacity-90">
                  Descoperă artiști & locații
                </Button>
              </Link>

              {/* Afișăm butonul de autentificare doar când NU ești logat.
                  Când ești logat, arătăm "Contul meu". În timpul încărcării ascundem al doilea buton. */}
              {!loading && (
                user ? (
                  <Link to="/account">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                      Contul meu
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                      Intră în cont
                    </Button>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICII / FEATURE CARDS */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            title="Match inteligent"
            desc="Filtre și căutare pentru genuri, tarif și disponibilitate."
          />
          <FeatureCard
            title="Profiluri curate"
            desc="Galerie, genuri, echipamente, recenzii verificate."
          />
          <FeatureCard
            title="Booking simplu"
            desc="Contact direct și blocare în calendar în câteva clickuri."
          />
        </div>
      </section>

      {/* CTA secundar */}
      <section className="mx-auto my-20 max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold">Evenimente următoare</h2>
            <p className="mt-2 text-white/80">Descoperă ce urmează în comunitatea BookMix.</p>
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
                Vezi toate evenimentele
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
