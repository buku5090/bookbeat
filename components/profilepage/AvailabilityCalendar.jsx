import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../src/firebase";
import {
  collection, addDoc, deleteDoc, doc, getDocs, query, where, Timestamp,
} from "firebase/firestore";
import {
  format, startOfMonth, endOfMonth, addDays, isBefore, isAfter,
  eachDayOfInterval, isValid, parseISO
} from "date-fns";
import { DayPicker } from "react-day-picker";
import { Button, Badge } from "../uiux";
import { Plus, Trash2 } from "lucide-react";
import AddAvailabilityDialog from "./AddAvailabilityDialog";
import { ro } from "date-fns/locale";
import { useTranslation } from "react-i18next";

/* ---------------- utils ---------------- */
const AVAIL_COLL = collection(db, "availability");
const toDateSafe = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v === "string") {
    const dIso = parseISO(v);
    if (isValid(dIso)) return dIso;
  }
  const d = new Date(v);
  return isValid(d) ? d : null;
};

async function fetchAvailabilityForMonth(userId, monthDate) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const qy = query(AVAIL_COLL, where("userId", "==", userId));
  const snap = await getDocs(qy);
  const rows = [];

  snap.forEach((d) => {
    const data = d.data();
    const start = toDateSafe(data.start);
    const end = toDateSafe(data.end);
    if (!start || !end || !isValid(start) || !isValid(end)) return;
    if (!(isAfter(start, monthEnd) || isBefore(end, monthStart))) {
      rows.push({
        id: d.id,
        userId: data.userId,
        title: data.title || "Rezervat",
        notes: data.notes || "",
        status: data.status === "busy" ? "busy" : "free",
        start,
        end,
      });
    }
  });

  rows.sort((a, b) => a.start - b.start);
  return rows;
}

async function createAvailability({
  userId, type, title, notes, status, start, end, visibility = "public", createdBy,
}) {
  const payload = {
    userId,
    type,
    title: title || "Rezervat",
    notes: notes || "",
    status: status === "busy" ? "busy" : "free",
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    visibility,
    createdBy,
    createdAt: Timestamp.fromDate(new Date()),
  };
  const ref = await addDoc(AVAIL_COLL, payload);
  return ref.id;
}

async function deleteAvailability(id) {
  await deleteDoc(doc(db, "availability", id));
}

/* ---------------- Legend ---------------- */
function Legend() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-6 text-sm text-neutral-200">
      <div className="flex items-center gap-2">
        <span className="inline-block size-4 rounded-full bg-red-500" /> {t("availability_calendar.busy")}
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-4 rounded-full bg-emerald-500" /> {t("availability_calendar.free")}
      </div>
    </div>
  );
}

/* ---------------- Main Component ---------------- */
export default function AvailabilityCalendar({ userId, currentUser, type, editable }) {
  const { t } = useTranslation();

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [displayMonth, setDisplayMonth] = useState(startOfMonth(todayStart));
  const [itemsByMonth, setItemsByMonth] = useState({});
  const [isFetching, setIsFetching] = useState(false);

  const isOwner = editable && currentUser?.uid === userId;
  const isLoggedIn = !!currentUser?.uid;
  const canBook = isLoggedIn && !isOwner && (type === "artist" || type === "location");
  const [showCalendar, setShowCalendar] = useState(isOwner);

  const [openDialog, setOpenDialog] = useState(false);
  const [range, setRange] = useState({ from: undefined, to: undefined });
  const [form, setForm] = useState({ title: "", notes: "", status: "busy", visibility: "public" });
  const [selectedDay, setSelectedDay] = useState(null);

  const monthKey = format(displayMonth, "yyyy-MM");

  useEffect(() => {
    let active = true;
    if (itemsByMonth[monthKey]) return;
    setIsFetching(true);
    fetchAvailabilityForMonth(userId, displayMonth).then((rows) => {
      if (!active) return;
      setItemsByMonth((prev) => ({ ...prev, [monthKey]: rows }));
      setIsFetching(false);
    });
    return () => { active = false; };
  }, [userId, monthKey, displayMonth, itemsByMonth]);

  const handleMonthChange = (nextMonth) => {
    if (isBefore(nextMonth, startOfMonth(todayStart))) return;
    const nextKey = format(nextMonth, "yyyy-MM");
    if (itemsByMonth[nextKey]) {
      setDisplayMonth(nextMonth);
      return;
    }
    setIsFetching(true);
    fetchAvailabilityForMonth(userId, nextMonth).then((rows) => {
      setItemsByMonth((prev) => ({ ...prev, [nextKey]: rows }));
      setDisplayMonth(nextMonth);
      setIsFetching(false);
    });
  };

  const items = itemsByMonth[monthKey] || [];

  const { busyDates, dayEventsMap } = useMemo(() => {
    const map = {};
    const busy = [];
    items.forEach((ev) => {
      if (!isValid(ev.start) || !isValid(ev.end)) return;
      if (ev.status !== "busy") return;
      const days = eachDayOfInterval({ start: ev.start, end: addDays(ev.end, -1) });
      days.forEach((d) => {
        if (!isValid(d)) return;
        if (isBefore(d, todayStart)) return;
        const k = format(d, "yyyy-MM-dd");
        (map[k] ||= []).push(ev);
        busy.push(d);
      });
    });
    busy.sort((a, b) => a - b);
    return { busyDates: busy, dayEventsMap: map };
  }, [items, todayStart]);

  const freeMatcher = useMemo(() => {
    const toKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const bset = new Set(busyDates.map(toKey));
    return (date) => date >= todayStart && !bset.has(toKey(date));
  }, [busyDates, todayStart]);

  async function handleCreate() {
    if (!isOwner || !range.from || !range.to) return;
    const start = new Date(new Date(range.from).setHours(0, 0, 0, 0));
    const end = addDays(new Date(new Date(range.to).setHours(0, 0, 0, 0)), 1);

    await createAvailability({
      userId, type, title: form.title || t("availability_calendar.reserved"), notes: form.notes,
      status: form.status, start, end, visibility: form.visibility, createdBy: currentUser?.uid,
    });

    const rows = await fetchAvailabilityForMonth(userId, displayMonth);
    setItemsByMonth((prev) => ({ ...prev, [monthKey]: rows }));
    setOpenDialog(false);
    setRange({ from: undefined, to: undefined });
    setForm({ title: "", notes: "", status: "busy", visibility: "public" });
  }

  async function handleDelete(evId) {
    if (!isOwner) return;
    await deleteAvailability(evId);
    const rows = await fetchAvailabilityForMonth(userId, displayMonth);
    setItemsByMonth((prev) => ({ ...prev, [monthKey]: rows }));
    if (selectedDay) setSelectedDay(new Date(selectedDay));
  }

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const eventsForSelected = selectedKey ? dayEventsMap[selectedKey] || [] : [];

  const bookLabel =
    type === "artist"
      ? t("availability_calendar.book_artist")
      : type === "location"
      ? t("availability_calendar.book_location")
      : t("availability_calendar.book_generic");

  return (
    <div className="w-full min-w-0 bg-black text-white flex flex-col items-center justify-center">
      {canBook && !showCalendar && (
        <div className="mb-3">
          <Button className="w-full rounded-full h-10" onClick={() => setShowCalendar(true)}>
            {bookLabel}
          </Button>
        </div>
      )}

      {(showCalendar || isOwner) && (
        <>
          <div className="w-fit rounded-2xl border border-neutral-800 p-3 overflow-hidden bg-black text-white">
            <DayPicker
              locale={ro}
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              startMonth={todayStart}
              month={displayMonth}
              onMonthChange={handleMonthChange}
              disabled={{ before: todayStart }}             // zilele anterioare = disabled
              selected={range}
              onSelect={setRange}
              onDayClick={(d) => setSelectedDay(d)}
              modifiers={{ busy: busyDates, free: freeMatcher }}
              className="!bg-black !text-white !p-0 !m-0"
              modifiersClassNames={{
                // culori cerute
                busy: "!text-red-500 font-medium",
                free: "text-emerald-500 font-medium",
              }}
              styles={{
                /* caption (titlul lunii) centrat */
                caption: { display: "flex", justifyContent: "center", alignItems: "center" },
                caption_label: { color: "#fff", fontWeight: 600, textTransform: "lowercase" },

                /* header zile săptămână */
                head_cell: { color: "#a3a3a3", textAlign: "center", fontWeight: 500 },

                /* fiecare zi – fundal transparent */
                day: {
                  backgroundColor: "transparent",
                  borderRadius: "10px",
                  transition: "transform 0.15s ease",
                },

                /* azi cu contur accent (opțional) */
                day_today: { border: "1px solid #6b21a8" },

                /* selectat (dacă folosești range/select) */
                day_selected: { backgroundColor: "transparent", outline: "2px solid #6b21a8", color: "#fff" },

                /* zile disabled (înainte de azi) */
                day_disabled: { opacity: 0.35, cursor: "not-allowed" },

                /* zile în afara lunii */
                day_outside: { opacity: 0.35 },

                /* navigația (săgețile) */
                nav: { display: "flex", justifyContent: "space-between", alignItems: "center" },
                nav_button: {
                  background: "transparent",
                  border: "1px solid #fff",
                  color: "#fff",
                  borderRadius: 12,
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                },
                nav_button_previous: { background: "transparent", border: "1px solid #fff", color: "#fff" },
                nav_button_next: { background: "transparent", border: "1px solid #fff", color: "#fff" },
                chevron: { fill: "white" },
              }}
            />


            <div className="mt-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-4 rounded-full bg-red-500" /> Ocupat
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-4 rounded-full bg-emerald-500" /> Liber
                </div>
              </div>
            </div>
          </div>


          {isOwner && (
            <div className="mb-3 flex justify-end">
              <Button
                size="sm"
                className="rounded-full h-9 px-4 shadow-sm w-full mt-3"
                onClick={() => {
                  setRange({ from: undefined, to: undefined });
                  setOpenDialog(true);
                }}
              >
                <Plus className="mr-2 size-4" /> {t("availability_calendar.add_block")}
              </Button>
            </div>
          )}
        </>
      )}

      <AddAvailabilityDialog
        open={openDialog}
        setOpen={setOpenDialog}
        form={form}
        setForm={setForm}
        range={range}
        setRange={setRange}
        todayStart={todayStart}
        handleCreate={handleCreate}
        isOwner={isOwner}
        busyDates={busyDates}
        freeMatcher={freeMatcher}
        displayMonth={displayMonth}
        onMonthChange={handleMonthChange}
      />
    </div>
  );
}
