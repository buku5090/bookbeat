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

import {
  Button, Input, Textarea, Label, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../uiux";
import { Plus, Trash2 } from "lucide-react";
import AddAvailabilityDialog from "./AddAvailabilityDialog";
import { ro } from "date-fns/locale";


/* ----------------------- utils ----------------------- */
const AVAIL_COLL = collection(db, "availability");

const toDateSafe = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
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

    // păstrează doar ce intersectează luna cerută
    if (!(isAfter(start, monthEnd) || isBefore(end, monthStart))) {
      rows.push({
        id: d.id,
        userId: data.userId,
        type: data.type,
        title: data.title || "Rezervat",
        notes: data.notes || "",
        status: data.status === "busy" ? "busy" : "free", // doar busy | free
        start,
        end, // end exclusiv
        allDay: !!data.allDay,
        visibility: data.visibility || "public",
        createdBy: data.createdBy,
        createdAt: toDateSafe(data.createdAt) || new Date(),
      });
    }
  });

  rows.sort((a, b) => a.start - b.start);
  return rows;
}

async function createAvailability({
  userId, type, title, notes, status, start, end, allDay = true, visibility = "public", createdBy,
}) {
  const payload = {
    userId,
    type: type || undefined,
    title: title || "Rezervat",
    notes: notes || "",
    status: status === "busy" ? "busy" : "free",
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end), // end exclusiv (a doua zi 00:00)
    allDay: !!allDay,
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

/* ----------------------- Legendă (doar două opțiuni) ----------------------- */
function Legend() {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block size-4 rounded-full bg-red-500" /> Ocupat
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-4 rounded-full bg-emerald-500" /> Liber
      </div>
    </div>
  );
}

/**
 * AvailabilityCalendar
 */
export default function AvailabilityCalendar({ userId, currentUser, type, editable }) {
  // data de azi (00:00)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // luna afișată pe ecran (blocat să nu meargă înapoi)
  const [displayMonth, setDisplayMonth] = useState(startOfMonth(todayStart));
  // cache cu iteme per lună: { 'yyyy-MM': rows[] }
  const [itemsByMonth, setItemsByMonth] = useState({});
  // fetching state (nu afectează afișarea calendarului)
  const [isFetching, setIsFetching] = useState(false);

  // vizibilitatea calendarului pentru userii obișnuiți
  const isOwner = editable && currentUser?.uid === userId;
  const isLoggedIn = !!currentUser?.uid;

  // butonul „Book …” apare DOAR dacă profilul este artist/location, userul e logat și nu e owner
  const canBook = isLoggedIn && !isOwner && (type === "artist" || type === "location");
  const [showCalendar, setShowCalendar] = useState(isOwner); // owner vede direct, ceilalți după „Book”

  const [openDialog, setOpenDialog] = useState(false);
  const [range, setRange] = useState({ from: undefined, to: undefined });
  const [form, setForm] = useState({ title: "", notes: "", status: "busy", visibility: "public" });
  const [selectedDay, setSelectedDay] = useState(null);

  const monthKey = format(displayMonth, "yyyy-MM");

  // încarcă luna curentă dacă nu e în cache
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, monthKey]);

  // când utilizatorul schimbă luna: blocăm navigarea în trecut
  const handleMonthChange = (nextMonth) => {
    if (isBefore(nextMonth, startOfMonth(todayStart))) return; // nu mergem în trecut
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

  // --- calculăm busyDates + map-ul de evenimente pe zile (doar viitorul) ---
  const { busyDates, dayEventsMap } = useMemo(() => {
    const map = {};
    const busy = [];

    items.forEach((ev) => {
      if (!isValid(ev.start) || !isValid(ev.end)) return;
      if (ev.status !== "busy") return;
      const days = eachDayOfInterval({ start: ev.start, end: addDays(ev.end, -1) }); // end exclusiv
      days.forEach((d) => {
        if (!isValid(d)) return;
        if (isBefore(d, todayStart)) return; // doar azi și viitorul
        const k = format(d, "yyyy-MM-dd");
        (map[k] ||= []).push(ev);
        busy.push(d);
      });
    });

    busy.sort((a, b) => a - b);
    return { busyDates: busy, dayEventsMap: map };
  }, [items, todayStart]);

  // --- matcher pentru zile libere: viitor && nu e în busy ---
  const freeMatcher = useMemo(() => {
    const toKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const bset = new Set(busyDates.map(toKey));
    return (date) => date >= todayStart && !bset.has(toKey(date));
  }, [busyDates, todayStart]);

  async function handleCreate() {
    if (!isOwner || !range.from || !range.to) return;
    const start = new Date(new Date(range.from).setHours(0, 0, 0, 0));
    const end = new Date(new Date(range.to).setHours(0, 0, 0, 0));
    if (!isValid(start) || !isValid(end)) return;
    const endExclusive = addDays(end, 1);

    await createAvailability({
      userId, type, title: form.title || "Rezervat", notes: form.notes, status: form.status,
      start, end: endExclusive, allDay: true, visibility: form.visibility, createdBy: currentUser?.uid,
    });

    // reîncarcă doar luna curentă
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
    type === "artist" ? "Book artist" : type === "location" ? "Book location" : "Book";

  return (
    <div className="w-full min-w-0">
      {/* Buton „Book …” doar pentru vizitatori autentificați (nu owner) */}
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
              disabled={{ before: todayStart }}      // trecutul e dezactivat
              selected={range}
              onSelect={setRange}
              onDayClick={(d) => setSelectedDay(d)}
              // busy = roșu; free = toate celelalte zile din viitor
              modifiers={{ busy: busyDates, free: freeMatcher }}
              className="!bg-white !text-neutral-900 !p-0 !m-0"
              classNames={{
                caption: "relative flex items-center justify-center mb-1",
                caption_label: "text-base font-bold tracking-tight",
                month_caption: "text-center mb-2",
                nav: "flex justify-between",

                // headerul zilelor (thead)
                weekdays: "w-full",
                weekday:
                  "text-center py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500",

                // „tabelul” (v9 e tot <table>): îl lăsăm ca tabel, fix, full width
                month_grid: "w-full table-fixed",

                // ziua
                day: "!text-center !p-0 !m-0",
                day_button:
                  "!m-0 !w-9 !h-9 !p-1 " +
                  "!flex !items-center !justify-center " +
                  "!text-base !font-semibold " +
                  "!bg-transparent !border-0 !appearance-none " +
                  "hover:!bg-neutral-100 focus:!outline-none !transition-none !shadow-none !cursor-pointer " +
                  "!disabled:text-gray-300 !disabled:cursor-default !disabled:hover:!bg-transparent",

                // zile din alte luni invizibile (dar păstrează înălțimea)
                outside: "!text-gray-300",

                // extra siguranță pentru disabled (gri)
                disabled: "!text-gray-300",
                button_next: "!bg-transparent",
                button_previous: "!bg-transparent"
              }}
              modifiersClassNames={{
                busy: "!text-red-500",
                free: "text-emerald-500",
              }}
            />

            <div className="mt-3">
              <Legend />
            </div>

            {/* Panou detalii zi selectată */}
            {selectedDay && (
              <div className="mt-4 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {format(selectedDay, "EEEE, d LLLL yyyy")}
                  </div>
                  <Button variant="secondary" size="lg" onClick={() => setSelectedDay(null)}>
                    Închide
                  </Button>
                </div>

                {eventsForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nicio înregistrare în această zi.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {eventsForSelected.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start justify-between gap-3 rounded-lg border p-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={ev.status === "busy" ? "destructive" : "default"}>
                              {ev.status}
                            </Badge>
                            <div className="font-medium truncate">{ev.title}</div>
                          </div>
                          {ev.notes ? (
                            <div className="text-sm text-muted-foreground mt-1 break-words">
                              {ev.notes}
                            </div>
                          ) : null}
                        </div>
                        {isOwner && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(ev.id)}
                            title="Șterge blocarea"
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

          {/* acțiuni owner */}
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
                <Plus className="mr-2 size-4" /> Adaugă blocare
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog creare blocare */}
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
        // opțional – dacă vrei culorile busy/free și în dialog:
        busyDates={busyDates}
        freeMatcher={freeMatcher}
        displayMonth={displayMonth}
        onMonthChange={handleMonthChange}
      />

    </div>
  );
}
