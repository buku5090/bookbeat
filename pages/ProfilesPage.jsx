import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link, useParams, useNavigate } from "react-router-dom";

const PER_PAGE = 10;

/* ====== Stars ====== */
function RatingStars({ value = 0, outOf = 5 }) {
  const v = Number(value) || 0;
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;
  const empty = Math.max(0, outOf - full - (hasHalf ? 1 : 0));

  const Icon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="flex items-center gap-1">
      {[...Array(full)].map((_, i) => <Icon key={`f${i}`} className="w-4 h-4 text-yellow-400" />)}
      {hasHalf && (
        <div className="relative w-4 h-4">
          <Icon className="absolute inset-0 text-gray-300" />
          <Icon className="absolute inset-0 text-yellow-400" style={{ clipPath: "inset(0 50% 0 0)" }} />
        </div>
      )}
      {[...Array(empty)].map((_, i) => <Icon key={`e${i}`} className="w-4 h-4 text-gray-300" />)}
      <span className="ml-1 text-xs text-gray-400">{v.toFixed(1)}</span>
    </div>
  );
}

/* ====== Badges & Ribbon ====== */
function VerifiedBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] md:text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
        <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
      </svg>
      Verificat
    </span>
  );
}

function PromotedOverImage() {
  return (
    <div className="absolute -top-3 -left-7 rotate-[-35deg] z-20 pointer-events-none">
      <div
        className="min-w-[160px] text-center
        bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-700
        text-white text-[10px] md:text-[11px] font-extrabold
        px-0 py-[5px] uppercase tracking-wider
        rounded-sm border border-violet-400/60
        shadow-[0_4px_12px_rgba(168,85,247,0.6)] backdrop-blur-[2px]"
      >
        PROMOVAT
      </div>
    </div>
  );
}

/* ====== helpers ====== */
const toChips = (v) =>
  Array.isArray(v)
    ? v.filter(Boolean).slice(0, 6)
    : typeof v === "string" && v.trim()
    ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6)
    : [];

const priceLabelFrom = (p) => {
  if (p?.priceLabel) return p.priceLabel;
  const price = Number(p?.price);
  if (price === 0) return "Gratis";
  if (Number.isFinite(price)) return `${price} RON / set`;
  return null;
};

const cityFrom = (p) => p?.city || p?.locationCity || p?.location?.city || p?.addressCity || null;

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const { page: pageParam } = useParams();
  const navigate = useNavigate();
  const page = Math.max(1, Number(pageParam) || 1);

  const [userChangedControls, setUserChangedControls] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!mounted) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProfiles(data);
      } catch (err) {
        console.error("Eroare la încărcarea profilurilor:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getDate = (val) => {
    if (!val) return new Date(0);
    if (typeof val?.toDate === "function") return val.toDate();
    if (typeof val === "number") return new Date(val);
    if (typeof val === "string") return new Date(val);
    return new Date(0);
  };

  const filteredSorted = useMemo(() => {
    const filtered = profiles.filter((p) => (filter === "all" ? true : p.type === filter));
    const sorted = [...filtered].sort((a, b) => {
      const da = getDate(a.createdAt);
      const db = getDate(b.createdAt);
      return sortOrder === "oldest" ? da - db : db - da;
    });
    return sorted;
  }, [profiles, filter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));

  useEffect(() => {
    if (loading) return;
    if (page > totalPages) {
      navigate(`/discover/${totalPages}`, { replace: true });
    } else if (page < 1) {
      navigate(`/discover/1`, { replace: true });
    }
  }, [page, totalPages, loading, navigate]);

  useEffect(() => {
    if (!userChangedControls) return;
    navigate(`/discover/1`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userChangedControls, filter, sortOrder, navigate]);

  const startIdx = (page - 1) * PER_PAGE;
  const pageItems = filteredSorted.slice(startIdx, startIdx + PER_PAGE);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => { if (canPrev) navigate(`/discover/${page - 1}`); };
  const goNext = () => { if (canNext) navigate(`/discover/${page + 1}`); };

  const onFilterChange = (e) => { setFilter(e.target.value); setUserChangedControls(true); };
  const onSortChange = (e) => { setSortOrder(e.target.value); setUserChangedControls(true); };

  return (
    <div className="flex flex-col md:flex-row p-6 gap-6 bg-black min-h-screen text-white">
      {/* Sidebar */}
      <div className="w-full md:w-1/4 bg-black p-4 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Filtre</h2>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/70">Tip profil</label>
            <div className="relative">
              <select
                value={filter}
                onChange={onFilterChange}
                className="appearance-none w-full px-4 py-2 pr-10 rounded-xl border border-white/15 bg-black text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Toate</option>
                <option value="artist">Artiști</option>
                <option value="location">Locații</option>
                <option value="user">Users</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/70">Sortare</label>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={onSortChange}
                className="appearance-none w-full px-4 py-2 pr-10 rounded-xl border border-white/15 bg-black text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="newest">Cele mai noi</option>
                <option value="oldest">Cele mai vechi</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conținut */}
      <div className="w-full md:w-3/4 flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="text-white/70">{filteredSorted.length} rezultate</div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors ${canPrev ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"}`}
              aria-label="Înapoi"
            >
              ← Înapoi
            </button>
            <div className="text-xs text-white/70 px-2">Pagina {Math.min(page, totalPages)} / {totalPages}</div>
            <button
              onClick={goNext}
              disabled={!canNext}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors ${canNext ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"}`}
              aria-label="Înainte"
            >
              Înainte →
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center items-center w-full h-48">
              <div className="w-12 h-12 border-4 border-white/30 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex items-center justify-center h-48 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-center">
                <div className="text-lg font-semibold">Niciun profil găsit</div>
                <div className="text-white/60">Încearcă alt filtru sau sortare.</div>
              </div>
            </div>
          ) : (
            pageItems.map((p) => {
              const { id, name, stageName, type, photoURL, avatarUrl, rating = 0, preferences, genres, specializations } = p;

              const isPromoted = !!p.promoted;
              const isVerified = true;//p.verificationStatus === "verified" || p.verified === true;

              const title = stageName || name || "—";
              const label = (type || "profile").toUpperCase();
              const placeholder = `https://placehold.co/120x120?text=${encodeURIComponent(label)}`;
              const imageSrc = photoURL || avatarUrl || placeholder;

              const prefs = toChips(preferences);
              const gens = toChips(genres);
              const specs = toChips(specializations);

              const city = cityFrom(p);
              const priceLabel = priceLabelFrom(p);
              const availability = p?.availabilityNote || p?.availability || null;

              return (
                <Link
                  key={id}
                  to={`/user/${id}`}
                  className={`relative group grid grid-cols-[96px_1fr] md:grid-cols-[120px_1fr] gap-4 p-4 md:p-5 rounded-2xl shadow-sm min-h-[168px]
                    text-white border transition-all
                    ${isPromoted
                      ? "bg-gradient-to-br from-violet-800/20 via-fuchsia-700/10 to-transparent border-2 border-violet-500/60 ring-2 ring-violet-400/40 hover:ring-violet-300/60 hover:border-fuchsia-400/80 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      : "bg-white/5 border-white/10 hover:border-white/30 hover:shadow-lg hover:-translate-y-[1px]"}

                  `}
                >
                  {/* BADGE VERIFICAT – dreapta sus */}
                  {isVerified && (
                    <div className="absolute top-3 right-3 z-10">
                      <VerifiedBadge />
                    </div>
                  )}

                  {/* THUMB + BADGE PROMOVAT (poate ieși în afara pozei) */}
                  <div className="relative w-24 h-24 md:w-28 md:h-28">
                    {/* wrapperul care taie doar imaginea, pentru colțuri rotunjite */}
                    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={imageSrc}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholder; }}
                      />
                    </div>

                    {/* badge-ul stă ÎN AFARA acestui wrapper => nu mai e tăiat */}
                    {isPromoted && <PromotedOverImage />}
                  </div>


                  <div className="min-w-0 flex flex-col justify-between h-full relative">
                    {/* TITLU */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h3>
                        {/* <- nu mai punem “Promovat”/alt chip aici ca să nu se calce */}
                      </div>
                    </div>

                    {/* META */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <RatingStars value={Number(rating) || 0} />
                      {city && (
                        <div className="text-xs text-white/70 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
                          {city}
                        </div>
                      )}
                      {priceLabel && (
                        <div className="text-xs text-white/70 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
                          {priceLabel}
                        </div>
                      )}
                      {availability && (
                        <div className="text-xs text-white/70 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
                          {availability}
                        </div>
                      )}
                      <span className="ml-auto text-xs text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        Vezi profil →
                      </span>
                    </div>

                    {/* GENURI */}
                    {gens.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Genuri</div>
                        <div className="flex flex-wrap gap-1.5">
                          {gens.map((g, i) => (
                            <span
                              key={`g-${i}`}
                              className="px-2.5 py-1 rounded-lg text-[11px] bg-violet-500/10 border border-violet-400/20 text-violet-100"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PREFERINȚE */}
                    {(prefs.length > 0 || specs.length > 0) && (
                      <div className="mt-2">
                        <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1">Preferințe</div>
                        <div className="flex flex-wrap gap-1.5">
                          {prefs.map((tag, i) => (
                            <span key={`p-${i}`} className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 border border-white/12 text-white/85">
                              {tag}
                            </span>
                          ))}
                          {specs.map((s, i) => (
                            <span key={`s-${i}`} className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 border border-white/12 text-white/85">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TIP CONT – dreapta jos */}
                    <div className="absolute right-0 bottom-0 translate-y-1/2 pr-0">
                      <div className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-white/60">
                        {type === "artist" ? "ARTIST" : type === "location" ? "LOCAȚIE" : "PROFIL"}
                      </div>
                    </div>
                  </div>
                </Link>
              );

            })
          )}
        </div>

        {/* Bottom pagination */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={`px-4 py-2 rounded-xl border transition-colors ${canPrev ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"}`}
          >
            Înapoi
          </button>
          <div className="text-sm text-white/80">Pagina {Math.min(page, totalPages)} din {totalPages}</div>
          <button
            onClick={goNext}
            disabled={!canNext}
            className={`px-4 py-2 rounded-xl border transition-colors ${canNext ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"}`}
          >
            Înainte
          </button>
        </div>
      </div>
    </div>
  );
}
