// pages/NotificationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  CalendarCheck,
  CalendarClock,
  MessageSquare,
  Info,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/* -------- tipuri + culori + icon -------- */
const TYPE_META = {
  "booking.created": {
    labelKey: "notifications_doc.type.booking",
    cls: "!bg-white/10 !text-white !border-white/10",
    icon: CalendarClock,
  },
  "booking.accepted": {
    labelKey: "notifications_doc.type.booking",
    cls: "!bg-white/10 !text-white !border-white/10",
    icon: CalendarCheck,
  },
  "booking.rejected": {
    labelKey: "notifications_doc.type.booking",
    cls: "!bg-red-500/20 !text-red-300 !border-red-500/30",
    icon: CalendarCheck,
  },
  "booking.canceled": {
    labelKey: "notifications_doc.type.booking",
    cls: "!bg-red-500/20 !text-red-300 !border-red-500/30",
    icon: CalendarClock,
  },
  "booking.status": {
    labelKey: "notifications_doc.type.booking",
    cls: "!bg-white/10 !text-white !border-white/10",
    icon: CalendarCheck,
  },
  "message.new": {
    labelKey: "notifications_doc.type.message",
    cls: "!bg-white/10 !text-white !border-white/10",
    icon: MessageSquare,
  },
  system: {
    labelKey: "notifications_doc.type.system",
    cls: "!bg-white/10 !text-white !border-white/10",
    icon: Info,
  },
  warning: {
    labelKey: "notifications.type.warning",
    cls: "!bg-violet-600/25 !text-violet-200 !border-violet-500/40",
    icon: AlertCircle,
  },
};
const fallbackMeta = {
  labelKey: "notifications_doc.type.notification",
  cls: "!bg-white/10 !text-white !border-white/10",
  icon: Info,
};

// câte notificări / pagină
const PAGE_SIZE = 20; // schimbă în 15 dacă vrei

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread
  const [currentPage, setCurrentPage] = useState(1);

  // auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // notifications listener
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

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const filtered = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter]
  );

  // când schimbi filtrul, revii la pagina 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginated = filtered.slice(startIndex, endIndex);

  const markAsRead = async (id) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, `users/${user.uid}/notifications/${id}`), {
      read: true,
    });
  };

  const markAllAsRead = async () => {
    if (!user?.uid || items.length === 0) return;
    const batch = writeBatch(db);
    items.forEach((n) => {
      if (!n.read) {
        batch.update(doc(db, `users/${user.uid}/notifications/${n.id}`), {
          read: true,
        });
      }
    });
    await batch.commit();
  };

  // accept / reject booking opportunity
  const respondToBooking = async (notification, decision) => {
    if (!user?.uid) return;

    try {
      if (notification.bookingId) {
        await updateDoc(doc(db, "bookings", notification.bookingId), {
          status: decision, // "accepted" | "rejected"
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(
        doc(db, `users/${user.uid}/notifications/${notification.id}`),
        {
          read: true,
          responded: true,
          response: decision,
          respondedAt: serverTimestamp(),
        }
      );
    } catch (err) {
      console.error("Booking response error", err);
    }
  };

  if (!user) {
    return (
      <Shell
        unreadCount={0}
        headerTitle={t("notifications_doc.title")}
        headerSubtitle={t("notifications_doc.up_to_date")}
      >
        <EmptyState
          title={t("notifications_doc.not_authenticated_title")}
          subtitle={t("notifications_doc.not_authenticated_subtitle")}
        />
      </Shell>
    );
  }

  return (
    <Shell
      unreadCount={unreadCount}
      headerTitle={t("notifications_doc.title")}
      headerSubtitle={
        unreadCount > 0
          ? t("notifications_doc.unread_count", { count: unreadCount })
          : t("notifications_doc.up_to_date")
      }
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
            disabled={unreadCount === 0}
            title={t("notifications_doc.mark_all_title")}
          >
            <CheckCheck className="w-4 h-4" />
            {t("notifications_doc.mark_all")}
          </button>
        </div>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex rounded-full overflow-hidden ring-1 ring-white/10">
          <button
            className={`px-4 py-2 text-sm transition ${
              filter === "all"
                ? "bg-violet-600 text-white"
                : "bg-black text-white hover:bg-[#0b0b0b]"
            }`}
            onClick={() => setFilter("all")}
          >
            {t("common.all")}
          </button>
          <button
            className={`px-4 py-2 text-sm transition border-l border-white/10 ${
              filter === "unread"
                ? "bg-violet-600 text-white"
                : "bg-black text-white hover:bg-[#0b0b0b]"
            }`}
            onClick={() => setFilter("unread")}
          >
            {t("notifications_doc.unread")}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-[10px] bg-red-600 text-white rounded-full min-w-[18px] h-[18px] px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Listă + paginație */}
      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("notifications_doc.empty_title")}
          subtitle={t("notifications_doc.empty_subtitle")}
        />
      ) : (
        <>
          <ul className="rounded-2xl overflow-hidden bg-black/60 ring-1 ring-white/10 divide-y divide-white/10">
            {paginated.map((n) => {
              const meta = TYPE_META[n._type] || fallbackMeta;
              const Icon = meta.icon || Info;
              const isUnread = !n.read;
              const isBookingOpportunity =
                n._type === "booking.created" && n.bookingId;

              const isMessage = n._type === "message.new" && n.fromUserId;

              return (
                <li
                  key={n.id}
                  onClick={() => {
                    if (isMessage) {
                      navigate(`/messages/${n.fromUserId}`);
                    }
                  }}
                  className={`relative group px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-4 sm:gap-6 transition-colors ${
                    isUnread ? "bg-black" : "opacity-90"
                  } ${isMessage ? "cursor-pointer hover:bg-[#0b0b0b]" : ""}`}
                >
                  {/* NEON UNREAD BAR */}
                  {isUnread && (
                    <>
                      <span
                        className="absolute left-0 top-0 h-full w-[3px] bg-violet-500"
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute left-0 top-0 h-full w-[10px] rounded-sm opacity-90 [filter:blur(10px)] bg-violet-500"
                        aria-hidden
                      />
                      <span
                        className="pointer-events-none absolute left-0 top-0 h-full w-[18px] opacity-60 [filter:blur(18px)] bg-violet-500"
                        aria-hidden
                      />
                    </>
                  )}

                  {/* TAG TIP – lățime uniformă */}
                  <div className="flex-shrink-0">
                    <div
                      className={`min-w-[120px] flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold border ${meta.cls}`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1.5" />
                      <span className="truncate">
                        {t(meta.labelKey)}
                      </span>
                    </div>
                  </div>

                  {/* CONȚINUT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-[15px] leading-snug text-white truncate">
                        {n.title || t("notifications_doc.fallback_title")}
                      </h3>
                      <div className="text-[12px] text-white/60 whitespace-nowrap">
                        {formatDistanceToNow(n._created, {
                          addSuffix: true,
                          locale: ro,
                        })}
                      </div>
                    </div>

                    {n.body && (
                      <p className="mt-1 text-sm text-white/80 leading-snug break-words">
                        {n.body}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {/* Accept / Refuz pentru booking opportunity */}
                      {isBookingOpportunity && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToBooking(n, "accepted");
                            }}
                            className="text-xs px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                          >
                            {t("notifications_doc.accept") || "Acceptă"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToBooking(n, "rejected");
                            }}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium"
                          >
                            {t("notifications_doc.reject") || "Refuză"}
                          </button>
                        </>
                      )}

                      {/* Mark as read – doar dacă nu e booking actionable */}
                      {!n.read && !isBookingOpportunity && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="text-xs px-2.5 py-1 rounded-full border border-white/20 hover:bg-white/10 text-white"
                        >
                          {t("notifications_doc.mark_read")}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-xs sm:text-sm text-white/70">
              <div>
                {t("notifications_doc.page_label", {
                  // dacă nu ai key în i18n, poți lăsa direct text:
                  // page: safePage, total: totalPages
                  page: safePage,
                  total: totalPages,
                }) || `Pagina ${safePage} din ${totalPages}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={safePage === 1}
                  className="px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("common.prev") || "Prev"}
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("common.next") || "Next"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

/* ===== Layout cu header stilizat (dark) ===== */
function Shell({ unreadCount, right, headerTitle, headerSubtitle, children }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 bg-black">
      <div className="relative overflow-hidden rounded-3xl mb-6 border border-white/10">
        <div className="h-28 sm:h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-black via-zinc-900 to-black" />
        <div className="absolute inset-0 px-6 sm:px-8 py-5 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-none">
                {headerTitle}
              </h1>
              <p className="text-sm text-white/80 mt-1">{headerSubtitle}</p>
            </div>
          </div>
          {right}
        </div>
        {unreadCount > 0 && (
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center justify-center text-xs bg-violet-600 text-white rounded-full min-w-[26px] h-[26px] px-2 font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black p-10 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
        <Inbox className="w-8 h-8 text-white/70" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && (
        <p className="text-sm text-white/70 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function SkeletonList() {
  const { t } = useTranslation();
  return (
    <ul
      className="rounded-2xl overflow-hidden bg-black/60 ring-1 ring-white/10"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="px-4 sm:px-6 py-5 border-b last:border-0 border-white/10"
        >
          <div className="h-4 w-28 bg-white/10 animate-pulse rounded mb-2" />
          <div className="h-3 w-2/3 bg-white/10 animate-pulse rounded mb-2" />
          <div className="h-3 w-24 bg-white/10 animate-pulse rounded" />
        </li>
      ))}
      <div className="py-4 flex items-center justify-center text-white/70 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        {t("notifications_doc.loading")}
      </div>
    </ul>
  );
}
