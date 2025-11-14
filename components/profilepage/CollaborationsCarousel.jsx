import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../Button";
import { useTranslation } from "react-i18next";

/* ---------------- Demo data ---------------- */
const DEMO_ITEMS = [
  { id: "loc-a", name: "Club Aurora" },
  { id: "loc-b", name: "Bar Selene" },
  { id: "loc-c", name: "Cafe Neon" },
  { id: "loc-d", name: "The Warehouse" },
  { id: "loc-e", name: "Rooftop 27" },
  { id: "loc-f", name: "Subground" },
  { id: "loc-g", name: "Luna Lounge" },
  { id: "loc-h", name: "MUSE" },
];

const fallbackAvatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "Locație"
  )}&background=111827&color=fff`;

/* ---------------- Component ---------------- */
export default function CollaborationsCarousel({
  title = null,
  items = [],
  useDemoWhenEmpty = true,
}) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const src = items?.length ? items : useDemoWhenEmpty ? DEMO_ITEMS : [];
    return src.map((it, i) => ({
      id: it.id ?? `tmp-${i}`,
      name: String(it.name || t("collab.unknown_location")),
      photo: it.photo || fallbackAvatar(it.name),
      href: it.href,
    }));
  }, [items, useDemoWhenEmpty, t]);

  const scrollerRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const can = el.scrollWidth > el.clientWidth + 2;
    setCanScroll(can);
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    measure();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    window.addEventListener("resize", measure);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data.length]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(160, Math.round(el.clientWidth * 0.8)),
      behavior: "smooth",
    });
  };

  if (!data.length) {
    return <p className="text-sm text-gray-400">{t("collab.no_collabs")}</p>;
  }

  return (
    <section className="relative rounded-2xl border border-neutral-800 bg-black p-3 text-white">
      {title && <h4 className="text-lg font-semibold mb-2">{title}</h4>}

      {/* Edge fades – show only when needed; use dark gradient so no white line remains */}
      {canScroll && !atStart && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-black/80 to-transparent rounded-l-2xl" />
      )}
      {canScroll && !atEnd && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-black/80 to-transparent rounded-r-2xl" />
      )}

      <div
        ref={scrollerRef}
        className="flex gap-5 overflow-x-auto scroll-smooth no-scrollbar py-2 pl-1 pr-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {data.map((it) => {
          const Card = it.href ? "a" : "div";
          const cardProps = it.href ? { href: it.href } : {};
          return (
            <Card
              key={it.id}
              {...cardProps}
              className="w-36 flex-shrink-0 text-center"
              style={{ scrollSnapAlign: "start" }}
              title={it.name}
            >
              <div className="mx-auto h-40 w-40 rounded-full bg-[#0f172a] ring-1 ring-white/10 overflow-hidden shadow">
                <img
                  src={it.photo}
                  alt={it.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="mt-3 text-base font-semibold truncate">{it.name}</div>
              {/* rating / text slots pot fi adăugate aici */}
            </Card>
          );
        })}
      </div>

      {canScroll && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-1 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/80 text-white border border-white/10"
            onClick={() => scrollByDir(-1)}
            aria-label={t("collab.back")}
            disabled={atStart}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-1 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/80 text-white border border-white/10"
            onClick={() => scrollByDir(1)}
            aria-label={t("collab.forward")}
            disabled={atEnd}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}
    </section>
  );
}
