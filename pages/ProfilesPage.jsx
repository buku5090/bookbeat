import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link } from "react-router-dom";

const PER_PAGE = 10; // câte profile / pagină

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // dropdown filter & sort
  const [filter, setFilter] = useState("all");      // all | artist | location | user
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest

  // pagination
  const [page, setPage] = useState(1);

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
    return () => {
      mounted = false;
    };
  }, []);

  // normalizare createdAt (Timestamp | string | number | undefined)
  const getDate = (val) => {
    if (!val) return new Date(0);
    if (typeof val?.toDate === "function") return val.toDate();
    if (typeof val === "number") return new Date(val);
    if (typeof val === "string") return new Date(val);
    return new Date(0);
  };

  // filtre + sortare (client-side)
  const filteredSorted = useMemo(() => {
    const filtered = profiles.filter((p) => (filter === "all" ? true : p.type === filter));
    const sorted = filtered.sort((a, b) => {
      const da = getDate(a.createdAt);
      const dbb = getDate(b.createdAt);
      return sortOrder === "oldest" ? da - dbb : dbb - da;
    });
    return sorted;
  }, [profiles, filter, sortOrder]);

  // când schimb filtrul/sortarea => merg pe pagina 1
  useEffect(() => setPage(1), [filter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
  const startIdx = (page - 1) * PER_PAGE;
  const pageItems = filteredSorted.slice(startIdx, startIdx + PER_PAGE);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col md:flex-row p-6 gap-6 bg-black min-h-screen text-white">
      {/* Sidebar – Filtre (dropdown) */}
      <div className="w-full md:w-1/4 bg-black p-4 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">Filtre</h2>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/70">Tip profil</label>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none w-full px-4 py-2 pr-10 rounded-xl border border-violet-600 bg-black text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Toate</option>
                <option value="artist">Artiști</option>
                <option value="location">Locații</option>
                <option value="user">Users</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white">
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
                onChange={(e) => setSortOrder(e.target.value)}
                className="appearance-none w-full px-4 py-2 pr-10 rounded-xl border border-violet-600 bg-black text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="newest">Cele mai noi</option>
                <option value="oldest">Cele mai vechi</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conținut principal */}
      <div className="w-full md:w-3/4 flex flex-col gap-6">
        {/* Rezultate & sort (scurt) */}
        <div className="flex items-center justify-between">
          <div className="text-white/70">{filteredSorted.length} rezultate</div>
        </div>

        {/* Lista */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center items-center w-full h-48">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex items-center justify-center h-48 rounded-xl bg-white/5">
              <div className="text-center">
                <div className="text-lg font-semibold">Niciun profil găsit</div>
                <div className="text-white/60">Încearcă alt filtru sau sortare.</div>
              </div>
            </div>
          ) : (
            pageItems.map(({ id, name, stageName, type, photoURL, avatarUrl }) => {
              const title = stageName || name || "—";
              const label = (type || "profile").toUpperCase();
              const placeholder = `https://placehold.co/120x120?text=${encodeURIComponent(label)}`;
              const imageSrc = photoURL || avatarUrl || placeholder;

              return (
                <Link
                  key={id}
                  to={`/user/${id}`}
                  className="flex items-center gap-6 bg-white text-black p-4 rounded-xl shadow hover:shadow-pink-300 hover:scale-[1.01] transition-transform duration-200"
                >
                  <img
                    src={imageSrc}
                    alt={title}
                    className="w-24 h-24 object-cover rounded-xl border"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholder;
                    }}
                  />
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <span className="text-sm text-pink-500 uppercase">{type || "profile"}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Paginare */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
