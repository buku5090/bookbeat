// pages/ProfilesPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useLoading as useGlobalLoading } from "../context/LoadingContext";

const PER_PAGE = 10;

// 👇 cache global, rămâne între remount-uri
let USERS_CACHE = null;
let USERS_TOTAL = null;

/* ====== hook safe pentru loader ====== */
function useSafeLoading() {
  try {
    const ctx = useGlobalLoading();
    return ctx || { isLoading: false, startLoading: () => {}, stopLoading: () => {} };
  } catch {
    return { isLoading: false, startLoading: () => {}, stopLoading: () => {} };
  }
}

/* ====== Stars ====== */
function RatingStars({ value = 0, outOf = 5 }) {
  const v = Number(value) || 0;
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;
  const empty = Math.max(0, outOf - full - (hasHalf ? 1 : 0));

  const Icon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
    </svg>
  );

  return (
    <div className="flex items-center gap-1">
      {[...Array(full)].map((_, i) => (
        <Icon key={`f${i}`} className="w-4 h-4 text-yellow-400" />
      ))}
      {hasHalf && (
        <div className="relative w-4 h-4">
          <Icon className="absolute inset-0 text-gray-300" />
          <Icon className="absolute inset-0 text-yellow-400" style={{ clipPath: "inset(0 50% 0 0)" }} />
        </div>
      )}
      {[...Array(empty)].map((_, i) => (
        <Icon key={`e${i}`} className="w-4 h-4 text-gray-300" />
      ))}
      <span className="ml-1 text-xs text-gray-400">{v.toFixed(1)}</span>
    </div>
  );
}

/* ====== Badges ====== */
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

function NewBadge({ className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
        "uppercase tracking-wide text-white " +
        "bg-gradient-to-r from-blue-600 to-indigo-600 " +
        "shadow-lg ring-1 ring-white/25 backdrop-blur-sm " +
        className
      }
      title="Profil creat recent"
    >
      <span className="text-sm leading-none">✨</span>
      Nou
    </span>
  );
}


/* ====== helpers ====== */
const toChips = (v) =>
  Array.isArray(v)
    ? v.filter(Boolean).slice(0, 6)
    : typeof v === "string" && v.trim()
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

const priceLabelFrom = (p) => {
  if (p?.priceLabel) return p.priceLabel;
  const price = Number(p?.price);
  if (price === 0) return "Gratis";
  if (Number.isFinite(price)) return `${price} RON / set`;
  return null;
};

const cityFrom = (p) => p?.city || p?.locationCity || p?.location?.city || p?.addressCity || null;

function ChipRow({ items = [], className = "" }) {
  const rowRef = React.useRef(null);
  const [overflowing, setOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div className={`relative min-w-0 ${className}`}>
      {/* un singur rând, cu spațiu extra în dreapta */}
      <div
        ref={rowRef}
        className="flex flex-nowrap gap-1.5 whitespace-nowrap overflow-hidden pr-12 pl-1 min-w-0"
        style={{
          maskImage: "linear-gradient(to right, black 85%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, black 85%, transparent)",
        }}
      >
        {items.map((text, i) => (
          <span
            key={i}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] bg-white/5 border border-white/10 text-white/85"
            title={text}
          >
            {text}
          </span>
        ))}
      </div>

      {overflowing && (
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/5 border border-white/10 text-white/70">
            …
          </span>
        </div>
      )}
    </div>
  );
}

/* ====== date helpers ====== */
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const getDate = (val) => {
  if (!val) return new Date(0);
  if (typeof val?.toDate === "function") return val.toDate(); // Firestore Timestamp
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") return new Date(val);
  return new Date(0);
};
const isNewProfile = (p) => {
  if (p?.isNewAccount === true) return true;
  const d = getDate(p?.createdAt);
  if (!d || isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= THREE_DAYS_MS;
};

export default function ProfilesPage() {
  const { startLoading, stopLoading } = useSafeLoading();

  const [profiles, setProfiles] = useState(USERS_CACHE || []);
  const [loading, setLoading] = useState(!USERS_CACHE); // dacă avem cache, nu mai arătăm loaderul local
  const [totalResults, setTotalResults] = useState(USERS_TOTAL); // dacă avem cache, îl folosim

  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const { page: pageParam } = useParams();
  const navigate = useNavigate();
  const page = Math.max(1, Number(pageParam) || 1);

  const [userChangedControls, setUserChangedControls] = useState(false);

  // ====== fetch din Firestore ======
  useEffect(() => {
    let mounted = true;

    // 1) dacă avem cache, afișăm instant fără 0 rezultate
    if (USERS_CACHE && mounted) {
      setProfiles(USERS_CACHE);
      setTotalResults(USERS_TOTAL);
      setLoading(false);
    }

    // 2) dar tot facem fetch, ca să fie fresh
    (async () => {
      startLoading();
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!mounted) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // salvăm în state
        setProfiles(data);
        setTotalResults(data.length);
        setLoading(false);

        // salvăm și în cache global
        USERS_CACHE = data;
        USERS_TOTAL = data.length;
      } catch (err) {
        console.error("Eroare la încărcarea profilurilor:", err);
        if (mounted) setLoading(false);
      } finally {
        stopLoading();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [startLoading, stopLoading]);

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

  const goPrev = () => {
    if (canPrev) navigate(`/discover/${page - 1}`);
  };
  const goNext = () => {
    if (canNext) navigate(`/discover/${page + 1}`);
  };

  const onFilterChange = (e) => {
    setFilter(e.target.value);
    setUserChangedControls(true);
  };
  const onSortChange = (e) => {
    setSortOrder(e.target.value);
    setUserChangedControls(true);
  };

  // AICI e cheia: dacă avem total salvat, îl afișăm, altfel — (dar nu 0)
  const displayCount =
    typeof totalResults === "number"
      ? totalResults
      : profiles.length > 0
      ? profiles.length
      : 0;

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
          <div className="text-white/70">
            {displayCount} rezultate
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                canPrev ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
              }`}
              aria-label="Înapoi"
            >
              ← Înapoi
            </button>
            <div className="text-xs text-white/70 px-2">
              Pagina {Math.min(page, totalPages)} / {totalPages}
            </div>
            <button
              onClick={goNext}
              disabled={!canNext}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                canNext ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
              }`}
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
              const isVerified = true;
              const isNew = isNewProfile(p);

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
                <div key={id} className={isPromoted ? "relative mb-1 z-10" : "relative z-0"}>
                  {isPromoted ? (
                    <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                      <Link to={`/user/${id}`} className="relative block rounded-t-2xl bg-[#121016] text-white group">
                        <div className="pointer-events-none absolute inset-0 rounded-t-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-pink-500/8" />
                        
                        {/* Badges layer */}
                        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                          {isNew && <NewBadge />}
                        </div>
                        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                          {isVerified && <VerifiedBadge />}
                        </div>

                        <div className="relative grid grid-cols-[96px_1fr] md:grid-cols-[120px_1fr] gap-4 p-4 md:p-5 min-h-[168px]">
                          <div className="relative w-24 h-24 md:w-28 md:h-28">
                            <div className="w-full h-full rounded-xl overflow-hidden border border-white/10">
                              <img
                                src={imageSrc}
                                alt={title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = placeholder;
                                }}
                              />
                            </div>
                          </div>

                          <div className="min-w-0 flex flex-col justify-between h-full relative">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white">
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
                            </div>

                            {gens.length > 0 && (
                              <div className="mt-2">
                                <ChipRow items={gens} />
                              </div>
                            )}

                            {(prefs.length > 0 || specs.length > 0) && (
                               <div className="mt-2">
                                <ChipRow items={[...prefs, ...specs]} />
                              </div>
                            )}

                          
                          </div>
                        </div>

                      </Link>
                      <div className="text-center py-1.5 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 rounded-b-2xl">
                        PROMOVAT
                      </div>
                    </div>
                  ) : (
                    <Link
                      to={`/user/${id}`}
                      className="block relative z-0 rounded-2xl bg-[#161616] text-white border border-white/10
                                hover:border-white/25 hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all"
                    >
                      {/* Badges layer */}
                      <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">{isNew && <NewBadge />}</div>
                        <div className="flex items-center gap-2">{isVerified && <VerifiedBadge />}</div>
                      </div>

                      <div className="grid grid-cols-[96px_1fr] md:grid-cols-[120px_1fr] gap-4 p-4 md:p-5 min-h-[168px]">
                        <div className="relative w-24 h-24 md:w-28 md:h-28">
                          <div className="w-full h-full rounded-xl overflow-hidden border border-white/10">
                            <img
                              src={imageSrc}
                              alt={title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = placeholder;
                              }}
                            />
                          </div>
                        </div>

                        <div className="min-w-0 flex flex-col justify-between h-full relative">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white">
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
                          </div>

                          {gens.length > 0 && (
                            <div className="mt-2">
                              <ChipRow items={gens} />
                            </div>
                          )}

                          {(prefs.length > 0 || specs.length > 0) && (
                            <div className="mt-2">
                              <ChipRow items={[...prefs, ...specs]} />
                            </div>
                          )}

                          <div className="absolute right-0 bottom-0 translate-y-1/2 pr-0">
                        </div>
                            <div className="text-[10px] md:text-xs font-medium uppercase tracking-wide text-white/45">
                              {type === "artist" ? "ARTIST" : type === "location" ? "LOCAȚIE" : "PROFIL"}
                            </div>
                          </div>
                      </div>
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom pagination */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={`px-4 py-2 rounded-xl border transition-colors ${
              canPrev ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            Înapoi
          </button>
          <div className="text-sm text-white/80">
            Pagina {Math.min(page, totalPages)} din {totalPages}
          </div>
          <button
            onClick={goNext}
            disabled={!canNext}
            className={`px-4 py-2 rounded-xl border transition-colors ${
              canNext ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            Înainte
          </button>
        </div>
      </div>
    </div>
  );
}
