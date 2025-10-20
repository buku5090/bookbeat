// components/CollaborationsWithReviews.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../src/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
  startAfter,
} from "firebase/firestore";

import Button from "./Button";
import CollaborationCard from "./CollaborationCard";

/* ---------------- DEMO DATA (fallback când Firestore e gol) ---------------- */

const DEMO_LOCATIONS = [
  { id: "loc_aurora", name: "Club Aurora" },
  { id: "loc_selene", name: "Bar Selene" },
  { id: "loc_neon", name: "Cafe Neon" },
  { id: "loc_warehouse", name: "The Warehouse" },
  { id: "loc_rooftop27", name: "Rooftop 27" },
  { id: "loc_subground", name: "Subground" },
];

const DEMO_EVENTS = [
  { loc: "loc_aurora",    iso: "2025-04-12T21:00:00Z", rl: { r: 5, c: "Energy bună, publicul a rămas până la final." }, ra: { r: 4, c: "Sunet foarte ok, monitorizare clară." } },
  { loc: "loc_selene",    iso: "2025-03-28T22:00:00Z", rl: { r: 4, c: "Set variat, ar mai trebui ridicat puțin volumul." }, ra: { r: 5, c: "Staff prietenos, organizare rapidă." } },
  { loc: "loc_neon",      iso: "2025-03-10T20:30:00Z", rl: { r: 5, c: "Perfect pentru crowd-ul nostru. Revenim!" }, ra: { r: 4, c: "Spațiu cozy, decor reușit." } },
  { loc: "loc_warehouse", iso: "2025-02-14T23:00:00Z", rl: { r: 3, c: "Nice vibe, dar începutul a fost cam liniștit." }, ra: { r: 4, c: "Sistem puternic, puțin ecou în spate." } },
  { loc: "loc_rooftop27", iso: "2025-02-01T19:00:00Z", rl: { r: 5, c: "Golden hour set 🔥" }, ra: { r: 5, c: "Priveliște super, logistică impecabilă." } },
  { loc: "loc_subground", iso: "2025-01-17T23:30:00Z", rl: { r: 4, c: "Public nișat, a livrat pe stilul lor." }, ra: { r: 4, c: "Booth ok, luminile cam puternice." } },
  // repetăm Aurora ca să vezi duplicat în UI
  { loc: "loc_aurora",    iso: "2024-12-20T22:00:00Z", rl: { r: 5, c: "A doua colaborare, la fel de tare!" }, ra: { r: 5, c: "Back-to-back cu rezidentul, a mers brici." } },
  { loc: "loc_aurora",    iso: "2024-11-08T22:00:00Z", rl: null,                                         ra: { r: 4, c: "Prima dată aici, totul ok." } },
];

function buildDemoCollabs(profileUid, side = "artist") {
  const findLoc = (id) => DEMO_LOCATIONS.find((l) => l.id === id) || { id, name: id };
  return DEMO_EVENTS.map((ev, idx) => {
    const loc = findLoc(ev.loc);
    const id = `demo-${idx + 1}`;
    if (side === "artist") {
      return {
        id,
        isDemo: true,
        artistId: profileUid || "demo-artist",
        artistName: "DJ Nova",
        locationId: loc.id,
        locationName: loc.name,
        eventDate: ev.iso,
        pairKey: `${profileUid || "demo-artist"}_${loc.id}`,
        reviewByLocation: ev.rl ? { reviewerId: loc.id, rating: ev.rl.r, comment: ev.rl.c } : null,
        reviewByArtist: ev.ra ? { reviewerId: profileUid || "demo-artist", rating: ev.ra.r, comment: ev.ra.c } : null,
      };
    } else {
      const demoArtistId = `demo-artist-${idx + 1}`;
      const demoArtistName = `Artist Demo ${idx + 1}`;
      return {
        id,
        isDemo: true,
        artistId: demoArtistId,
        artistName: demoArtistName,
        locationId: profileUid || "demo-location",
        locationName: "Locația (demo)",
        eventDate: ev.iso,
        pairKey: `${demoArtistId}_${profileUid || "demo-location"}`,
        reviewByLocation: ev.rl ? { reviewerId: profileUid || "demo-location", rating: ev.rl.r, comment: ev.rl.c } : null,
        reviewByArtist: ev.ra ? { reviewerId: demoArtistId, rating: ev.ra.r, comment: ev.ra.c } : null,
      };
    }
  });
}

/* ---------------- Slider orizontal cu paginare + windowing ---------------- */

export default function CollaborationsWithReviews({
  profileUid,
  side = "artist",
  authUser,
  pageSize = 20,   // câte încărcăm pe pagină din Firestore
  buffer = 4,      // câte carduri extra randăm în stânga/dreapta (windowing)
}) {
  const containerRef = useRef(null);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [usedDemo, setUsedDemo] = useState(false);

  // fallback local
  const demoFallback = useMemo(
    () => buildDemoCollabs(profileUid, side),
    [profileUid, side]
  );

  // ====== FETCH FIRST PAGE ======
  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setUsedDemo(false);

    async function fetchFirst() {
      if (!profileUid) {
        setItems(demoFallback);
        setHasMore(false);
        setUsedDemo(true);
        return;
      }
      setLoading(true);
      try {
        const col = collection(db, "collaborations");
        let qRef = query(
          col,
          where(side === "artist" ? "artistId" : "locationId", "==", profileUid),
          orderBy("eventDate", "desc"),
          qLimit(pageSize)
        );
        const snap = await getDocs(qRef);
        if (cancelled) return;

        if (snap.empty) {
          // fallback demo
          setItems(demoFallback);
          setHasMore(false);
          setUsedDemo(true);
          setCursor(null);
        } else {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setItems(docs);
          setCursor(snap.docs[snap.docs.length - 1]);
          setHasMore(snap.docs.length === pageSize);
        }
      } catch (e) {
        console.error("Collabs fetch error:", e);
        // fallback demo în caz de eroare
        if (!cancelled) {
          setItems(demoFallback);
          setHasMore(false);
          setUsedDemo(true);
          setCursor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFirst();
    return () => { cancelled = true; };
  }, [profileUid, side, pageSize, demoFallback]);

  // ====== LOAD MORE (paginate) ======
  const loadMore = useCallback(async () => {
    if (!profileUid || !hasMore || loading || usedDemo || !cursor) return;
    setLoading(true);
    try {
      const col = collection(db, "collaborations");
      let qRef = query(
        col,
        where(side === "artist" ? "artistId" : "locationId", "==", profileUid),
        orderBy("eventDate", "desc"),
        startAfter(cursor),
        qLimit(pageSize)
      );
      const snap = await getDocs(qRef);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((prev) => [...prev, ...docs]);
      setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor);
      setHasMore(snap.docs.length === pageSize);
    } catch (e) {
      console.error("Collabs loadMore error:", e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [profileUid, side, pageSize, hasMore, loading, usedDemo, cursor]);

  // ====== Slider / scroll + windowing ======
  const ITEM_WIDTH = 176; // px: ~ card + gap (ajustează dacă schimbi stilul)
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // onScroll + resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrollLeft(el.scrollLeft);
        setContainerWidth(el.clientWidth);
        // dacă suntem aproape de capăt, încarcă încă o pagină
        const totalWidth = totalCount * ITEM_WIDTH;
        const nearEnd = el.scrollLeft + el.clientWidth > totalWidth - ITEM_WIDTH * 3;
        if (nearEnd) loadMore();
      });
    };
    const onResize = () => {
      setContainerWidth(el.clientWidth);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // init
    setScrollLeft(el.scrollLeft);
    setContainerWidth(el.clientWidth);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loadMore]); // eslint-disable-line

  const data = items; // (dacă e fallback demo, items este deja demoFallback)
  const totalCount = data.length;

  // windowing (determinăm intervalul vizibil)
  const visibleCount = Math.max(1, Math.ceil((containerWidth || 1) / ITEM_WIDTH) + buffer * 2);
  const startIndex = Math.max(0, Math.floor(scrollLeft / ITEM_WIDTH) - buffer);
  const endIndex = Math.min(totalCount, startIndex + visibleCount);
  const leftPad = startIndex * ITEM_WIDTH;
  const rightPad = Math.max(0, (totalCount - endIndex) * ITEM_WIDTH);

  // ====== logică pentru afișarea butoanelor stânga/dreapta ======
  const totalWidth = totalCount * ITEM_WIDTH;
  const canScroll = totalWidth > (containerWidth || 0) + 1; // există overflow?
  const ATOL = 4; // toleranță px pentru calcule
  const atStart = scrollLeft <= ATOL;
  const atEndNow = scrollLeft + (containerWidth || 0) >= totalWidth - ATOL;
  // „final absolut”: nu mai avem pagini de încărcat și suntem la capătul pistei curente
  const atAbsoluteEnd = !hasMore && atEndNow;

  const showLeft = canScroll && !atStart;
  const showRight = canScroll && !atAbsoluteEnd;

  // ====== butoane slider ======
  const scrollByPage = (dir = 1) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* ascunde bara de scroll vizual (opțional) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="relative">
        {/* buton stânga */}
        {showLeft && (
          <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-10 px-1">
            <Button
              variant="secondary"
              className="pointer-events-auto shadow"
              onClick={() => scrollByPage(-1)}
            >
              ←
            </Button>
          </div>
        )}

        {/* pista orizontală cu windowing */}
        <div
          ref={containerRef}
          className="no-scrollbar overflow-x-auto overflow-y-hidden"
          style={{ paddingBottom: 8 }}
        >
          <div
            className="flex items-stretch"
            style={{ width: Math.max(totalCount * ITEM_WIDTH, containerWidth || 0) }}
          >
            {/* spacer stânga */}
            {leftPad > 0 && <div style={{ width: leftPad, flex: "0 0 auto" }} />}

            {/* elemente vizibile */}
            {data.slice(startIndex, endIndex).map((c) => (
              <div
                key={c.id}
                style={{ width: ITEM_WIDTH, flex: "0 0 auto" }}
                className="px-2"
              >
                <CollaborationCard collab={c} viewerSide={side} authUser={authUser} />
              </div>
            ))}

            {/* spacer dreapta */}
            {rightPad > 0 && <div style={{ width: rightPad, flex: "0 0 auto" }} />}
          </div>
        </div>

        {/* buton dreapta */}
        {showRight && (
          <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-10 px-1">
            <Button
              variant="secondary"
              className="pointer-events-auto shadow"
              onClick={() => scrollByPage(1)}
            >
              →
            </Button>
          </div>
        )}
      </div>

      {/* status / loader */}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        {loading && <span>Se încarcă…</span>}
        {!loading && totalCount === 0 && <span>Nicio colaborare disponibilă.</span>}
        {!usedDemo && !hasMore && totalCount > 0 && <span>Toate colaborările au fost încărcate.</span>}
        {usedDemo && <span>(Demo data)</span>}
      </div>
    </div>
  );
}
