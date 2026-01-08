// pages/ProfilesPage.jsx — Dribbble-style search + filters + "closest to me" + geolocation button
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLoading as useGlobalLoading } from "../context/LoadingContext";
import ProfileCard from "../components/profiles/ProfileCard";
import SkeletonCard from "../components/profiles/SkeletonCard";
import { useTranslation } from "react-i18next";
import { useGlobalDialog } from "../context/GlobalDialogContext";

// date pentru recunoașterea termenilor multi-word
import * as GENRES_MOD from "../src/data/genres";
import CITIES from "../src/data/cities";
import VENUE_TYPES from "../src/data/venue_types";

const PER_PAGE = 12;
const SORT_OPTIONS = [
  "relevance",
  "nearest", // 👈 nou
  "newest",
  "oldest",
  "rating_desc",
  "price_asc",
  "price_desc",
];
const SORT_SET = new Set(SORT_OPTIONS);

// genuri din modul (compat fallback)
const GENRES = GENRES_MOD.default || GENRES_MOD.GENRES || GENRES_MOD.genres || [];
const GENRES_LIST = Array.isArray(GENRES) ? GENRES : [];

// utile
const norm = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const asStr = (v) => (v == null ? "" : v.toString ? v.toString() : String(v));

const bigrams = (s) => {
  const t = norm(s);
  const res = new Set();
  for (let i = 0; i < t.length - 1; i++) res.add(t.slice(i, i + 2));
  return res;
};
const dice = (a, b) => {
  if (!a || !b) return 0;
  const A = bigrams(a),
    B = bigrams(b);
  let inter = 0;
  A.forEach((g) => B.has(g) && inter++);
  return (2 * inter) / ((A.size + B.size) || 1);
};

// ======= known dictionaries (genres + cities + venue types) =======
const KNOWN_GENRES = GENRES_LIST.filter(Boolean).map(asStr);
const KNOWN_CITIES = (Array.isArray(CITIES) ? CITIES : []).filter(Boolean).map(asStr);
const KNOWN_TYPES = (Array.isArray(VENUE_TYPES) ? VENUE_TYPES : []).filter(Boolean).map(asStr);

// tip -> map normalizat => afișare
const MAP_GENRE = new Map(KNOWN_GENRES.map((g) => [norm(g), g]));
const MAP_CITY = new Map(KNOWN_CITIES.map((c) => [norm(c), c]));
const MAP_TYPE = new Map(KNOWN_TYPES.map((t) => [norm(t), t]));

// pentru match rapid
const ALL_KNOWN = [
  ...KNOWN_GENRES.map((v) => ({ kind: "genre", v })),
  ...KNOWN_CITIES.map((v) => ({ kind: "city", v })),
  ...KNOWN_TYPES.map((v) => ({ kind: "type", v })),
];

// mic dicționar de coordonate pt. orașe (poți extinde cum vrei)
const CITY_COORDS_RAW = {
  bucuresti: { lat: 44.4268, lng: 26.1025 },
  bucharest: { lat: 44.4268, lng: 26.1025 },
  "cluj-napoca": { lat: 46.7712, lng: 23.6236 },
  iasi: { lat: 47.1585, lng: 27.6014 },
  timisoara: { lat: 45.7489, lng: 21.2087 },
  brasov: { lat: 45.6579, lng: 25.6012 },
  sibiu: { lat: 45.793, lng: 24.143 },
  constanta: { lat: 44.1598, lng: 28.6348 },
  oradea: { lat: 47.0465, lng: 21.9189 },
  arad: { lat: 46.186, lng: 21.3123 },
};

function getCityCoords(name) {
  if (!name) return null;
  const key = norm(name);
  return CITY_COORDS_RAW[key] || null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// caută cea mai lungă expresie multi-word (max 4 cuvinte) care e cunoscută
function mergeToKnownTokens(words) {
  const tokens = [];
  for (let i = 0; i < words.length; ) {
    let j = i;
    let best = null;
    let bestEnd = -1;
    let phrase = "";
    while (j < words.length && j - i < 4) {
      phrase = (phrase ? phrase + " " : "") + words[j];
      const key = norm(phrase);
      if (MAP_GENRE.has(key)) {
        best = { kind: "genre", value: MAP_GENRE.get(key) };
        bestEnd = j;
      }
      if (MAP_CITY.has(key)) {
        best = { kind: "city", value: MAP_CITY.get(key) };
        bestEnd = j;
      }
      if (MAP_TYPE.has(key)) {
        best = { kind: "type", value: MAP_TYPE.get(key) };
        bestEnd = j;
      }
      j++;
    }
    if (bestEnd >= i) {
      tokens.push(best);
      i = bestEnd + 1;
    } else {
      tokens.push({ kind: "word", value: words[i] });
      i++;
    }
  }
  return tokens;
}

function parseQueryToTokens(q) {
  const words = asStr(q).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return mergeToKnownTokens(words);
}

// pentru "adresa mea curentă" – scoatem un oraș dacă îl recunoaștem
function detectCityInText(text) {
  if (!text) return "";
  const tokens = parseQueryToTokens(text);
  const cityTok = tokens.find((t) => t.kind === "city");
  return cityTok ? asStr(cityTok.value) : "";
}

function textBlobs(p) {
  const arr = [];
  arr.push(
    p.name,
    p.displayName,
    p.username,
    p.bio,
    p.description,
    p.city,
    p.location,
    p.type,
    p.venueType
  );
  (p.genres || []).forEach((g) => arr.push(g));
  (p.preferences || []).forEach((x) => arr.push(x));
  (p.types || []).forEach((x) => arr.push(x));
  return arr.map(norm).filter(Boolean);
}

function getProfileCoords(p) {
  // 1) coordonate directe (dacă le ai în Firestore)
  if (typeof p.lat === "number" && typeof p.lng === "number") {
    return { lat: p.lat, lng: p.lng };
  }
  if (typeof p.locationLat === "number" && typeof p.locationLng === "number") {
    return { lat: p.locationLat, lng: p.locationLng };
  }

  // 2) derivăm din oraș / location / addressCity
  const cityCandidate =
    p.city || p.locationCity || p.addressCity || p.location || p.venueCity;
  const cityCoords = getCityCoords(cityCandidate);
  if (cityCoords) return cityCoords;

  return null;
}

let USERS_CACHE = null;

function useSafeLoading() {
  try {
    const ctx = useGlobalLoading();
    return ctx || { isLoading: false, startLoading: () => {}, stopLoading: () => {} };
  } catch {
    return { isLoading: false, startLoading: () => {}, stopLoading: () => {} };
  }
}

// geolocare pentru butonul "Folosește locația actuală"
async function detectCurrentGeolocation(setCity, setAddress) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, error: "Geolocation nu este disponibil în browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        let bestCityKey = "";
        let bestDist = Infinity;

        for (const key of Object.keys(CITY_COORDS_RAW)) {
          const { lat, lng } = CITY_COORDS_RAW[key];
          // metrică simplă – pentru aproximare rapidă
          const d = Math.abs(lat - latitude) + Math.abs(lng - longitude);
          if (d < bestDist) {
            bestDist = d;
            bestCityKey = key;
          }
        }

        if (bestCityKey) {
          // afișăm cu literă mare la început
          const displayName =
            bestCityKey.charAt(0).toUpperCase() + bestCityKey.slice(1);

          setCity(displayName);
          setAddress(displayName);

          resolve({ ok: true, city: displayName });
        } else {
          resolve({ ok: false, error: "Nu am recunoscut niciun oraș." });
        }
      },
      (err) => resolve({ ok: false, error: err.message || "Eroare de geolocalizare." })
    );
  });
}

/* ---------- DIALOG COMPONENTE ---------- */

function SortDialogContent({ currentSort, onApply, canUseNearest }) {
  const [value, setValue] = useState(currentSort);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!SORT_SET.has(value)) return;
    if (value === "nearest" && !canUseNearest) {
      onApply("relevance");
    } else {
      onApply(value);
    }
  };

  const labelFor = (opt) => {
    switch (opt) {
      case "relevance":
        return "Relevance";
      case "nearest":
        return "Closest to me";
      case "newest":
        return "Newest";
      case "oldest":
        return "Oldest";
      case "rating_desc":
        return "Rating (High → Low)";
      case "price_asc":
        return "Price (Low → High)";
      case "price_desc":
        return "Price (High → Low)";
      default:
        return opt;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="space-y-2">
        {SORT_OPTIONS.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2 cursor-pointer hover:bg-white/5 ${
              opt === "nearest" && !canUseNearest ? "opacity-50" : ""
            }`}
          >
            <input
              type="radio"
              name="sort"
              value={opt}
              checked={value === opt}
              onChange={(e) => setValue(e.target.value)}
              className="accent-violet-500"
              disabled={opt === "nearest" && !canUseNearest}
            />
            <span>{labelFor(opt)}</span>
          </label>
        ))}
      </div>

      {canUseNearest ? (
        <p className="text-xs text-white/50">
          „Closest to me” folosește orașul din „Adresa mea curentă”.
        </p>
      ) : (
        <p className="text-xs text-amber-400/80">
          Pentru „Closest to me” setează mai întâi „Adresa mea curentă” sau
          folosește butonul de localizare.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-violet-600 text-sm font-medium hover:bg-violet-500"
        >
          Apply
        </button>
      </div>
    </form>
  );
}

function FiltersDialogContent({ currentFilter, currentAddress, onApply }) {
  const [value, setValue] = useState(currentFilter);
  const [address, setAddress] = useState(currentAddress || "");

  const detectedCity = detectCityInText(address);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply({
      filter: value,
      address,
      city: detectedCity || "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      {/* Tip profil */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/40">
          Profile type
        </p>
        {[
          { id: "all", label: "All profiles" },
          { id: "artist", label: "Artists" },
          { id: "location", label: "Locations" },
        ].map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2 cursor-pointer hover:bg-white/5"
          >
            <input
              type="radio"
              name="filter-type"
              value={opt.id}
              checked={value === opt.id}
              onChange={(e) => setValue(e.target.value)}
              className="accent-violet-500"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Adresa mea curentă */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/40">
          Adresa mea curentă
        </p>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex: Strada X nr. Y, București"
          className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-sm placeholder-white/40"
        />
        <p className="text-xs text-white/50">
          Scrie adresa sau doar localitatea. Dacă orașul e în lista noastră,
          îl detectăm automat.
        </p>
        {detectedCity && (
          <p className="text-xs text-emerald-400/90">
            Oraș detectat: <span className="font-medium">{detectedCity}</span>
          </p>
        )}
      </div>

      {/* aici poți adăuga ulterior și alte filtre din FilterSidebarModern */}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-violet-600 text-sm font-medium hover:bg-violet-500"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}

/* ---------- PAGINA PRINCIPALĂ ---------- */

export default function ProfilesPage() {
  const { t } = useTranslation();
  const { startLoading, stopLoading } = useSafeLoading();
  const { openDialog } = useGlobalDialog();

  const { page: pageParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // URL ↔ state
  const sp = new URLSearchParams(location.search);
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const qFromUrl = sp.get("q") || "";
  const sortFromUrl = sp.get("sort");
  const initialSort = SORT_SET.has(sortFromUrl) ? sortFromUrl : "relevance";

  // draft = ce tastează userul; appliedQuery = interogarea aplicată
  const [draft, setDraft] = useState("");
  const [appliedQuery, setAppliedQuery] = useState(qFromUrl);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [filter, setFilter] = useState("all"); // all | artist | location

  const [currentAddress, setCurrentAddress] = useState("");
  const [currentCity, setCurrentCity] = useState("");

  const [profiles, setProfiles] = useState(USERS_CACHE || []);
  const [loading, setLoading] = useState(!USERS_CACHE);
  const [suggestions, setSuggestions] = useState([]);

  const page = pageFromUrl;

  // fetch o singură dată
  useEffect(() => {
    if (USERS_CACHE) return;
    (async () => {
      startLoading();
      try {
        const snap = await getDocs(collection(db, "users"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProfiles(data);
        USERS_CACHE = data;
      } finally {
        setLoading(false);
        stopLoading();
      }
    })();
  }, []);

  // commit căutare (fără refresh la tastare)
  const commitSearch = (text) => {
    const tokens = parseQueryToTokens(text);
    const values = tokens.map((t) => asStr(t.value)).filter(Boolean);
    const nextQ = values.join(" ");
    setAppliedQuery(nextQ);
    setDraft(""); // eliberează inputul după ce s-au creat chips
    const next = new URLSearchParams(location.search);
    if (nextQ) next.set("q", nextQ);
    else next.delete("q");
    next.set("sort", sortOrder);
    navigate(`/discover/1?${next.toString()}`, { replace: true });
  };

  const onSubmit = (e) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    commitSearch(draft);
  };

  // SUGESTII (din genuri + orașe + tipuri) — bazate pe draft
  useEffect(() => {
    const last = norm(draft.split(/\s+/).pop() || "");
    if (!last) {
      setSuggestions([]);
      return;
    }
    const poolRaw = [...KNOWN_GENRES, ...KNOWN_CITIES, ...KNOWN_TYPES];
    const uniq = Array.from(
      new Set(poolRaw.map(asStr).filter((s) => s && typeof s === "string"))
    );
    const scored = uniq
      .map((v) => ({ v, sc: Math.max(dice(last, norm(v)), 0) }))
      .filter((x) => x.sc > 0.2 || norm(x.v).includes(last))
      .sort((a, b) => b.sc - a.sc || asStr(a.v).localeCompare(asStr(b.v)))
      .slice(0, 8)
      .map((x) => x.v);
    setSuggestions(scored);
  }, [draft]);

  // aplicate (chips)
  const appliedTokens = useMemo(
    () => parseQueryToTokens(appliedQuery),
    [appliedQuery]
  );

  // adaugă o sugestie ca „chip” și golește inputul
  const applySuggestion = (s) => {
    const toAdd = asStr(s).trim();
    if (!toAdd) return;
    const joined = [appliedQuery, toAdd].filter(Boolean).join(" ");
    setAppliedQuery(joined);
    setDraft("");
    const next = new URLSearchParams(location.search);
    next.set("q", joined);
    next.set("sort", sortOrder);
    navigate(`/discover/1?${next.toString()}`, { replace: true });
  };

  // șterge un chip
  const removeChip = (idx) => {
    const kept = appliedTokens
      .filter((_, i) => i !== idx)
      .map((t) => asStr(t.value));
    const q = kept.join(" ");
    setAppliedQuery(q);
    const next = new URLSearchParams(location.search);
    if (q) next.set("q", q);
    else next.delete("q");
    next.set("sort", sortOrder);
    navigate(`/discover/1?${next.toString()}`, { replace: true });
  };

  // funcție comună de aplicat sortarea (URL + state)
  const applySortOrder = (next) => {
    if (!SORT_SET.has(next)) return;
    setSortOrder(next);
    const sp2 = new URLSearchParams(location.search);
    if (appliedQuery) sp2.set("q", appliedQuery);
    else sp2.delete("q");
    sp2.set("sort", next);
    navigate(`/discover/${page}?${sp2.toString()}`, { replace: true });
  };

  // scoring + filtering (folosește DOAR interogarea aplicată)
  const filteredSorted = useMemo(() => {
    if (!profiles.length) return [];

    const base = profiles.filter((p) =>
      filter === "all" ? true : p.type === filter
    );

    const tokens = appliedTokens;
    const originCoords = getCityCoords(currentCity);

    if (!tokens.length && sortOrder === "relevance") {
      const baseList = [...base];
      if (sortOrder === "nearest" && originCoords) {
        return [...baseList].sort((a, b) => {
          const ca = getProfileCoords(a);
          const cb = getProfileCoords(b);
          const da =
            ca && originCoords
              ? haversineKm(originCoords.lat, originCoords.lng, ca.lat, ca.lng)
              : Infinity;
          const db =
            cb && originCoords
              ? haversineKm(originCoords.lat, originCoords.lng, cb.lat, cb.lng)
              : Infinity;
          return da - db;
        });
      }
      return sortList(baseList, sortOrder);
    }

    const scored = base
      .map((p) => {
        let hard = 0;
        let soft = 0;
        const blobs = textBlobs(p);

        for (const tok of tokens) {
          const v = norm(tok.value);
          if (tok.kind === "genre") {
            const g = (p.genres || []).map(norm);
            if (g.some((x) => x.includes(v))) hard++;
            else soft += bestDice(v, g);
          } else if (tok.kind === "city") {
            const cityVec = [p.city, p.location].map(norm);
            if (cityVec.some((x) => x.includes(v))) hard++;
            else soft += bestDice(v, cityVec);
          } else if (tok.kind === "type") {
            const types = [...(p.types || []), p.venueType, p.type].map(norm);
            if (types.some((x) => x.includes(v))) hard++;
            else soft += bestDice(v, types);
          } else {
            if (blobs.some((t) => t.includes(v))) hard++;
            else soft += bestDice(v, blobs);
          }
        }

        const allMatch = hard === tokens.length;
        const baseScore = allMatch
          ? 1000 + tokens.length
          : hard * 10 + soft / tokens.length;

        let distance = null;
        if (originCoords) {
          const c = getProfileCoords(p);
          if (c) {
            distance = haversineKm(
              originCoords.lat,
              originCoords.lng,
              c.lat,
              c.lng
            );
          }
        }

        return { p, allMatch, score: baseScore, distance };
      })
      .filter((x) => x.score > 0 || x.allMatch)
      .sort((a, b) =>
        a.allMatch !== b.allMatch ? (a.allMatch ? -1 : 1) : b.score - a.score
      );

    if (sortOrder === "relevance") {
      return scored.map((x) => x.p);
    }

    if (sortOrder === "nearest" && originCoords) {
      return [...scored]
        .sort((a, b) => {
          const da = a.distance ?? Infinity;
          const db = b.distance ?? Infinity;
          if (da === db) return b.score - a.score;
          return da - db;
        })
        .map((x) => x.p);
    }

    const justProfiles = scored.map((x) => x.p);
    return sortList(justProfiles, sortOrder);
  }, [profiles, appliedTokens, sortOrder, filter, currentCity]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
  const startIdx = (page - 1) * PER_PAGE;
  const pageItems = filteredSorted.slice(startIdx, startIdx + PER_PAGE);

  const withQS = (n) => {
    const sp3 = new URLSearchParams(location.search);
    sp3.set("sort", sortOrder);
    if (appliedQuery) sp3.set("q", appliedQuery);
    else sp3.delete("q");
    return `/discover/${n}?${sp3.toString()}`;
  };

  const goPrev = () => page > 1 && navigate(withQS(page - 1));
  const goNext = () => page < totalPages && navigate(withQS(page + 1));

  /* ---------- DIALOG HANDLERS ---------- */

  const openSortDialog = () => {
    openDialog({
      title: "Sort",
      widthClass: "w-full max-w-sm",
      content: ({ closeDialog }) => (
        <SortDialogContent
          currentSort={sortOrder}
          canUseNearest={!!currentCity}
          onApply={(val) => {
            applySortOrder(val);
            closeDialog();
          }}
        />
      ),
    });
  };

  const openFiltersDialog = () => {
    openDialog({
      title: "Filters",
      widthClass: "w-full max-w-sm",
      content: ({ closeDialog }) => (
        <FiltersDialogContent
          currentFilter={filter}
          currentAddress={currentAddress}
          onApply={({ filter: nextFilter, address, city }) => {
            setFilter(nextFilter);
            setCurrentAddress(address);
            setCurrentCity(city || "");
            if (!city && sortOrder === "nearest") {
              applySortOrder("relevance");
            }
            closeDialog();
          }}
        />
      ),
    });
  };

  // ─────────────── UI ───────────────
  return (
    <div className="flex flex-col p-4 md:p-6 gap-6 bg-black min-h-screen text-white">
      {/* Main column - full width, ca la Dribbble */}
      <div className="flex flex-col gap-5 w-full mx-auto">
        {/* Top search bar */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 md:p-4">
          <div className="flex flex-col gap-3">
            {/* query input + submit */}
            <form className="relative" onSubmit={onSubmit}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={"Search genres, cities, venue types…"}
                className="w-full h-11 px-4 pr-28 rounded-xl bg-black/60 border border-white/15 placeholder-white/40"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500"
                aria-label="Search"
                title="Search"
              >
                Search
              </button>
            </form>

            {/* chips — DOAR pentru interogarea aplicată */}
            {appliedTokens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {appliedTokens.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-white/5 border border-white/10"
                    title={t.kind}
                  >
                    <span className="opacity-80">{t.value}</span>
                    <button
                      onClick={() => removeChip(i)}
                      className="opacity-70 hover:opacity-100"
                      aria-label="remove chip"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* suggestions (click => chip + input gol) */}
            {suggestions.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => applySuggestion(s)}
                      className="w-full text-left bg-white text-black rounded-lg px-3 py-2 hover:shadow"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* list header: count + buttons (Filters / Sort) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-white/60">
              {filteredSorted.length} results
            </div>
            {currentCity && (
              <div className="text-[11px] text-white/50">
                Current area:{" "}
                <span className="font-medium text-white/80">
                  {currentCity}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openFiltersDialog}
              className="px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-xs sm:text-sm hover:bg-white/5"
            >
              Filters
            </button>
            <button
              type="button"
              onClick={openSortDialog}
              className="px-3 py-2 rounded-xl border border-white/20 bg-black/40 text-xs sm:text-sm hover:bg-white/5"
            >
              Sort
            </button>
          </div>
        </div>

        {/* Folosește locația actuală – card sub header, gen Google */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-white/80">Localizare</span>
            <span className="text-xs text-white/40">
              Folosește poziția ta actuală pentru a găsi profile apropiate.
            </span>
          </div>

          <button
            onClick={async () => {
              const res = await detectCurrentGeolocation(
                setCurrentCity,
                setCurrentAddress
              );
              if (!res.ok) {
                alert("Nu am putut detecta locația: " + res.error);
              }
            }}
            className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium"
          >
            Folosește locația actuală
          </button>
        </div>

        {/* list (UN SINGUR CARD PE RÂND, pe toată lățimea coloanei) */}
        <div className="grid grid-cols-1 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : pageItems.map((p) => (
                <div key={p.id} className="w-full">
                  <ProfileCard profile={p} />
                </div>
              ))}
        </div>

        {/* pagination */}
        {filteredSorted.length > PER_PAGE && (
          <div className="flex items-center justify-center gap-3 mt-2">
            <button
              onClick={goPrev}
              disabled={page <= 1}
              className="px-3 py-2 rounded-xl border border-white/20 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs opacity-80">
              Page {page} /{" "}
              {Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE))}
            </span>
            <button
              onClick={goNext}
              disabled={page >= Math.ceil(filteredSorted.length / PER_PAGE)}
              className="px-3 py-2 rounded-xl border border-white/20 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function bestDice(v, list) {
  let best = 0;
  for (const t of list) best = Math.max(best, dice(v, t));
  return best;
}

function sortList(list, order) {
  const getDate = (v) =>
    typeof v?.toDate === "function"
      ? v.toDate().getTime()
      : new Date(v).getTime();
  const byNewest = (a, b) => getDate(b.createdAt) - getDate(a.createdAt);
  if (order === "newest") return [...list].sort(byNewest);
  if (order === "oldest")
    return [...list].sort((a, b) => getDate(a.createdAt) - getDate(b.createdAt));
  if (order === "rating_desc")
    return [...list].sort((a, b) => (b?.rating ?? 0) - (a?.rating ?? 0));
  if (order === "price_asc")
    return [...list].sort(
      (a, b) => (a?.price ?? Infinity) - (b?.price ?? Infinity)
    );
  if (order === "price_desc")
    return [...list].sort(
      (a, b) => (b?.price ?? -Infinity) - (a?.price ?? -Infinity)
    );
  // "nearest" e tratat separat
  return list; // relevance handled anterior
}
