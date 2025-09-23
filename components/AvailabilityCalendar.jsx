// components/AvailabilityCalendar.jsx
// ❗ Fără titlu în componentă (îl pui tu în pagină)

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../src/firebase";
import {
  collection, addDoc, deleteDoc, doc, getDocs, query, where, Timestamp,
} from "firebase/firestore";

import {
  format, startOfMonth, endOfMonth, addDays, isBefore, isAfter,
  eachDayOfInterval, isValid, parseISO
} from "date-fns";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "../src/styles/availability.css";

import {
  Button, Input, Textarea, Label, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/uiux";
import { Plus, Trash2 } from "lucide-react";

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
        <span className="inline-block size-5 rounded-full bg-red-500" /> Ocupat
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-5 rounded-full bg-emerald-500" /> Liber
      </div>
    </div>
  );
}

/**
 * AvailabilityCalendar (fără titlu intern)
 * Props:
 *  - userId: id-ul profilului afișat
 *  - currentUser: userul logat
 *  - type: tipul profilului afișat ("artist" | "location" | "user")
 *  - editable: dacă profilul afișat e al userului logat
 */
export default function AvailabilityCalendar({ userId, currentUser, type, editable }) {
  // luna afișată pe ecran
  const [displayMonth, setDisplayMonth] = useState(new Date());
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

  // când utilizatorul schimbă luna: ținem luna curentă pe ecran până vin noile date
  const handleMonthChange = (nextMonth) => {
    const nextKey = format(nextMonth, "yyyy-MM");
    if (itemsByMonth[nextKey]) {
      setDisplayMonth(nextMonth); // avem cache -> comutăm imediat
      return;
    }
    setIsFetching(true);
    fetchAvailabilityForMonth(userId, nextMonth).then((rows) => {
      setItemsByMonth((prev) => ({ ...prev, [nextKey]: rows }));
      setDisplayMonth(nextMonth); // comută abia după ce avem datele
      setIsFetching(false);
    });
  };

  const items = itemsByMonth[monthKey] || [];

  // Construim setul de zile ocupate, apoi „libere” = toate zilele lunii – ocupate.
  const { busyDates, freeDates, dayEventsMap } = useMemo(() => {
    const map = {};
    const busy = [];

    items.forEach((ev) => {
      if (!isValid(ev.start) || !isValid(ev.end)) return;
      if (ev.status !== "busy") return;
      const days = eachDayOfInterval({ start: ev.start, end: addDays(ev.end, -1) }); // end exclusiv
      days.forEach((d) => {
        if (!isValid(d)) return;
        const key = format(d, "yyyy-MM-dd");
        (map[key] ||= []).push(ev);
        busy.push(d);
      });
    });

    const startM = startOfMonth(displayMonth);
    const endM = endOfMonth(displayMonth);
    const allDays = eachDayOfInterval({ start: startM, end: endM });

    const busyKeys = new Set(busy.map((d) => format(d, "yyyy-MM-dd")));
    const free = allDays.filter((d) => !busyKeys.has(format(d, "yyyy-MM-dd")));

    return { busyDates: busy, freeDates: free, dayEventsMap: map };
  }, [items, displayMonth]);

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
      {/* Buton vizibil DOAR dacă profilul e artist/location, userul e logat și nu e owner */}
      {canBook && !showCalendar && (
        <div className="mb-3">
          <Button className="w-full rounded-full h-10" onClick={() => setShowCalendar(true)}>
            {bookLabel}
          </Button>
        </div>
      )}

      {/* Calendarul */}
      {(showCalendar || isOwner) && (
        <>
          <div className="rounded-2xl border p-2 overflow-hidden max-w-full">
            <DayPicker
              mode="range"
              month={displayMonth}
              onMonthChange={handleMonthChange} // menținem luna curentă pe ecran până se încarcă următoarea
              selected={range}
              onSelect={setRange}
              showOutsideDays
              numberOfMonths={1}
              onDayClick={(day) => setSelectedDay(day)}
              modifiers={{ busy: busyDates, free: freeDates }}
              modifiersClassNames={{
                // cercuri compacte + spațiu între ele
                busy: "bg-red-500 text-white rounded-full p-[2px]",
                free: "bg-emerald-500 text-white rounded-full p-[2px]",
              }}
              className="rdp w-full max-w-full [--rdp-cell-size:34px]" // cercuri mai mici
              classNames={{
                day: "rdp-day m-[4px] rounded-full",
                caption_label: "text-xl font-semibold",
              }}
            />

            <div className="mt-3">
              <Legend />
            </div>

            {isFetching && (
              <p className="text-xs text-muted-foreground mt-2">
                Actualizez disponibilitatea pentru luna următoare…
              </p>
            )}

            {/* Panou detalii zi selectată */}
            {selectedDay && (
              <div className="mt-4 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{format(selectedDay, "EEEE, d LLLL yyyy")}</div>
                  <Button variant="secondary" size="lg" onClick={() => setSelectedDay(null)}>
                    Închide
                  </Button>
                </div>

                {eventsForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">Nicio înregistrare în această zi.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {eventsForSelected.map((ev) => (
                      <div key={ev.id} className="flex items-start justify-between gap-3 rounded-lg border p-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={ev.status === "busy" ? "destructive" : "default"}>
                              {ev.status}
                            </Badge>
                            <div className="font-medium truncate">{ev.title}</div>
                          </div>
                          {ev.notes ? <div className="text-sm text-muted-foreground mt-1 break-words">{ev.notes}</div> : null}
                        </div>
                        {isOwner && (
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(ev.id)} title="Șterge blocarea">
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
                onClick={() => setOpenDialog(true)}
              >
                <Plus className="mr-2 size-4" /> Adaugă blocare
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog creare blocare */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adaugă blocare de disponibilitate</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Label>Titlu</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex: Eveniment privat"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label>Notițe</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Detalii (opțional)"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label>Interval zile</Label>
              <div className="rounded-md border p-2">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  showOutsideDays
                  className="rdp"
                  fromDate={new Date()}  // 🔒 doar azi încolo
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Sfârșitul este exclusiv (se salvează +1 zi automat).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Renunță
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !isOwner ||
                !range?.from ||
                !range?.to ||
                range.from < new Date().setHours(0, 0, 0, 0)
              }
            >
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
