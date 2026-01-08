// pages/BookArtistPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../src/firebase";
import AvailabilityCalendar from "../components/profilepage/AvailabilityCalendar";

const asDate = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

export default function BookArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ visibility for owner-created events
  const [visibility, setVisibility] = useState("private"); // "private" | "public"

  // ✅ range selection
  const [selectedRange, setSelectedRange] = useState({ from: null, to: null });

  const normalizeRange = (range) => {
    if (!range?.from) return { from: null, to: null };
    const from = range.from;
    const to = range.to || range.from;
    return from <= to ? { from, to } : { from: to, to: from };
  };

  const rangeLabel = (range) => {
    if (!range?.from) return "Neselectat";
    const { from, to } = normalizeRange(range);
    const f = from.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const t = to.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return f === t ? f : `${f} — ${t}`;
  };

  // form fields
  const [locationName, setLocationName] = useState("");
  const [eventType, setEventType] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const [requests, setRequests] = useState([]); // booking requests (owner)
  const [slots, setSlots] = useState([]); // availability slots

  // ✅ pagination
  const PAGE_SIZE = 5;
  const [eventsPage, setEventsPage] = useState(1);

  // ----------------- load target profile -----------------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const ref = doc(db, "users", id);
        const snap = await getDoc(ref);
        if (snap.exists()) setTarget({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("Error loading target user:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const currentUser = auth.currentUser;
  const isOwner = currentUser?.uid === id;

  // ----------------- booking requests (owner) -----------------
  useEffect(() => {
    if (!id || !isOwner) return;

    const q = query(
      collection(db, "bookings"),
      where("targetId", "==", id),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(data);
      },
      (err) => console.error("Error loading booking requests:", err)
    );

    return () => unsub();
  }, [id, isOwner]);

  // ----------------- availability slots -----------------
  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, "availability"), where("userId", "==", id));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSlots(data);
      },
      (err) => console.error("Error loading availability:", err)
    );

    return () => unsub();
  }, [id]);

  // ----------------- submit form -----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !selectedRange?.from) return;

    const user = auth.currentUser;
    if (!user) {
      navigate(`/login?redirect=/book/${id}`);
      return;
    }

    setSending(true);

    try {
      const { from, to } = normalizeRange(selectedRange);

      if (user.uid === id) {
        // OWNER: create event + create blocked slot linked to event
        const eventRef = await addDoc(collection(db, "events"), {
          ownerId: id,
          visibility, // "private" | "public"
          title: eventType || locationName || "Eveniment",
          venue: locationName || "",
          description: message || "",
          timeRange: timeRange || "",
          budget: budget || "",
          startDate: from,
          endDate: to,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, "availability"), {
          userId: id,
          from,
          to,
          status: "blocked", // ✅ always blocked
          title: eventType || locationName || "Blocare",
          notes: message || "",
          visibility, // store for quick UI checks
          eventId: eventRef.id, // ✅ /events/:id
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // reset
        setLocationName("");
        setEventType("");
        setTimeRange("");
        setBudget("");
        setMessage("");
        setSelectedRange({ from: null, to: null });
        setVisibility("private");
        setEventsPage(1);
      } else {
        // OTHER USER: create booking request
        await addDoc(collection(db, "bookings"), {
          targetId: id,
          targetType: target?.accountType || target?.type || "",
          requesterId: user.uid,
          date: from,
          dateTo: to,
          status: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          details: {
            locationName,
            eventType,
            timeRange,
            budget,
            message,
            phone,
          },
        });

        navigate(`/user/${id}`, { replace: true });
      }
    } catch (err) {
      console.error("Error submitting booking:", err);
    } finally {
      setSending(false);
    }
  };

  // ----------------- accept / reject booking requests -----------------
  const handleAcceptRequest = async (booking) => {
    try {
        const from = booking.date?.toDate?.() || new Date(booking.date);
        const to =
        booking.dateTo?.toDate?.() ||
        (booking.dateTo ? new Date(booking.dateTo) : from);

        // ✅ 1) Create an event doc for details page
        const eventRef = await addDoc(collection(db, "events"), {
        ownerId: booking.targetId,          // owner = artist/location being booked
        visibility: "private",              // sau "public" dacă vrei
        title:
            booking.details?.eventType ||
            booking.details?.locationName ||
            "Eveniment",
        venue: booking.details?.locationName || "",
        description: booking.details?.message || "",
        timeRange: booking.details?.timeRange || "",
        budget: booking.details?.budget || "",
        phone: booking.details?.phone || "",
        startDate: from,
        endDate: to,
        bookingId: booking.id,              // ✅ link back
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });

        // ✅ 2) Create availability slot linked to the EVENT doc
        await addDoc(collection(db, "availability"), {
        userId: booking.targetId,
        from,
        to,
        status: "booked",
        title:
            booking.details?.eventType ||
            booking.details?.locationName ||
            "Eveniment",
        notes: booking.details?.message || "",
        visibility: "private",              // sau "public" dacă vrei
        eventId: eventRef.id,               // ✅ IMPORTANT: now points to events/:id
        bookingId: booking.id,              // optional, useful
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });

        // ✅ 3) Update booking
        await updateDoc(doc(db, "bookings", booking.id), {
        status: "accepted",
        eventId: eventRef.id,               // optional, helpful later
        updatedAt: serverTimestamp(),
        });

        setEventsPage(1);
    } catch (err) {
        console.error("Error accepting booking:", err);
    }
  };


  const handleRejectRequest = async (bookingId) => {
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
    } catch (err) {
      console.error("Error rejecting booking:", err);
    }
  };

  const handleDeleteSlot = async (slot) => {
    try {
      await deleteDoc(doc(db, "availability", slot.id));

      if (slot.status === "booked" && slot.eventId) {
        await updateDoc(doc(db, "bookings", slot.eventId), {
          status: "cancelled",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error deleting slot:", err);
    }
  };

  // ----------------- derived UI data -----------------
  const label =
    target?.accountType === "location" || target?.type === "location"
      ? "Book locație"
      : "Book artist";

  const now = new Date();

  // normalize slot dates once (handles Timestamp)
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

  const futureSlots = useMemo(() => {
    return [...normalizedSlots]
      .filter((slot) => slot.to >= now)
      .sort((a, b) => a.from.getTime() - b.from.getTime());
  }, [normalizedSlots, now]);

  const totalPages = Math.max(1, Math.ceil(futureSlots.length / PAGE_SIZE));

  useEffect(() => {
    if (eventsPage > totalPages) setEventsPage(totalPages);
    if (eventsPage < 1) setEventsPage(1);
  }, [eventsPage, totalPages]);

  const pagedSlots = useMemo(() => {
    const start = (eventsPage - 1) * PAGE_SIZE;
    return futureSlots.slice(start, start + PAGE_SIZE);
  }, [futureSlots, eventsPage]);

  const sortedRequests = [...requests].sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return da.getTime() - db.getTime();
  });

  // ----------------- loading / not found -----------------
  if (loading) return <div className="text-white p-4">Loading...</div>;
  if (!target) return <div className="text-white p-4">Profilul nu a fost găsit.</div>;

  // ----------------- render -----------------
  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 md:px-10">
      <div className="max-w-5xl mx-auto">
        {/* header */}
        <div className="flex items-center gap-4 mb-6">
          {target.avatarUrl && (
            <img
              src={target.avatarUrl}
              alt={target.displayName}
              className="w-16 h-16 rounded-full object-cover border border-purple-500"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {label} – {target.displayName}
            </h1>
            {Array.isArray(target.genres) && target.genres.length > 0 && (
              <p className="text-sm text-gray-400">{target.genres.join(" • ")}</p>
            )}
            {isOwner && (
              <p className="text-xs text-gray-500 mt-1">
                (Vizualizezi propriul tău calendar, evenimentele și cererile de booking)
              </p>
            )}
          </div>
        </div>

        {/* calendar */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            {isOwner ? "Calendarul tău" : "Alege intervalul"}
          </h2>
          {!isOwner && (
            <p className="text-sm text-gray-400 mb-2">
              Poți selecta doar zilele verzi (disponibile). Intervalul nu poate include zile roșii.
            </p>
          )}
          <div className="rounded-3xl border border-purple-700/40 p-4">
            <AvailabilityCalendar
              userId={id}
              mode={isOwner ? "owner" : "booking"}
              selectedRange={selectedRange}
              onSelectRange={(r) => setSelectedRange(normalizeRange(r))}
            />
          </div>
        </section>

        {/* form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold mb-2">
            {isOwner ? "Adaugă un interval / eveniment în calendarul tău" : "Detalii eveniment"}
          </h2>

          {/* selected interval */}
          <div className="text-sm text-gray-400 -mt-1">
            Interval selectat:{" "}
            <span className="text-gray-200 font-semibold">{rangeLabel(selectedRange)}</span>
          </div>

          {/* owner: visibility */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-300">Vizibilitate:</span>

              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={
                  "px-3 py-1.5 rounded-full border text-xs md:text-sm " +
                  (visibility === "private"
                    ? "bg-zinc-100 text-black border-white"
                    : "bg-zinc-900 border-zinc-700 text-gray-300")
                }
              >
                Privat
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={
                  "px-3 py-1.5 rounded-full border text-xs md:text-sm " +
                  (visibility === "public"
                    ? "bg-zinc-100 text-black border-white"
                    : "bg-zinc-900 border-zinc-700 text-gray-300")
                }
              >
                Public
              </button>

              <span className="text-xs text-gray-500">
                {visibility === "private"
                  ? "Doar tu vezi Detalii."
                  : "Oricine poate deschide Detalii."}
              </span>
            </div>
          )}

          {/* owner info */}
          {isOwner && (
            <div className="text-xs md:text-sm text-gray-400">
              Orice interval adăugat manual se salvează automat ca{" "}
              <span className="text-gray-200 font-semibold">blocked</span>.
            </div>
          )}

          <div>
            <label className="text-sm text-gray-300">Locație / Venue</label>
            <input
              className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Mechano Pub, București"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Tip eveniment</label>
              <input
                className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="Ex: Party studențesc, corporate..."
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Interval orar</label>
              <input
                className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                placeholder="Ex: 22:00 – 03:00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Buget estimativ</label>
              <input
                className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 500€ / seară"
              />
            </div>

            {!isOwner && (
              <div>
                <label className="text-sm text-gray-300">Telefon / Contact</label>
                <input
                  className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +40 7xx xxx xxx"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-300">
              {isOwner ? "Note interne" : "Mesaj pentru artist"}
            </label>
            <textarea
              className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm min-h-[100px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isOwner
                  ? "Detalii interne despre interval / eveniment."
                  : "Detalii despre public, setup, preferințe muzicale etc."
              }
            />
          </div>

          <button
            type="submit"
            disabled={!selectedRange?.from || sending}
            className="mt-4 w-full md:w-auto px-6 py-2.5 rounded-xl bg-purple-600 disabled:bg-purple-900 font-semibold"
          >
            {sending ? "Se trimite..." : isOwner ? "Salvează în calendar" : "Trimite cererea de booking"}
          </button>
        </form>

        {/* owner: future slots list */}
        {isOwner && (
          <section className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold">Evenimentele și intervalele tale viitoare</h2>

              {futureSlots.length > 0 && (
                <div className="text-xs text-gray-400">
                  {futureSlots.length} total • Pagina {eventsPage}/{totalPages}
                </div>
              )}
            </div>

            {futureSlots.length === 0 ? (
              <div className="border border-dashed border-zinc-700 rounded-2xl p-4 text-sm text-gray-400">
                Nu ai încă intervale sau evenimente viitoare în calendar.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pagedSlots.map((slot) => {
                    const fromDate = slot.from;
                    const toDate = slot.to;

                    const fromStrDate = fromDate.toLocaleDateString("ro-RO", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const toStrDate = toDate.toLocaleDateString("ro-RO", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    const isBooked = slot.status === "booked";

                    return (
                      <div
                        key={slot.id}
                        className="border border-zinc-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm text-gray-400">
                            {fromStrDate} — {toStrDate}
                          </div>
                          <div className="text-base font-semibold">
                            {slot.title || (isBooked ? "Eveniment" : "Interval")}
                          </div>
                          {slot.notes && (
                            <div className="text-sm text-gray-400 mt-1">{slot.notes}</div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${
                              slot.status === "booked" || slot.status === "blocked"
                                ? "bg-red-900 text-red-300"
                                : "bg-emerald-900 text-emerald-300"
                            }`}
                          >
                            {slot.status || "available"}
                          </span>

                          <div className="flex gap-2">
                            {/* ✅ Detalii (pentru sloturi legate de events) */}
                            {slot.eventId && (slot.visibility === "public" || isOwner) && (
                              <button
                                type="button"
                                onClick={() => navigate(`/events/${slot.eventId}`)}
                                className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700"
                                title="Vezi detalii"
                              >
                                Detalii
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-red-600 hover:bg-red-700"
                              title="Șterge evenimentul / intervalul"
                            >
                              Șterge
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                      disabled={eventsPage === 1}
                      className="px-3 py-1.5 rounded-xl text-sm bg-zinc-800 disabled:opacity-40"
                    >
                      Înapoi
                    </button>

                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const page = idx + 1;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setEventsPage(page)}
                            className={
                              "w-9 h-9 rounded-xl text-sm border " +
                              (eventsPage === page
                                ? "bg-purple-600 border-purple-500"
                                : "bg-zinc-900 border-zinc-700 hover:bg-zinc-800")
                            }
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setEventsPage((p) => Math.min(totalPages, p + 1))}
                      disabled={eventsPage === totalPages}
                      className="px-3 py-1.5 rounded-xl text-sm bg-zinc-800 disabled:opacity-40"
                    >
                      Înainte
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* owner: booking requests */}
        {isOwner && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Cererile tale de booking</h2>

            {sortedRequests.length === 0 ? (
              <div className="border border-dashed border-zinc-700 rounded-2xl p-4 text-sm text-gray-400">
                Nu ai cereri de booking în așteptare.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedRequests.map((req) => {
                  const from = req.date?.toDate?.() || new Date(req.date || Date.now());
                  const to =
                    req.dateTo?.toDate?.() || (req.dateTo ? new Date(req.dateTo) : from);

                  const dateStrFrom = from.toLocaleDateString("ro-RO", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const dateStrTo = to.toLocaleDateString("ro-RO", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={req.id}
                      className="border border-zinc-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm text-gray-400">
                          {dateStrFrom}
                          {dateStrTo !== dateStrFrom ? ` — ${dateStrTo}` : ""}
                        </div>
                        <div className="text-base font-semibold">
                          {req.details?.eventType || "Eveniment"}
                        </div>
                        {req.details?.locationName && (
                          <div className="text-sm text-gray-300">
                            Locație: {req.details.locationName}
                          </div>
                        )}
                        {req.details?.timeRange && (
                          <div className="text-sm text-gray-300">
                            Interval: {req.details.timeRange}
                          </div>
                        )}
                        {req.details?.budget && (
                          <div className="text-sm text-gray-300">
                            Buget: {req.details.budget}
                          </div>
                        )}
                        {req.details?.message && (
                          <div className="text-sm text-gray-400 mt-1">{req.details.message}</div>
                        )}
                        {req.details?.phone && (
                          <div className="text-xs text-gray-500 mt-1">Tel: {req.details.phone}</div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          onClick={() => handleAcceptRequest(req)}
                        >
                          Acceptă
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl text-sm bg-red-600 hover:bg-red-700 font-semibold"
                          onClick={() => handleRejectRequest(req.id)}
                        >
                          Refuză
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
