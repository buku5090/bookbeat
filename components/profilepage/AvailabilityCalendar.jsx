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
    <div className="flex items-center gap-6 text-sm">
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
    <div className="w-full min-w-0">
      {canBook && !showCalendar && (
        <div className="mb-3">
          <Button className="w-full rounded-full h-10" onClick={() => setShowCalendar(true)}>
            {bookLabel}
          </Button>
        </div>
      )}

      {(showCalendar || isOwner) && (
        <>
          <div className="rounded-2xl border p-2 overflow-hidden max-w-full">
            <DayPicker
              locale={ro}
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              startMonth={todayStart}
              month={displayMonth}
              onMonthChange={handleMonthChange}
              disabled={{ before: todayStart }}
              selected={range}
              onSelect={setRange}
              onDayClick={(d) => setSelectedDay(d)}
              modifiers={{ busy: busyDates, free: freeMatcher }}
              className="!bg-white !text-neutral-900 !p-0 !m-0"
              modifiersClassNames={{
                busy: "!text-red-500",
                free: "text-emerald-500",
              }}
            />

            <div className="mt-3">
              <Legend />
            </div>

            {selectedDay && (
              <div className="mt-4 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{format(selectedDay, "EEEE, d LLLL yyyy")}</div>
                  <Button variant="secondary" size="lg" onClick={() => setSelectedDay(null)}>
                    {t("availability_calendar.close")}
                  </Button>
                </div>

                {eventsForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("availability_calendar.no_entries")}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {eventsForSelected.map((ev) => (
                      <div key={ev.id} className="flex items-start justify-between gap-3 rounded-lg border p-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={ev.status === "busy" ? "destructive" : "default"}>
                              {t(`availability_calendar.${ev.status}`)}
                            </Badge>
                            <div className="font-medium truncate">{ev.title}</div>
                          </div>
                          {ev.notes && <div className="text-sm text-muted-foreground mt-1">{ev.notes}</div>}
                        </div>
                        {isOwner && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(ev.id)}
                            title={t("availability_calendar.delete")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
