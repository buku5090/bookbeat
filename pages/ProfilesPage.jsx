// pages/ProfilesPage.jsx — Dribbble-style search + filters (apply-only, chips, 1 card/row)
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLoading as useGlobalLoading } from "../context/LoadingContext";
import FilterSidebarModern from "../components/profiles/FilterSidebarModern";
import ProfileCard from "../components/profiles/ProfileCard";
import SkeletonCard from "../components/profiles/SkeletonCard";
import { useTranslation } from "react-i18next";

// date pentru recunoașterea termenilor multi-word
import * as GENRES_MOD from "../src/data/genres";
import CITIES from "../src/data/cities";            // asigură-te că exporți o listă de stringuri
import VENUE_TYPES from "../src/data/venue_types";  // din fișierul de mai sus

const PER_PAGE = 12;
const SORT_OPTIONS = ["relevance", "newest", "oldest", "rating_desc", "price_asc", "price_desc"];
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
        // orașul are prioritate dacă e mai lung / la fel de lung
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

function textBlobs(p) {
  const arr = [];
  arr.push(p.name, p.displayName, p.username, p.bio, p.description, p.city, p.location, p.type, p.venueType);
  (p.genres || []).forEach((g) => arr.push(g));
  (p.preferences || []).forEach((x) => arr.push(x));
  (p.types || []).forEach((x) => arr.push(x));
  return arr.map(norm).filter(Boolean);
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

export default function ProfilesPage() {
  const { t } = useTranslation();
  const { startLoading, stopLoading } = useSafeLoading();
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
    // filtrează la stringuri valide și unice
    const uniq = Array.from(new Set(poolRaw.map(asStr).filter((s) => s && typeof s === "string")));
    const scored = uniq
      .map((v) => ({ v, sc: Math.max(dice(last, norm(v)), 0) }))
      .filter((x) => x.sc > 0.2 || norm(x.v).includes(last))
      .sort((a, b) => b.sc - a.sc || asStr(a.v).localeCompare(asStr(b.v)))
      .slice(0, 8)
      .map((x) => x.v);
    setSuggestions(scored);
  }, [draft]);

  // aplicate (chips)
  const appliedTokens = useMemo(() => parseQueryToTokens(appliedQuery), [appliedQuery]);

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
    const kept = appliedTokens.filter((_, i) => i !== idx).map((t) => asStr(t.value));
    const q = kept.join(" ");
    setAppliedQuery(q);
    const next = new URLSearchParams(location.search);
    if (q) next.set("q", q);
    else next.delete("q");
    next.set("sort", sortOrder);
    navigate(`/discover/1?${next.toString()}`, { replace: true });
  };

  // SORT
  const handleSortChange = (e) => {
    const next = e.target.value;
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
    const base = profiles.filter((p) => (filter === "all" ? true : p.type === filter));

    const tokens = appliedTokens;
    if (!tokens.length) return sortList(base, sortOrder);

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
        const score = allMatch ? 1000 + tokens.length : hard * 10 + soft / tokens.length;
        return { p, allMatch, score };
      })
      .filter((x) => x.score > 0 || x.allMatch)
      .sort((a, b) => (a.allMatch !== b.allMatch ? (a.allMatch ? -1 : 1) : b.score - a.score))
      .map((x) => x.p);

    return sortOrder === "relevance" ? scored : sortList(scored, sortOrder);
  }, [profiles, appliedTokens, sortOrder, filter]);

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

  // ─────────────── UI ───────────────
  return (
    <div className="flex flex-col md:flex-row p-4 md:p-6 gap-6 bg-black min-h-screen text-white">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block min-w-[280px] max-w-[360px] bg-[#0a0a0a] rounded-xl border border-white/10">
        <FilterSidebarModern
          filter={filter}
          sortOrder={sortOrder}
          onFilterChange={(e) => setFilter(e.target.value)}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col gap-5 max-w-4xl mx-auto w-full">
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
                    <span className="opacity-80">
                      {t.value}
                    </span>
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

        {/* list header: count + sort + filter button (mobile drawer e în componenta FilterSidebarModern dacă îl ai) */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-white/60">{filteredSorted.length} results</div>
          <div className="flex items-center gap-2">
            <label htmlFor="sortSelect" className="text-xs text-white/60">Sort</label>
            <select
              id="sortSelect"
              value={sortOrder}
              onChange={handleSortChange}
              className="appearance-none px-3 py-2 pr-8 rounded-xl border border-white/15 bg-black text-white text-sm font-medium"
              aria-label="Sort results"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "relevance"
                    ? "Relevance"
                    : opt === "newest"
                    ? "Newest"
                    : opt === "oldest"
                    ? "Oldest"
                    : opt === "rating_desc"
                    ? "Rating (High→Low)"
                    : opt === "price_asc"
                    ? "Price (Low→High)"
                    : opt === "price_desc"
                    ? "Price (High→Low)"
                    : opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* list (UN SINGUR CARD PE RÂND) */}
        <div className="grid grid-cols-1 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : pageItems.map((p) => (
                <div key={p.id} className="min-w-[280px]">
                  <ProfileCard profile={p} />
                </div>
              ))}
        </div>

        {/* pagination */}
        {filteredSorted.length > PER_PAGE && (
          <div className="flex items-center justify-center gap-3 mt-2">
            <button onClick={goPrev} disabled={page <= 1} className="px-3 py-2 rounded-xl border border-white/20 disabled:opacity-40">
              ← Prev
            </button>
            <span className="text-xs opacity-80">
              Page {page} / {Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE))}
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

function bestDice(v, list) {
  let best = 0;
  for (const t of list) best = Math.max(best, dice(v, t));
  return best;
}

function sortList(list, order) {
  const getDate = (v) => (typeof v?.toDate === "function" ? v.toDate().getTime() : new Date(v).getTime());
  const byNewest = (a, b) => getDate(b.createdAt) - getDate(a.createdAt);
  if (order === "newest") return [...list].sort(byNewest);
  if (order === "oldest") return [...list].sort((a, b) => getDate(a.createdAt) - getDate(b.createdAt));
  if (order === "rating_desc") return [...list].sort((a, b) => (b?.rating ?? 0) - (a?.rating ?? 0));
  if (order === "price_asc") return [...list].sort((a, b) => (a?.price ?? Infinity) - (b?.price ?? Infinity));
  if (order === "price_desc") return [...list].sort((a, b) => (b?.price ?? -Infinity) - (a?.price ?? -Infinity));
  return list; // relevance handled anterior
}
