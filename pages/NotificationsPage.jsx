// pages/NotificationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, orderBy, query, doc, updateDoc, writeBatch, serverTimestamp
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Bell, CheckCheck, Inbox, Loader2, CalendarCheck, CalendarClock,
  MessageSquare, Info, AlertCircle, ChevronRight, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* -------- tipuri + culori + icon -------- */
const TYPE_META = {
  "booking.created":   { label: "Booking",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CalendarClock },
  "booking.accepted":  { label: "Booking",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CalendarCheck },
  "booking.rejected":  { label: "Booking",  cls: "bg-rose-100 text-rose-700 border-rose-200",         icon: CalendarCheck },
  "booking.canceled":  { label: "Booking",  cls: "bg-rose-100 text-rose-700 border-rose-200",         icon: CalendarCheck },
  "booking.status":    { label: "Booking",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CalendarCheck },
  "message.new":       { label: "Mesaj",    cls: "bg-amber-100  text-amber-800  border-amber-200",    icon: MessageSquare },
  "system":            { label: "Sistem",   cls: "bg-slate-100  text-slate-700  border-slate-200",    icon: Info },
  "warning":           { label: "Atenție",  cls: "bg-purple-100 text-purple-700 border-purple-200",   icon: AlertCircle },
};
const fallbackMeta = { label: "Notificare", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: Info };

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();

  /* auth */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  /* live notifications */
  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _created: d.data()?.createdAt?.toDate
          ? d.data().createdAt.toDate()
          : new Date(),
        _type: d.data()?.type || "system",
      }));
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const filtered = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter]
  );

  const markAsRead = async (id) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, `users/${user.uid}/notifications/${id}`), { read: true });
  };
  const markAllAsRead = async () => {
    if (!user?.uid || items.length === 0) return;
    const batch = writeBatch(db);
    items.forEach((n) => { if (!n.read) batch.update(doc(db, `users/${user.uid}/notifications/${n.id}`), { read: true }); });
    await batch.commit();
  };

  // ➕ Seed demo notifications
  const seedDemo = async () => {
    if (!user?.uid || seeding) return;
    setSeeding(true);
    const path = `users/${user.uid}/notifications`;
    const batch = writeBatch(db);
    const now = serverTimestamp();
    const demo = [
      {
        type: "booking.created",
        title: "Cerere de booking nouă",
        body: "Mechano Pub a propus 12 Oct, 21:00–23:00.",
        actionUrl: "/bookings/demo-1",
      },
      {
        type: "booking.accepted",
        title: "Booking confirmat",
        body: "Andrei (DJ) a confirmat gig-ul pe 15 Oct.",
        actionUrl: "/bookings/demo-2",
      },
      {
        type: "message.new",
        title: "Mesaj nou de la Mechano Pub",
        body: "Salut! Poți și pe 20 Oct? Așteptăm răspuns.",
        actionUrl: "/messages/demo-3",
      },
      {
        type: "warning",
        title: "Actualizează disponibilitatea",
        body: "Săptămâna viitoare este necompletată. Adaugă zilele ocupate.",
        actionUrl: "/profil#availability",
      },
      {
        type: "system",
        title: "Profil verificat 🎉",
        body: "Contul tău a fost verificat. Spor la bookinguri!",
        actionUrl: "/profil",
      },
    ];
    demo.forEach((n) => {
      const ref = doc(collection(db, path));
      batch.set(ref, { ...n, read: false, createdAt: now });
    });
    await batch.commit();
    setSeeding(false);
  };

  /* --------- UI --------- */
  if (!user) {
    return (
      <Shell unreadCount={0}>
        <EmptyState
          title="Nu ești autentificat"
          subtitle="Autentifică-te pentru a-ți vedea notificările."
        />
      </Shell>
    );
  }

  return (
    <Shell
      unreadCount={unreadCount}
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={seedDemo}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
            disabled={seeding}
            title="Adaugă câteva notificări de test"
          >
            <Sparkles className="w-4 h-4" />
            {seeding ? "Se adaugă…" : "Adaugă demo"}
          </button>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
            disabled={unreadCount === 0}
            title="Marchează toate ca citite"
          >
            <CheckCheck className="w-4 h-4" />
            Marchează toate
          </button>
        </div>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
          <button
            className={`px-4 py-2 text-sm transition ${
              filter === "all"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white"
            }`}
            onClick={() => setFilter("all")}
          >
            Toate
          </button>
          <button
            className={`px-4 py-2 text-sm border-l border-black/10 dark:border-white/10 transition ${
              filter === "unread"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white"
            }`}
            onClick={() => setFilter("unread")}
          >
            Necitite
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Listă */}
      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nu ai notificări momentan"
          subtitle="Vei primi aici anunțuri despre bookinguri, confirmări și mesaje."
        />
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/10 rounded-2xl overflow-hidden bg-white/60 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10">
          {filtered.map((n) => {
            const meta = TYPE_META[n._type] || fallbackMeta;
            const Icon = meta.icon || Info;
            return (
              <li
                key={n.id}
                className={`relative group px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-4 sm:gap-6 transition-colors
                  hover:bg-white dark:hover:bg-white/10 ${n.read ? "opacity-90" : "bg-white"} `}
              >
                {!n.read && <span className="absolute left-0 top-0 h-full w-0.5 bg-blue-600" />}

                <div className="flex-shrink-0">
                  <div className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border ${meta.cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-[15px] leading-snug text-gray-900 dark:text-white truncate">
                      {n.title || "Notificare"}
                    </h3>
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(n._created, { addSuffix: true, locale: ro })}
                    </div>
                  </div>

                  {n.body && (
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-snug break-words">
                      {n.body}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Marchează citită
                      </button>
                    )}
                    {n.actionUrl && (
                      <button
                        onClick={() => { markAsRead(n.id); navigate(n.actionUrl); }}
                        className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 dark:border-white/20 dark:hover:bg-white/10 inline-flex items-center gap-1"
                      >
                        Vezi <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

/* ===== Layout cu header stilizat ===== */
function Shell({ unreadCount, right, children }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl mb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-transparent opacity-80" />
        <div className="h-28 sm:h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-black via-zinc-900 to-black" />
        <div className="absolute inset-0 px-6 sm:px-8 py-5 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-none">Notificări</h1>
              <p className="text-sm text-white/80 mt-1">{unreadCount > 0 ? `${unreadCount} necitite` : "La zi ✅"}</p>
            </div>
          </div>
          {right}
        </div>
      </div>

      {children}
    </div>
  );
}

/* ===== Empty & Skeleton ===== */
function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-10 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-3">
        <Inbox className="w-8 h-8 text-gray-500 dark:text-gray-300" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>}
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="rounded-2xl overflow-hidden bg-white/60 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-4 sm:px-6 py-5 border-b last:border-0 border-gray-100 dark:border-white/10">
          <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 animate-pulse rounded mb-2" />
          <div className="h-3 w-2/3 bg-gray-200 dark:bg-white/10 animate-pulse rounded mb-2" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded" />
        </li>
      ))}
      <div className="py-4 flex items-center justify-center text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Se încarcă notificările…
      </div>
    </ul>
  );
}
