// pages/ProfilesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useLoading as useGlobalLoading } from "../context/LoadingContext";
import FilterSidebarModern from "../components/profiles/FilterSidebarModern";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/uiux/dialog";

import ProfileCard from "../components/profiles/ProfileCard";
import SkeletonCard from "../components/profiles/SkeletonCard";
import { useTranslation } from "react-i18next";

const PER_PAGE = 10;
const SORT_OPTIONS = ["newest", "oldest", "rating_desc", "distance_asc", "price_asc", "price_desc"];
const SORT_SET = new Set(SORT_OPTIONS);

let USERS_CACHE = null;
let USERS_TOTAL = null;

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

  const [profiles, setProfiles] = useState(USERS_CACHE || []);
  const [loading, setLoading] = useState(!USERS_CACHE);
  const [filter, setFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const sortFromUrl = searchParams.get("sort");
  const initialSort = SORT_SET.has(sortFromUrl) ? sortFromUrl : "newest";
  const [sortOrder, setSortOrder] = useState(initialSort);

  const page = Math.max(1, Number(pageParam) || 1);
  const [userPos, setUserPos] = useState(null);

  const [artistFilters, setArtistFilters] = useState({
    maxDistanceKm: "",
    minRating: 0,
    budgetTo: "",
    verifiedOnly: false,
  });

  const [venueFilters, setVenueFilters] = useState({
    capacityFrom: "",
    capacityTo: "",
    maxDistanceKm: "",
    budgetFrom: "",
    budgetTo: "",
    verifiedOnly: false,
    types: [],
  });

  useEffect(() => {
    (async () => {
      startLoading();
      try {
        const snap = await getDocs(collection(db, "users"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProfiles(data);
        USERS_CACHE = data;
        USERS_TOTAL = data.length;
      } finally {
        setLoading(false);
        stopLoading();
      }
    })();
  }, []);

  const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

  const filteredSorted = useMemo(() => {
    let list = profiles.filter((p) => (filter === "all" ? true : p.type === filter));

    const sorted = [...list].sort((a, b) => {
      const getDate = (v) => (typeof v?.toDate === "function" ? v.toDate().getTime() : new Date(v).getTime());
      switch (sortOrder) {
        case "oldest": return getDate(a.createdAt) - getDate(b.createdAt);
        case "rating_desc": return (b?.rating ?? 0) - (a?.rating ?? 0);
        case "price_asc": return (a?.price ?? Infinity) - (b?.price ?? Infinity);
        case "price_desc": return (b?.price ?? -Infinity) - (a?.price ?? -Infinity);
        default: return getDate(b.createdAt) - getDate(a.createdAt);
      }
    });
    return sorted;
  }, [profiles, filter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
  const startIdx = (page - 1) * PER_PAGE;
  const pageItems = filteredSorted.slice(startIdx, startIdx + PER_PAGE);

  const withSortQS = (basePath) => {
    const sp = new URLSearchParams(location.search);
    sp.set("sort", sortOrder);
    return `${basePath}?${sp.toString()}`;
  };

  const handleSortChange = (e) => {
    const next = e.target.value;
    if (!SORT_SET.has(next)) return;
    setSortOrder(next);
    navigate(`/discover/1?sort=${next}`, { replace: true });
  };

  const goPrev = () => page > 1 && navigate(withSortQS(`/discover/${page - 1}`));
  const goNext = () => page < totalPages && navigate(withSortQS(`/discover/${page + 1}`));

  return (
    <div className="flex flex-col md:flex-row p-4 md:p-6 gap-6 bg-black min-h-screen text-white">
      {/* ===== Sidebar filtre ===== */}
      <div className="hidden md:block min-w-[250px] max-w-[400px] bg-[#0a0a0a] rounded-xl border border-white/10">
        <FilterSidebarModern
          filter={filter}
          sortOrder={sortOrder}
          onFilterChange={(e) => setFilter(e.target.value)}
          onSortChange={handleSortChange}
        />
      </div>

      {/* ===== Conținut principal ===== */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Sortare + paginație top */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="appearance-none px-3 py-2 pr-8 rounded-xl border border-white/15 bg-black text-white text-sm font-medium"
            aria-label={t("profiles.sort.aria")}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "newest" ? t("profiles.sort.newest")
                  : opt === "oldest" ? t("profiles.sort.oldest")
                  : opt === "rating_desc" ? t("profiles.sort.rating_desc")
                  : opt === "price_asc" ? t("profiles.sort.price_asc")
                  : opt === "price_desc" ? t("profiles.sort.price_desc")
                  : opt}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={goPrev}
              disabled={page <= 1}
              className="px-3 py-2 border border-white/20 rounded-xl"
              aria-label={t("profiles.pagination.prev")}
              title={t("profiles.pagination.prev")}
            >
              ←
            </button>
            <span className="text-xs text-white/70">
              {t("profiles.pagination.page_of", { page, total: totalPages })}
            </span>
            <button
              onClick={goNext}
              disabled={page >= totalPages}
              className="px-3 py-2 border border-white/20 rounded-xl"
              aria-label={t("profiles.pagination.next")}
              title={t("profiles.pagination.next")}
            >
              →
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex flex-col gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            pageItems.map((p) => <ProfileCard key={p.id} profile={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
