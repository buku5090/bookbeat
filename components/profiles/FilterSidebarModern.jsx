// components/FilterSidebarModern.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function FilterSidebarModern(props) {
  const { t } = useTranslation();

  const {
    filter: filterProp,
    sortOrder: sortProp,
    artistFilters: artistProp,
    venueFilters: venueProp,
    onFilterChange,
    onSortChange,
    setArtistFilters,
    setVenueFilters,
    requestLocation,
    onReset,
    onFiltersChange,
    initialFilter = "all",
    initialSortOrder = "newest",
    initialArtist = { maxDistanceKm: 0, minRating: 0, budgetTo: 0, verifiedOnly: false },
    initialVenue = { capacityFrom: "", capacityTo: "", maxDistanceKm: 0, budgetFrom: "", budgetTo: "", types: [], verifiedOnly: false }
  } = props;

  const [uFilter, setUFilter] = useState(filterProp ?? initialFilter);
  const [uSort, setUSort] = useState(sortProp ?? initialSortOrder);
  const [uArtist, setUArtist] = useState(artistProp ?? initialArtist);
  const [uVenue, setUVenue] = useState(venueProp ?? initialVenue);
  const [venueTypeInput, setVenueTypeInput] = useState("");

  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [myCoords, setMyCoords] = useState(null);
  const [myAddress, setMyAddress] = useState("");

  useEffect(() => { if (filterProp !== undefined) setUFilter(filterProp); }, [filterProp]);
  useEffect(() => { if (sortProp !== undefined) setUSort(sortProp); }, [sortProp]);
  useEffect(() => { if (artistProp !== undefined) setUArtist(artistProp); }, [artistProp]);
  useEffect(() => { if (venueProp !== undefined) setUVenue(venueProp); }, [venueProp]);

  const filter = filterProp !== undefined ? filterProp : uFilter;
  const sortOrder = sortProp !== undefined ? sortProp : uSort;
  const artistFilters = artistProp !== undefined ? artistProp : uArtist;
  const venueFilters = venueProp !== undefined ? venueProp : uVenue;

  const toNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const emitChangeEvt = (handler, value) => {
    if (!handler) return;
    const e = { target: { value }, currentTarget: { value } };
    handler(e);
  };

  const setArtist = (updater) => {
    if (setArtistFilters) return setArtistFilters(updater);
    setUArtist(prev => (typeof updater === "function" ? updater(prev) : updater));
  };

  const setVenue = (updater) => {
    if (setVenueFilters) return setVenueFilters(updater);
    setUVenue(prev => (typeof updater === "function" ? updater(prev) : updater));
  };

  useEffect(() => {
    if (!onFiltersChange) return;
    onFiltersChange({ filter, sortOrder, artistFilters, venueFilters, myCoords, myAddress });
  }, [filter, sortOrder, artistFilters, venueFilters, myCoords, myAddress, onFiltersChange]);

  const handleReset = () => {
    if (onReset) return onReset();
    setUFilter(initialFilter);
    setUSort(initialSortOrder);
    setUArtist(initialArtist);
    setUVenue(initialVenue);
    setVenueTypeInput("");
    setLocError("");
    setLocLoading(false);
    setMyCoords(null);
    setMyAddress("");
  };

  const handleUseLocation = async () => {
    setLocError("");
    setLocLoading(true);
    try {
      if (!("geolocation" in navigator))
        throw new Error(t("filters.location.error"));

      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          err => reject(new Error(err.message || t("filters.location.error"))),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Reverse geocoding failed.");
      const data = await res.json();

      const addr = data?.display_name || `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`;
      setMyCoords(coords);
      setMyAddress(addr);
      requestLocation && requestLocation({ ...coords, address: addr });

    } catch (e) {
      setLocError(e.message || t("filters.location.error"));
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950/60 border border-white/10 backdrop-blur-sm shadow-2xl rounded-2xl">
      
      {/* HEADER */}
      <div className="p-4 border-b border-white/10 relative">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold flex items-center gap-2 text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 8h12M9 12h6M11 16h2"/>
            </svg>
            {t("filters.title")}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            title={t("filters.reset")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 3 3-3M6 9V4m12 14l-3-3 3-3m-3 3h5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="p-4 space-y-5">

        {/* TIP PROFIL */}
        <div className="flex flex-col gap-2">
          <label className="text-white/70 text-sm mb-1">{t("filters.profileType")}</label>
          <div className="flex flex-col gap-1 w-full">
            {[
              { key: "all", label: t("filters.profileType.all") },
              { key: "artist", label: t("filters.profileType.artist") },
              { key: "location", label: t("filters.profileType.location") }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onFilterChange ? emitChangeEvt(onFilterChange, key) : setUFilter(key)}
                className={
                  "w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center transition " +
                  (filter === key
                    ? "bg-violet-600/90 text-white shadow-md"
                    : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* POZIȚIA MEA */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-white/70">{t("filters.position")}</span>

          <button
            type="button"
            onClick={handleUseLocation}
            className="h-10 px-3 rounded-xl border border-white/15 text-white/90 bg-white/5 hover:bg-white/10 text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 11c0 5-8 11-8 11S4 16 4 11a8 8 0 1116 0z"/>
            </svg>
            {locLoading ? t("filters.usingLocation") : t("filters.useLocation")}
          </button>

          {locError && <p className="text-xs text-red-400">{locError}</p>}
        </div>

        {/* FILTRE ARTIST */}
        {filter === "artist" && (
          <div className="space-y-4">
            <Row label={t("filters.artist.distanceMax")}>
              <NumberWithSlider
                min={0}
                max={200}
                step={5}
                value={toNumber(artistFilters?.maxDistanceKm, 0)}
                onChange={(n) => setArtist(s => ({ ...s, maxDistanceKm: n }))}
              />
            </Row>

            <Row label={t("filters.artist.minRating")}>
              <NumberWithSlider
                min={0}
                max={5}
                step={0.5}
                value={toNumber(artistFilters?.minRating, 0)}
                onChange={(n) => setArtist(s => ({ ...s, minRating: n }))}
                checkpoints={[0, 1, 2, 3, 4, 5]}
              />
            </Row>

            <Row label={t("filters.artist.budgetMax")}>
              <NumberWithSlider
                min={0}
                max={10000}
                step={50}
                value={toNumber(artistFilters?.budgetTo, 0)}
                onChange={(n) => setArtist(s => ({ ...s, budgetTo: n }))}
              />
            </Row>

            <Row label={t("filters.artist.verifiedOnly")}>
              <div className="flex justify-end">
                <Switch
                  checked={!!artistFilters?.verifiedOnly}
                  onChange={(v) => setArtist(s => ({ ...s, verifiedOnly: !!v }))}
                />
              </div>
            </Row>
          </div>
        )}

        {/* FILTRE LOCAȚIE */}
        {filter === "location" && (
          <div className="space-y-4">
            <Row label={t("filters.location.capacity")}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="min"
                  value={venueFilters?.capacityFrom ?? ""}
                  onChange={(e) => setVenue(s => ({ ...s, capacityFrom: toNumber(e.target.value, "") }))}
                  className="w-24 h-9 rounded-xl bg-black border border-white/15 text-white/90 px-3"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="max"
                  value={venueFilters?.capacityTo ?? ""}
                  onChange={(e) => setVenue(s => ({ ...s, capacityTo: toNumber(e.target.value, "") }))}
                  className="w-24 h-9 rounded-xl bg-black border border-white/15 text-white/90 px-3"
                />
              </div>
            </Row>

            <Row label={t("filters.location.distanceMax")}>
              <NumberWithSlider
                min={0}
                max={200}
                step={5}
                value={toNumber(venueFilters?.maxDistanceKm, 0)}
                onChange={(n) => setVenue(s => ({ ...s, maxDistanceKm: n }))}
              />
            </Row>

            <Row label={t("filters.location.budget")}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="min"
                  value={venueFilters?.budgetFrom ?? ""}
                  onChange={(e) => setVenue(s => ({ ...s, budgetFrom: toNumber(e.target.value, "") }))}
                  className="w-24 h-9 rounded-xl bg-black border border-white/15 text-white/90 px-3"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="max"
                  value={venueFilters?.budgetTo ?? ""}
                  onChange={(e) => setVenue(s => ({ ...s, budgetTo: toNumber(e.target.value, "") }))}
                  className="w-24 h-9 rounded-xl bg-black border border-white/15 text-white/90 px-3"
                />
              </div>
            </Row>

            <div className="flex flex-col gap-2">
              <label className="text-white/70 text-sm">{t("filters.location.types")}</label>

              <div className="flex flex-wrap gap-2">
                {(venueFilters?.types ?? []).map((tVal, i) => (
                  <span key={i} className="bg-white/5 text-white/90 border border-white/10 px-2.5 py-1 rounded-xl text-sm flex items-center gap-1.5">
                    <span>{tVal}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setVenue(s => ({ ...s, types: (s.types || []).filter((_, idx) => idx !== i) }))
                      }
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={venueTypeInput}
                  onChange={(e) => setVenueTypeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const v = venueTypeInput.trim();
                      if (!v) return;
                      setVenue(s => ({ ...s, types: [...(s.types || []), v] }));
                      setVenueTypeInput("");
                    }
                  }}
                  placeholder={t("filters.location.types.placeholder")}
                  className="h-9 px-3 rounded-xl bg-black border border-white/15 text-white/90 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = venueTypeInput.trim();
                    if (!v) return;
                    setVenue(s => ({ ...s, types: [...(s.types || []), v] }));
                    setVenueTypeInput("");
                  }}
                  className="h-9 px-3 rounded-xl bg-violet-600/90 text-white hover:bg-violet-600"
                >
                  {t("filters.location.types.add")}
                </button>
              </div>
            </div>

            <Row label={t("filters.location.verifiedOnly")}>
              <div className="flex justify-end">
                <Switch
                  checked={!!venueFilters?.verifiedOnly}
                  onChange={(v) => setVenue(s => ({ ...s, verifiedOnly: !!v }))}
                />
              </div>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/70 text-sm">{label}</label>
      <div className="w-full">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(!checked)}
      className={
        "w-12 h-7 rounded-full p-1 transition relative " +
        (checked ? "bg-violet-600" : "bg-white/20")
      }
      role="switch"
      aria-checked={checked}
    >
      <span
        className={
          "block w-5 h-5 bg-white rounded-full shadow transform transition " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}

function NumberWithSlider({ value, onChange, min = 0, max = 100, step = 1, checkpoints, icon }) {
  const [internal, setInternal] = useState(value || 0);
  useEffect(() => { setInternal(value || 0); }, [value]);

  const ticks = useMemo(() => {
    if (Array.isArray(checkpoints) && checkpoints.length) return checkpoints;
    const arr = [];
    const parts = 5;
    for (let i = 0; i <= parts; i++) arr.push(Math.round(min + (i * (max - min)) / parts));
    return arr;
  }, [min, max, checkpoints]);

  return (
    <div className="w-full flex items-center gap-2 column flex-col">
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={internal}
          onChange={(e) => {
            const n = Number(e.target.value);
            setInternal(n);
            onChange && onChange(n);
          }}
          className="w-full h-2 appearance-none bg-white/10 rounded-full outline-none"
        />
        <div className="absolute left-0 right-0 -bottom-1.5 flex justify-between px-[2px]">
          {ticks.map((_, i) => (
            <div key={i} className="w-0.5 h-1 bg-white/40 rounded" />
          ))}
        </div>
      </div>

      <input
        type="number"
        value={internal}
        onChange={(e) => {
          const n = Number(e.target.value);
          setInternal(n);
          if (Number.isFinite(n) && onChange) onChange(n);
        }}
        className="w-24 h-9 rounded-xl bg-black border border-white/15 text-white/90 px-3"
      />
    </div>
  );
}
