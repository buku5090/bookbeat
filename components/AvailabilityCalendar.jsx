// components/AvailabilityCalendar.jsx
// ❗ Fără titlu în componentă (îl pui tu în pagină)

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../src/firebase";
import {
  collection, addDoc, deleteDoc, doc, getDocs, query, where, Timestamp,
} from "firebase/firestore";

import {
  format, startOfMonth, endOfMonth, addDays, isBefore, isAfter, eachDayOfInterval, isValid, parseISO,
} from "date-fns";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "../src/styles/availability.css";

import { Button } from "../src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../src/components/ui/dialog";
import { Input } from "../src/components/ui/input";
import { Textarea } from "../src/components/ui/textarea";
import { Label } from "../src/components/ui/label";
import { Badge } from "../src/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";

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

  // fără index: doar where + sort local
  const qy = query(AVAIL_COLL, where("userId", "==", userId));
  const snap = await getDocs(qy);

  const rows = [];
  snap.forEach((d) => {
    const data = d.data();
    const start = toDateSafe(data.start);
    const end = toDateSafe(data.end);
    if (!start || !end || !isValid(start) || !isValid(end)) return;
    // păstrează doar ce intersectează luna curentă
    if (!(isAfter(start, monthEnd) || isBefore(end, monthStart))) {
      rows.push({
        id: d.id,
        userId: data.userId,
        type: data.type,
        title: data.title || "Rezervat",
        notes: data.notes || "",
        status: data.status || "busy", // busy | tentative | freeBlock
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
    status: status || "busy",
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

function Legend() {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2"><span className="inline-block size-3 rounded-full bg-red-500" /> Ocupat</div>
      <div className="flex items-center gap-2"><span className="inline-block size-3 rounded-full bg-yellow-500" /> Tentativ</div>
      <div className="flex items-center gap-2"><span className="inline-block size-3 rounded-full bg-emerald-500" /> Bloc liber</div>
    </div>
  );
}

/**
 * AvailabilityCalendar (fără titlu intern)
 */
export default function AvailabilityCalendar({ userId, currentUser, type, editable }) {
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [range, setRange] = useState({ from: undefined, to: undefined });
  const [form, setForm] = useState({ title: "", notes: "", status: "busy", visibility: "public" });
  const [selectedDay, setSelectedDay] = useState(null);

  const isOwner = editable && currentUser?.uid === userId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAvailabilityForMonth(userId, month).then((rows) => {
      if (!active) return;
      setItems(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId, month]);

  const { busyDates, tentativeDates, freeDates, dayEventsMap } = useMemo(() => {
    const busy = [], tentative = [], free = [];
    const map = {};
    items.forEach((ev) => {
      if (!isValid(ev.start) || !isValid(ev.end)) return;
      const days = eachDayOfInterval({ start: ev.start, end: addDays(ev.end, -1) }); // end exclusiv
      days.forEach((d) => {
        if (!isValid(d)) return;
        const key = format(d, "yyyy-MM-dd");
        (map[key] ||= []).push(ev);
        if (ev.status === "busy") busy.push(d);
        else if (ev.status === "tentative") tentative.push(d);
        else free.push(d);
      });
    });
    return { busyDates: busy, tentativeDates: tentative, freeDates: free, dayEventsMap: map };
  }, [items]);

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

    const rows = await fetchAvailabilityForMonth(userId, month);
    setItems(rows);
    setOpenDialog(false);
    setRange({ from: undefined, to: undefined });
    setForm({ title: "", notes: "", status: "busy", visibility: "public" });
  }

  async function handleDelete(evId) {
    if (!isOwner) return;
    await deleteAvailability(evId);
    const rows = await fetchAvailabilityForMonth(userId, month);
    setItems(rows);
    if (selectedDay) setSelectedDay(new Date(selectedDay));
  }

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const eventsForSelected = selectedKey ? dayEventsMap[selectedKey] || [] : [];

  return (
    <div className="w-full min-w-0">
      {/* Card calendar */}
      <div className="rounded-2xl border p-3 overflow-hidden max-w-full">
        {loading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Se încarcă disponibilitatea…
          </div>
        ) : (
          <DayPicker
            mode="range"
            month={month}
            onMonthChange={setMonth}  // navigare cu săgețile implicite
            selected={range}
            onSelect={setRange}
            showOutsideDays
            numberOfMonths={1}
            onDayClick={(day) => setSelectedDay(day)}
            modifiers={{ busy: busyDates, tentative: tentativeDates, freeBlock: freeDates }}
            modifiersClassNames={{
              busy: "rdp-day_busy",
              tentative: "rdp-day_tentative",
              freeBlock: "rdp-day_freeBlock",
            }}
            className="rdp w-full max-w-full"
          />
        )}

        <div className="mt-3">
          <Legend />
        </div>

        {/* Panou detalii zi selectată */}
        {selectedDay && (
          <div className="mt-4 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{format(selectedDay, "EEEE, d LLLL yyyy")}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>Închide</Button>
            </div>

            {eventsForSelected.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Nicio înregistrare în această zi.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {eventsForSelected.map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-3 rounded-lg border p-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={ev.status === "busy" ? "destructive" : ev.status === "tentative" ? "secondary" : "default"}>
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

      {/* acțiuni (fără titlu). doar butonul de creare, aliniat dreapta */}
      {isOwner && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" className="rounded-full h-9 px-4 shadow-sm w-full mt-3" onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 size-4" /> Adaugă blocare
          </Button>
        </div>
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
              <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Ex: Eveniment privat" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>Notițe</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Detalii (opțional)" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {["busy", "tentative", "freeBlock"].map((key) => (
                  <Button key={key} variant={form.status === key ? "default" : "outline"} size="sm" onClick={() => setForm((s) => ({ ...s, status: key }))}>
                    {key}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>Vizibilitate</Label>
              <div className="flex gap-2">
                {["public", "private"].map((v) => (
                  <Button key={v} variant={form.visibility === v ? "default" : "outline"} size="sm" onClick={() => setForm((s) => ({ ...s, visibility: v }))}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>Interval zile</Label>
              <div className="rounded-md border p-2">
                <DayPicker mode="range" selected={range} onSelect={setRange} showOutsideDays className="rdp" />
              </div>
              <p className="text-xs text-muted-foreground">Sfârșitul este exclusiv (se salvează +1 zi automat).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Renunță</Button>
            <Button onClick={handleCreate} disabled={!isOwner || !range.from || !range.to}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
