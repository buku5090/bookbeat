import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as GENRES_MOD from "../src/data/genres";

// ---- helpers ----------------------------------------------------------------
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const GENRES =
  GENRES_MOD.default ||
  GENRES_MOD.GENRES ||
  GENRES_MOD.genres ||
  [];

// hărți pentru potriviri rapide de gen
const GENRES_LIST = Array.isArray(GENRES) ? GENRES : [];
const GENRE_BY_NORM = new Map(GENRES_LIST.map((g) => [norm(g), g]));

function bigrams(s) {
  const t = norm(s);
  const res = new Set();
  for (let i = 0; i < t.length - 1; i++) res.add(t.slice(i, i + 2));
  return res;
}
function dice(a, b) {
  if (!a || !b) return 0;
  const A = bigrams(a),
    B = bigrams(b);
  let inter = 0;
  A.forEach((g) => {
    if (B.has(g)) inter++;
  });
  return (2 * inter) / (A.size + B.size || 1);
}

const PAGE_SIZE = 8;

const TOKEN_TYPES = {
  user: "@",
  genre: ">",
  pref: "<",
  event: "#",
};
const TYPE_BY_PREFIX = Object.fromEntries(
  Object.entries(TOKEN_TYPES).map(([k, v]) => [v, k])
);

// returnează { tokens, currentRaw } și unește free tokens în genuri multi-cuvânt
function parseQuery(q) {
  const parts = (q || "").split(/\s+/).filter(Boolean);
  const rawTokens = [];
  let currentRaw = "";

  for (const p of parts) {
    const prefix = p[0];
    const type = TYPE_BY_PREFIX[prefix];
    if (type) {
      const value = p.slice(1);
      if (value.length) rawTokens.push({ type, value });
      else currentRaw = p;
    } else {
      rawTokens.push({ type: "free", value: p });
    }
  }

  // ── unește token-urile free adiacente dacă formează un gen cunoscut
  const merged = [];
  for (let i = 0; i < rawTokens.length; ) {
    const t = rawTokens[i];
    if (t.type !== "free") {
      merged.push(t);
      i++;
      continue;
    }

    let j = i;
    let bestEnd = -1;
    let bestDisplay = null;
    let phrase = "";
    while (j < rawTokens.length && rawTokens[j].type === "free") {
      phrase = (phrase ? phrase + " " : "") + rawTokens[j].value;
      const hit = GENRE_BY_NORM.get(norm(phrase));
      if (hit) {
        bestEnd = j;
        bestDisplay = hit;
      }
      j++;
    }

    if (bestEnd >= i) {
      merged.push({ type: "genre", value: bestDisplay });
      i = bestEnd + 1;
    } else {
      merged.push(t);
      i++;
    }
  }

  return { tokens: merged, currentRaw };
}

function itemTextBlobs(item) {
  const blobs = [];
  if (item.kind === "user") {
    blobs.push(item.name, item.username, item.description, item.location);
    (item.genres || []).forEach((g) => blobs.push(g));
    (item.preferences || []).forEach((p) => blobs.push(p));
  } else if (item.kind === "event") {
    blobs.push(item.title, item.description, item.location, item.venueName);
    (item.genres || []).forEach((g) => blobs.push(g));
  }
  return blobs.map(norm).filter(Boolean);
}

function satisfiesTokenStrict(item, token) {
  const v = norm(token.value);
  if (token.type === "user") {
    return (
      norm(item.name || "").includes(v) || norm(item.username || "") === v
    );
  }
  if (token.type === "genre") {
    const arr = (item.genres || []).map(norm);
    return arr.some((g) => g.includes(v));
  }
  if (token.type === "pref") {
    const arr = (item.preferences || []).map(norm);
    return arr.some((p) => p.includes(v));
  }
  if (token.type === "event") {
    return norm(item.title || item.venueName || item.location || "").includes(v);
  }
  if (token.type === "free") {
    return itemTextBlobs(item).some((t) => t.includes(v));
  }
  return false;
}

function similarityScore(item, token) {
  const v = token.value;
  if (!v) return 0;
  const texts = itemTextBlobs(item);
  let best = 0;
  for (const t of texts) best = Math.max(best, dice(v, t));
  return best;
}

// ---- componentă --------------------------------------------------------------
export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1) Citește q + type din URL și setează interogarea inițială
  const [rawQuery, setRawQuery] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = (params.get("q") || "").trim();
    const type = (params.get("type") || "").trim(); // genre | pref | user | event
    if (!qParam) {
      setRawQuery("");
      return;
    }
    const pref = TOKEN_TYPES[type] || "";
    const composed = pref ? `${pref}${qParam} ` : qParam;
    setRawQuery(composed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const { tokens } = useMemo(() => parseQuery(rawQuery), [rawQuery]);
  const [page, setPage] = useState(1);

  // 2) sincronizează inputul în URL cu debounce 500ms (ca să nu-ți reseteze pagina la fiecare tastă)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const qForUrl = rawQuery.trim();
      const params = new URLSearchParams(location.search);
      params.set("q", qForUrl);
      params.delete("type");
      const next = `?${params.toString()}`;
      if (next !== location.search) {
        navigate({ pathname: "/search", search: next }, { replace: true });
      }
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const userData = userSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.type === "artist" || u.type === "location")
          .map((u) => ({
            kind: "user",
            id: u.id,
            name: u.name || u.displayName || "",
            username: u.username || "",
            description: u.bio || u.description || "",
            location: u.city || u.location || "",
            type: u.type, // artist | location
            photoURL: u.photoURL,
            genres: Array.isArray(u.genres) ? u.genres : [],
            preferences: Array.isArray(u.preferences) ? u.preferences : [],
          }));

        let eventData = [];
        try {
          const evSnap = await getDocs(collection(db, "events"));
          eventData = evSnap.docs.map((d) => ({
            kind: "event",
            id: d.id,
            title: d.data().title || "",
            description: d.data().description || "",
            date: d.data().date || null,
            location: d.data().location || "",
            venueName: d.data().venueName || "",
            cover: d.data().cover || "",
            genres: Array.isArray(d.data().genres) ? d.data().genres : [],
          }));
        } catch {
          // colecție inexistentă -> ignorăm
        }

        setUsers(userData);
        setEvents(eventData);
      } catch (err) {
        console.error("Eroare la încărcare:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ---- SUGESTII (include GENRES chiar și fără prefix) -----------------------
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    const last = rawQuery.split(/\s+/).pop() || "";
    const prefix = last[0];
    const type = TYPE_BY_PREFIX[prefix]; // poate fi undefined
    const needle = norm(type ? last.slice(1) : last);

    // dacă nu scrie nimic, ascunde sugestiile
    if (!needle) {
      setSuggestions([]);
      return;
    }

    // surse de sugestii:
    // - pentru genre -> din GENRES_LIST;
    // - fără prefix -> tot genuri, ca UX „smart”;
    // - pentru user/pref/event păstrăm logica inițială, dar prioritatea cerută e GENRES.
    let values = [];

    if (!type || type === "genre") {
      values = GENRES_LIST.slice();
    } else if (type === "user") {
      values = users.map((u) => u.name).filter(Boolean);
    } else if (type === "pref") {
      values = users.flatMap((u) => u.preferences || []);
    } else if (type === "event") {
      values = events.map((e) => e.title).filter(Boolean);
    }

    const uniq = Array.from(
      new Set(
        values
          .map((v) => v?.toString?.() || "")
          .filter(Boolean)
      )
    );

    const filtered =
      uniq
        .map((v) => ({ v, sc: Math.max(dice(needle, norm(v)), 0) }))
        .filter((x) => x.sc > 0.2 || norm(x.v).includes(needle))
        .sort((a, b) => b.sc - a.sc || a.v.localeCompare(b.v))
        .slice(0, 10)
        .map((x) => x.v);

    setSuggestions(filtered);
  }, [rawQuery, users, events]);

  const applySuggestion = (s) => {
    const parts = rawQuery.trimRight().split(/\s+/);
    const last = parts[parts.length - 1] || "";
    const hasPrefix = !!TYPE_BY_PREFIX[last[0]];

    // dacă ultimul token are prefix, îl păstrăm; altfel, forțăm prefix de gen ">"
    const prefix = hasPrefix ? last[0] : ">";
    parts[parts.length - 1] = `${prefix}${s}`;
    const next = parts.join(" ") + " ";
    setRawQuery(next);
  };

  const removeToken = (idx) => {
    const parts = rawQuery.split(/\s+/).filter(Boolean);
    let k = -1;
    const filtered = parts.filter((p) => {
      const isTok = TYPE_BY_PREFIX[p[0]];
      if (isTok) {
        k++;
        return k !== idx;
      }
      return true;
    });
    setRawQuery(filtered.join(" ") + " ");
  };

  // ---- FILTRARE + SCORING ---------------------------------------------------
  const allItems = useMemo(() => [...users, ...events], [users, events]);

  const scored = useMemo(() => {
    const activeTokens = parseQuery(rawQuery).tokens;
    if (activeTokens.length === 0) {
      return allItems
        .map((it) => ({ item: it, allMatch: false, score: 0 }))
        .sort((a, b) =>
          (a.item.kind + norm(a.item.name || a.item.title || "")).localeCompare(
            b.item.kind + norm(b.item.name || b.item.title || "")
          )
        );
    }

    return allItems
      .map((item) => {
        let strictHits = 0;
        let softSum = 0;
        for (const t of activeTokens) {
          if (satisfiesTokenStrict(item, t)) strictHits++;
          else softSum += similarityScore(item, t);
        }
        const allMatch = strictHits === activeTokens.length;
        const score = allMatch
          ? 1000 + activeTokens.length
          : strictHits * 10 + softSum / activeTokens.length;
        return { item, allMatch, score };
      })
      .filter((x) => x.score > 0 || x.allMatch)
      .sort((a, b) => {
        if (a.allMatch !== b.allMatch) return a.allMatch ? -1 : 1;
        return b.score - a.score;
      });
  }, [rawQuery, allItems]);

  useEffect(() => setPage(1), [rawQuery]);

  const totalPages = Math.max(1, Math.ceil(scored.length / PAGE_SIZE));
  const pageSlice = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- card renderer (același layout / mărime fixă) -------------------------
  const renderCard = ({ item, allMatch }) => {
    const isUser = item.kind === "user";
    const title = isUser ? (item.name || "Profil") : (item.title || "Eveniment");
    const subtitle = isUser
      ? (item.location || "—")
      : (item.venueName || item.location || "—");
    const badgeText = isUser ? item.type : "event";
    const imgSrc =
      (isUser ? item.photoURL : item.cover) ||
      (isUser
        ? `https://placehold.co/800x450?text=${encodeURIComponent(item.type || "user")}`
        : `https://placehold.co/800x450?text=Event`);

    const href = isUser ? `/user/${item.id}` : `/event/${item.id}`;
    const tags = (item.genres || []).slice(0, 3);

    return (
      <li key={`${item.kind}-${item.id}`} className="h-full">
        <Link
          to={href}
          className="group block h-full bg-white text-black rounded-xl overflow-hidden shadow-lg hover:shadow-violet-400 hover:scale-[1.01] transition"
        >
          {/* imagine 16:9 */}
          <div className="w-full aspect-[16/9] overflow-hidden bg-gray-100">
            <img
              src={imgSrc}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>

          {/* conținut – înălțime egală */}
          <div className="p-4 flex flex-col h-[210px]">
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  isUser
                    ? "bg-pink-100 text-pink-700"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                {badgeText}
              </span>
              {allMatch && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  potrivire completă
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold mt-2 line-clamp-1">{title}</h2>
            <p className="text-xs text-gray-600 line-clamp-1">{subtitle}</p>

            <p className="text-gray-700 text-sm mt-2 line-clamp-2">
              {item.description}
            </p>

            <div className="flex-1" />

            <div className="mt-3 flex gap-2 flex-wrap">
              {tags.map((g) => (
                <span
                  key={g}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-100"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </li>
    );
  };

  // ---- render ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-white md:px-4 md:py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Căutare</h1>

        {/* bara de căutare */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="ex: @mihai >techno #room5 <club"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="w-full px-12 py-3 rounded-full border border-violet-600 text-white placeholder-gray-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500 w-5 h-5" />
        </div>

        {/* chips pentru token-urile active */}
        {tokens.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tokens.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-violet-600 bg-black/40 px-3 py-1 text-sm"
              >
                <span className="opacity-80">
                  {t.type === "genre" ? ">" : TOKEN_TYPES[t.type] || ""}
                  {t.value}
                </span>
                <button
                  onClick={() => removeToken(i)}
                  className="hover:text-pink-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* sugestii autocomplete (din GENRES + altele în funcție de context) */}
        {suggestions.length > 0 && (
          <ul className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  onClick={() => applySuggestion(s)}
                  className="w-full text-left bg-white text-black rounded-xl px-3 py-2 hover:shadow-lg transition"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* rezultate */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pageSlice.length > 0 ? (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageSlice.map(({ item, allMatch }) =>
                renderCard({ item, allMatch })
              )}
            </ul>

            {/* paginare */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-full border border-white/30 disabled:opacity-40"
              >
                &larr; Înapoi
              </button>
              <span className="text-sm opacity-80">
                Pagina {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-full border border-white/30 disabled:opacity-40"
              >
                Înainte &rarr;
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-300 mt-10">
            <p className="mb-3">Nimic găsit pentru interogarea ta.</p>
            <p className="text-sm opacity-80">
              Sugestie: încearcă un gen (ex: <code>&gt;house</code>), un user (ex: <code>@andrei</code>) sau un eveniment (ex: <code>#room5</code>).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
