// components/profilepage/AvailabilityCalendar.jsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../src/firebase";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const asDate = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

const inRange = (day, from, to) => {
  const x = startOfDay(day).getTime();
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return x >= a && x <= b;
};

const eachDayInRange = (from, to) => {
  const days = [];
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    days.push(new Date(cur));
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

export default function AvailabilityCalendar({
  userId,
  mode = "booking", // "owner" | "booking"
  selectedRange,
  onSelectRange,
}) {
  const [slots, setSlots] = useState([]);
  const [focusedDay, setFocusedDay] = useState(null);
  const [rangeError, setRangeError] = useState(""); // optional UX message

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "availability"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
      setSlots(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);

  // Normalize slots
  const normalizedSlots = useMemo(() => {
    return slots
      .map((s) => {
        const from = asDate(s.from);
        const to = asDate(s.to || s.from);
        if (!from || !to) return null;
        const a = from <= to ? from : to;
        const b = from <= to ? to : from;
        return { ...s, from: a, to: b };
      })
      .filter(Boolean);
  }, [slots]);

  // Day info (busy/free)
  const getDayInfo = (day) => {
    if (!day) return { status: "none", matches: [] };

    const matches = normalizedSlots.filter((s) => inRange(day, s.from, s.to));
    const busyMatches = matches.filter(
      (m) => m.status === "booked" || m.status === "blocked"
    );
    if (busyMatches.length > 0) return { status: "busy", matches: busyMatches };

    const freeMatches = matches.filter((m) => m.status === "available");
    if (freeMatches.length > 0) return { status: "free", matches: freeMatches };

    // fără slot => considerăm liber
    return { status: "free", matches: [] };
  };

  const focusedInfo = useMemo(
    () => getDayInfo(focusedDay),
    [focusedDay, normalizedSlots]
  );

  // ✅ Build busy/free day sets + modifiers
  const { busyDaysSet, modifiers } = useMemo(() => {
    const busySet = new Set();
    const freeSet = new Set();

    const addRange = (from, to, set) => {
      for (const d of eachDayInRange(from, to)) {
        set.add(startOfDay(d).toISOString());
      }
    };

    for (const s of normalizedSlots) {
      if (s.status === "booked" || s.status === "blocked") addRange(s.from, s.to, busySet);
      if (s.status === "available") addRange(s.from, s.to, freeSet);
    }

    // busy > free
    for (const k of busySet) freeSet.delete(k);

    return {
      busyDaysSet: busySet,
      modifiers: {
        busy: Array.from(busySet).map((k) => new Date(k)),
        free: Array.from(freeSet).map((k) => new Date(k)),
      },
    };
  }, [normalizedSlots]);

  // ✅ Disable busy days in booking mode
  const disabled = useMemo(() => {
    if (mode === "owner") return [];
    return (date) => busyDaysSet.has(startOfDay(date).toISOString());
  }, [mode, busyDaysSet]);

  // ✅ IMPORTANT: prevent selecting ranges that include busy days
  const handleSelectRange = (range) => {
    setRangeError("");

    // clear
    if (!range?.from) {
      onSelectRange?.({ from: null, to: null });
      return;
    }

    // start only (user picked first click)
    if (range.from && !range.to) {
      // dacă user a dat click pe busy (în owner mode ar putea), blocăm în booking
      if (mode !== "owner" && busyDaysSet.has(startOfDay(range.from).toISOString())) {
        setRangeError("Ziua selectată este ocupată.");
        onSelectRange?.({ from: null, to: null });
        return;
      }
      onSelectRange?.(range);
      return;
    }

    // full range
    const from = range.from;
    const to = range.to;

    // owner poate face orice; booking nu poate include busy
    if (mode !== "owner") {
      const days = eachDayInRange(from, to);
      const busyInside = days.find((d) => busyDaysSet.has(startOfDay(d).toISOString()));

      if (busyInside) {
        // ❌ refuzăm intervalul: păstrăm doar start day
        setFocusedDay(busyInside);
        setRangeError("Intervalul ales include zile ocupate. Alege un capăt care nu traversează roșu.");
        onSelectRange?.({ from, to: from });
        return;
      }
    }

    onSelectRange?.(range);
  };

  const formatSlotRange = (slot) => {
    const f = slot.from.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const t = slot.to.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return f === t ? f : `${f} — ${t}`;
  };

  // calendar background red if focused day is busy
  const calendarIsRed = focusedInfo.status === "busy";

  return (
    <div className={"bm-calendar " + (calendarIsRed ? "bm-calendar-busy-bg" : "bm-calendar-normal-bg")}>
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={handleSelectRange}
        disabled={disabled}
        modifiers={modifiers}
        onDayClick={(day) => setFocusedDay(day)}
        modifiersClassNames={{
          free: "bm-day-free",
          busy: "bm-day-busy",
          range_start: "bm-range-start",
          range_end: "bm-range-end",
          range_middle: "bm-range-middle",
        }}
        weekStartsOn={1}
      />

      {rangeError && (
        <div className="mt-3 text-sm text-red-300">
          {rangeError}
        </div>
      )}

      {/* Detalii zi selectată */}
      <div className="mt-4 rounded-2xl border border-zinc-800 p-3">
        <div className="text-sm text-gray-400">
          Zi selectată:{" "}
          <span className="text-gray-200 font-semibold">
            {focusedDay
              ? focusedDay.toLocaleDateString("ro-RO", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "— (dă click pe o zi)"}
          </span>
        </div>

        {focusedDay && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={
                  "text-xs font-semibold uppercase px-2 py-1 rounded-full " +
                  (focusedInfo.status === "busy"
                    ? "bg-red-900 text-red-300"
                    : "bg-emerald-900 text-emerald-300")
                }
              >
                {focusedInfo.status === "busy" ? "ocupat" : "liber"}
              </span>

              {focusedInfo.status === "free" && focusedInfo.matches.length === 0 && (
                <span className="text-xs text-gray-400">Zi liberă (fără eveniment)</span>
              )}
            </div>

            {focusedInfo.matches.length > 0 && (
              <div className="mt-3 space-y-2">
                {focusedInfo.matches.map((s) => (
                  <div key={s.id} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-sm">
                        {s.title ||
                          (s.status === "booked"
                            ? "Eveniment"
                            : s.status === "blocked"
                            ? "Blocare"
                            : "Disponibil")}
                      </div>
                      <span
                        className={
                          "text-[11px] font-semibold uppercase px-2 py-1 rounded-full " +
                          (s.status === "booked" || s.status === "blocked"
                            ? "bg-red-900 text-red-300"
                            : "bg-emerald-900 text-emerald-300")
                        }
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      Perioadă: {formatSlotRange(s)}
                    </div>

                    {s.notes && <div className="text-xs text-gray-400 mt-2">{s.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .bm-calendar { border-radius: 24px; padding: 8px; transition: background 150ms ease, border-color 150ms ease; }
        .bm-calendar-normal-bg { background: rgba(0,0,0,0); }
        .bm-calendar-busy-bg { background: rgba(239, 68, 68, 0.10); border: 1px solid rgba(239, 68, 68, 0.25); }

        /* FREE = green */
        .bm-calendar .bm-day-free:not(.rdp-day_disabled) {
          background: rgba(16, 185, 129, 0.22);
          color: white;
          border-radius: 12px;
        }

        /* BUSY = red */
        .bm-calendar .bm-day-busy:not(.rdp-day_disabled) {
          background: rgba(239, 68, 68, 0.22);
          color: white;
          border-radius: 12px;
        }

        .bm-calendar .rdp-day_disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* range overlay: outline only */
        .bm-calendar .bm-range-middle { outline: 2px solid rgba(168, 85, 247, 0.55); border-radius: 0; }
        .bm-calendar .bm-range-start,
        .bm-calendar .bm-range-end { outline: 2px solid rgba(168, 85, 247, 0.9); border-radius: 12px; }
      `}</style>
    </div>
  );
}
