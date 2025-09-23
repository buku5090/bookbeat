import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection, query, where, orderBy, limit as qLimit,
  startAfter, getDocs, getCountFromServer
} from "firebase/firestore";
import { db } from "../src/firebase";

const PER_PAGE = 10;

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState("all");          // all | artist | location
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cursors, setCursors] = useState([]); // last doc per page

  // dacă lipsește indexul pentru (type in, createdAt), folosim fallback client-side
  const [useClientMerge, setUseClientMerge] = useState(false);

  const direction = sortOrder === "newest" ? "desc" : "asc";

  // helpers
  const createdAtMs = (row) => {
    const v = row?.createdAt;
    if (!v) return 0;
    if (typeof v.toDate === "function") return v.toDate().getTime();
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  };

  // constraints pentru query normal
  const qc = useMemo(() => {
    const wheres = [];
    if (filter === "artist") wheres.push(where("type", "==", "artist"));
    else if (filter === "location") wheres.push(where("type", "==", "location"));
    else wheres.push(where("type", "in", ["artist", "location"]));
    const ord = orderBy("createdAt", direction);
    return { wheres, ord };
  }, [filter, direction]);

  // COUNT — cu fallback dacă lipseste indexul
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const col = collection(db, "users");
        // încerc count cu wheres; dacă e "all" nu are nevoie de orderBy
        const cnt = await getCountFromServer(query(col, ...qc.wheres));
        if (!alive) return;
        setTotalCount(cnt.data().count || 0);
        setTotalPages(Math.max(1, Math.ceil((cnt.data().count || 0) / PER_PAGE)));
        // dacă înainte am fost pe fallback, încearcă să revii pe server
        setUseClientMerge(false);
      } catch (err) {
        // dacă e index missing pe "in", facem două count-uri și le adunăm
        console.warn("count fallback:", err?.code || err);
        if (!alive) return;
        if (filter === "all") {
          try {
            const col = collection(db, "users");
            const a = await getCountFromServer(query(col, where("type", "==", "artist")));
            const l = await getCountFromServer(query(col, where("type", "==", "location")));
            const count = (a.data().count || 0) + (l.data().count || 0);
            setTotalCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / PER_PAGE)));
            setUseClientMerge(true);
          } catch (e2) {
            console.error("count error:", e2);
            setTotalCount(0);
            setTotalPages(1);
          }
        } else {
          setTotalCount(0);
          setTotalPages(1);
        }
      }
    })();

    // reset paginare când schimb filtrul
    setPage(1);
    setCursors([]);
    return () => { alive = false; };
  }, [filter]); // sortarea nu schimbă totalul

  // FETCH pagina curentă
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const col = collection(db, "users");

        // === VARIANTA NORMALĂ (server-side paging) ===
        if (!(useClientMerge && filter === "all")) {
          let q = query(col, ...qc.wheres, qc.ord, qLimit(PER_PAGE));
          if (page > 1 && cursors[page - 2]) {
            q = query(col, ...qc.wheres, qc.ord, startAfter(cursors[page - 2]), qLimit(PER_PAGE));
          }
          const snap = await getDocs(q);
          if (!alive) return;
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProfiles(docs);
          const lastDoc = snap.docs[snap.docs.length - 1] || null;
          setCursors((prev) => {
            const copy = [...prev];
            copy[page - 1] = lastDoc;
            return copy;
          });
          setLoading(false);
          return;
        }

        // === FALLBACK (index lipsă) — unesc două query-uri și paginez în memorie ===
        // luăm suficient pentru a acoperi pagina curentă
        const take = PER_PAGE * page;
        const qa = query(col, where("type", "==", "artist"), orderBy("createdAt", direction), qLimit(take));
        const ql = query(col, where("type", "==", "location"), orderBy("createdAt", direction), qLimit(take));
        const [sa, sl] = await Promise.all([getDocs(qa), getDocs(ql)]);

        if (!alive) return;

        const merged = [...sa.docs, ...sl.docs]
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            direction === "desc" ? createdAtMs(b) - createdAtMs(a) : createdAtMs(a) - createdAtMs(b)
          );

        const start = (page - 1) * PER_PAGE;
        const slice = merged.slice(start, start + PER_PAGE);
        setProfiles(slice);
        setLoading(false);
      } catch (err) {
        console.error("Eroare la încărcarea profilurilor:", err);
        if (!alive) return;
        // dacă a picat din cauza indexului, activez fallback
        if (filter === "all" && (err?.code === "failed-precondition" || /index/i.test(err?.message || ""))) {
          setUseClientMerge(true);
        }
        setProfiles([]);
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [page, qc.wheres, qc.ord, useClientMerge, filter, direction, cursors]);

  // sortarea resetează pagina & cursori
  useEffect(() => {
    setPage(1);
    setCursors([]);
  }, [sortOrder]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Dropdown value={filter} onChange={setFilter} options={[
            {value:"all", label:"Toate"},
            {value:"artist", label:"Artiști"},
            {value:"location", label:"Locații"},
          ]}/>
          <Dropdown value={sortOrder} onChange={setSortOrder} options={[
            {value:"newest", label:"Cele mai noi"},
            {value:"oldest", label:"Cele mai vechi"},
          ]}/>
        </div>
        <div className="text-sm text-white/70">
          {loading ? "Se încarcă…" : `${totalCount} rezultate`}
          {useClientMerge && filter === "all" && (
            <span className="ml-2 text-white/40">(fallback fără index)</span>
          )}
        </div>
      </div>

      {/* Listă */}
      {loading ? (
        <SkeletonList />
      ) : profiles.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {profiles.map(({ id, name, stageName, type, photoURL }) => {
            const title = stageName || name || "Profil";
            const chip =
              type === "artist"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200";
            const label = (type || "user").toUpperCase();
            const placeholder = `https://placehold.co/160x160?text=${encodeURIComponent(label)}`;
            const imageSrc = photoURL || placeholder;

            return (
              <li key={id} className="rounded-2xl overflow-hidden bg-white text-black shadow-sm ring-1 ring-black/10 hover:shadow-md hover:ring-black/20 transition">
                <Link to={`/user/${id}`} className="flex items-center gap-4 sm:gap-6 p-4 sm:p-5">
                  <img
                    src={imageSrc}
                    alt={title}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholder;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold truncate">{title}</h3>
                      {type && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${chip}`}>
                          {type === "artist" ? "Artist" : "Locație"}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="hidden sm:inline text-violet-600 font-medium">Vezi profilul →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
          className={`px-4 py-2 rounded-full border transition ${
            canPrev ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
          }`}
        >
          ← Înapoi
        </button>

        <div className="text-sm text-white/80">
          Pagina {totalPages === 0 ? 1 : page} din {Math.max(1, totalPages)}
        </div>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={!canNext}
          className={`px-4 py-2 rounded-full border transition ${
            canNext ? "border-white/30 text-white hover:bg-white/10" : "border-white/10 text-white/40 cursor-not-allowed"
          }`}
        >
          Înainte →
        </button>
      </div>

      <p className="mt-3 text-xs text-white/40">
        * Ideal: creează index compus Firestore pentru (type IN ['artist','location'], createdAt {direction}).
        Până atunci, folosim fallback client-side pe „Toate”.
      </p>
    </div>
  );
}

/* ===== UI helpers ===== */
function Dropdown({ value, onChange, options }) {
  return (
    <div className="relative w-48">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full px-4 py-2.5 pr-10 rounded-full border border-white/20 bg-black text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/80">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
        <span className="text-2xl">🔎</span>
      </div>
      <h2 className="text-lg font-semibold">Niciun profil găsit</h2>
      <p className="text-sm text-white/70 mt-1">Încearcă alt filtru sau sortare.</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-4 sm:p-5">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/20 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-white/20 animate-pulse rounded" />
              <div className="h-3 w-72 bg-white/20 animate-pulse rounded" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
