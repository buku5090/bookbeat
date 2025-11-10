// components/profiles/ProfileCard.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RatingStars } from "./RatingStars";
import { VerifiedBadge, UnverifiedBadge, NewBadge, TypeBadge } from "./Badges";
import { ChipRow } from "./ChipRow";

/* ================= helpers ================= */
const toChips = (v) =>
  Array.isArray(v)
    ? v.filter(Boolean).slice(0, 8)
    : typeof v === "string" && v.trim()
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

const nf = (n) => new Intl.NumberFormat("ro-RO").format(n);

/** Folosește t() pentru stringuri */
const getArtistTariffLabel = (p, t) => {
  let v =
    p?.rate ??
    p?.price ??
    p?.pricePerSet ??
    p?.tariff ??
    p?.fee ??
    p?.minFee;
  if (v == null) return null;

  const currency = t("pricing.currency");

  if (typeof v === "string") {
    const s = v.trim();
    if (/gratis/i.test(s)) return t("pricing.free");
    const num = Number(s.replace(/[^\d]/g, ""));
    if (Number.isFinite(num))
      return t("pricing.perSet", { amount: nf(num), currency });
    return s;
  }

  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return t("pricing.free");
  return t("pricing.perSet", { amount: nf(n), currency });
};

const getVenueBudgetLabel = (p, t) => {
  const currency = t("pricing.currency");
  const from = Number(p?.budgetFrom ?? p?.minBudget ?? NaN);
  const to = Number(p?.budgetTo ?? p?.maxBudget ?? NaN);

  if (Number.isFinite(from) && Number.isFinite(to))
    return t("pricing.range", { from: nf(from), to: nf(to), currency });
  if (Number.isFinite(from))
    return t("pricing.from", { amount: nf(from), currency });
  if (Number.isFinite(to))
    return t("pricing.to", { amount: nf(to), currency });

  const b = p?.budget ?? p?.price ?? null;
  if (b == null) return null;

  if (typeof b === "string") {
    const s = b.trim();
    if (/gratis/i.test(s)) return t("pricing.free");
    const num = Number(s.replace(/[^\d]/g, ""));
    if (Number.isFinite(num))
      return t("pricing.amount", { amount: nf(num), currency });
    return s;
  }

  const n = Number(b);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return t("pricing.free");
  return t("pricing.amount", { amount: nf(n), currency });
};

const cityFrom = (p) =>
  p?.city || p?.locationCity || p?.location?.city || p?.addressCity || null;

const isNewProfile = (p) => {
  if (p?.isNewAccount) return true;
  const d =
    typeof p?.createdAt?.toDate === "function"
      ? p.createdAt.toDate()
      : new Date(p?.createdAt ?? null);
  if (!d || Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= 3 * 24 * 60 * 60 * 1000;
};

/* ============ UI Components ============ */
function MoneyPill({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-xl px-3 py-1 text-[13px] bg-white/5 border border-white/10 text-white">
      <span className="font-medium">{value}</span>
    </span>
  );
}

function MoneyRow({ type, artistTariff, venueBudget, className = "" }) {
  const isArtist = type === "artist";
  const isLocation = type === "location";
  if ((isArtist && !artistTariff) || (isLocation && !venueBudget)) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {isArtist && artistTariff && <MoneyPill value={artistTariff} />}
      {isLocation && venueBudget && <MoneyPill value={venueBudget} />}
    </div>
  );
}

/* ============ Hook pt. compact mode ============ */
function useCompact(threshold = 520) {
  const ref = useRef(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < threshold);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [threshold]);
  return [ref, compact];
}

/* ======================= CARD ======================= */
export default function ProfileCard({ profile }) {
  const [cardRef, compact] = useCompact(520);
  const { t } = useTranslation();

  const {
    id,
    name,
    type,
    stageName,
    locationName,
    rating = 0,
    photoURL,
    avatarUrl,
  } = profile;

  const title =
    type === "artist"
      ? stageName || name || "—"
      : type === "location"
      ? locationName || name || "—"
      : name || "—";

  const placeholder = `https://placehold.co/120x120?text=${encodeURIComponent(
    (type || "profile").toUpperCase()
  )}`;
  const imageSrc = photoURL || avatarUrl || placeholder;

  const isArtist = type === "artist";
  const isLocation = type === "location";
  const isVerified = !!(profile.verified ?? profile.isVerified ?? false);
  const isNew = isNewProfile(profile);
  const promoted = !!profile.promoted;

  const city = cityFrom(profile);
  const artistTariff = getArtistTariffLabel(profile, t);
  const venueBudget = getVenueBudgetLabel(profile, t);

  // chips
  const prefs = toChips(profile.preferences);
  const gens = toChips(profile.genres);
  const specs = toChips(profile.specializations);
  const locChips = toChips(
    profile.locationTypes ?? profile.venueTypes ?? profile.placeTypes
  );

  const CardShell = ({ children }) =>
    promoted ? (
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <Link
          to={`/user/${id}`}
          className="relative block rounded-t-2xl bg-[#161616] text-white border border-white/10 overflow-hidden"
        >
          {children}
        </Link>
        <div className="text-center py-1.5 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 rounded-b-2xl">
          {t("profile.promoted")}
        </div>
      </div>
    ) : (
      <Link
        to={`/user/${id}`}
        className="block relative rounded-2xl bg-[#161616] text-white border border-white/10 hover:border-white/20 transition-all overflow-hidden"
      >
        {children}
      </Link>
    );

  return (
    <CardShell>
      <div
        ref={cardRef}
        className="relative flex flex-col justify-between h-[180px] sm:h-[210px] overflow-hidden"
      >
        {/* Stânga sus: Nou */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          {isNew && <NewBadge />}
        </div>

        {/* Dreapta sus — bani + verificare (în rânduri separate pe view lat) */}
        {!compact && (
          <>
            <div className="absolute right-3 top-3 z-20">
              <MoneyRow
                type={type}
                artistTariff={artistTariff}
                venueBudget={venueBudget}
              />
            </div>
            <div className="absolute right-3 top-12 z-20">
              {isVerified ? <VerifiedBadge /> : <UnverifiedBadge />}
            </div>
          </>
        )}

        {/* conținut principal */}
        <div
          className={
            compact
              ? "grid grid-cols-[76px_1fr] gap-3 p-3"
              : "grid grid-cols-[110px_1fr] gap-4 p-5"
          }
        >
          {/* imagine */}
          <div
            className={
              compact
                ? "w-[76px] h-[76px] rounded-xl overflow-hidden border border-white/10"
                : "w-[110px] h-[110px] rounded-xl overflow-hidden border border-white/10"
            }
          >
            <img
              src={imageSrc}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.src = placeholder)}
            />
          </div>

          {/* text */}
          <div className="min-w-0 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <h3
                className={`font-semibold tracking-tight truncate ${
                  compact ? "text-[15px]" : "text-lg"
                }`}
              >
                {title}
              </h3>
            </div>

            {/* pe view îngust: bani + (ne)verificat sub titlu */}
            {compact && (
              <div className="mt-1 flex flex-col gap-1">
                <MoneyRow
                  type={type}
                  artistTariff={artistTariff}
                  venueBudget={venueBudget}
                />
                {isVerified ? <VerifiedBadge /> : <UnverifiedBadge />}
              </div>
            )}

            {/* rating • oraș */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-white">
              <RatingStars value={Number(rating) || 0} />
              {city && (
                <div className="text-xs text-white/70 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
                  {city}
                </div>
              )}
            </div>

            {/* chip-uri ARTIST */}
            {isArtist && gens.length > 0 && (
              <div className="mt-2">
                <ChipRow items={gens} />
              </div>
            )}
            {isArtist && (prefs.length > 0 || specs.length > 0) && (
              <div className="mt-2">
                <ChipRow items={[...prefs, ...specs].slice(0, 8)} />
              </div>
            )}

            {/* chip-uri LOCAȚIE */}
            {isLocation && locChips.length > 0 && (
              <div className="mt-2">
                <ChipRow items={locChips} />
              </div>
            )}
          </div>
        </div>

        {/* badge tip */}
        <div className="pointer-events-none absolute right-3 bottom-3 sm:bottom-4 z-20">
          <TypeBadge type={type} />
        </div>
      </div>
    </CardShell>
  );
}


