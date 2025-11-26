// pages/MessagesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../src/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  Loader2,
  MessageCircle,
  Search,
  Send,
  User as UserIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

/* ================= MAIN PAGE (inbox + chat) ================= */

export default function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { peerId: routePeerId } = useParams(); // /messages/:peerId?

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [search, setSearch] = useState("");

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("🔑 Auth user:", u?.uid);
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // inițial selectăm peerId din URL dacă există
  useEffect(() => {
    if (routePeerId) {
      console.log("📌 routePeerId din URL:", routePeerId);
      setSelectedPeerId(routePeerId);
    }
  }, [routePeerId]);

  // conversations for current user (se citesc din colectia "conversations")
  useEffect(() => {
    if (!currentUser?.uid) {
      setConversations([]);
      setLoadingConvs(false);
      return;
    }

    setLoadingConvs(true);
    console.log("📡 Pornesc query pe /conversations pentru user:", currentUser.uid);

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _updated: d.data()?.updatedAt?.toDate
            ? d.data().updatedAt.toDate()
            : new Date(),
        }));

        console.groupCollapsed("💬 Conversations snapshot");
        console.log("Număr documente:", rows.length);
        rows.forEach((c, idx) => {
          console.log(`#${idx + 1}`, {
            id: c.id,
            participants: c.participants,
            lastMessage: c.lastMessage,
            lastSenderId: c.lastSenderId,
            updatedAt: c._updated,
          });
        });
        console.groupEnd();

        setConversations(rows);
        setLoadingConvs(false);
      },
      (err) => {
        console.error("Conversations query error:", err);
        setConversations([]);
        setLoadingConvs(false);
      }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  // load peer profiles pentru conversații
  useEffect(() => {
    if (!currentUser?.uid || conversations.length === 0) return;

    const peerIds = new Set();
    conversations.forEach((c) => {
      const participants = c.participants || [];
      const peerId =
        participants.length === 1
          ? participants[0]
          : participants.find((p) => p !== currentUser.uid) || participants[0];
      if (peerId && !profiles[peerId]) peerIds.add(peerId);
    });

    if (peerIds.size === 0) return;

    console.groupCollapsed("👥 Fetch profiles pentru participanți");
    console.log("Peer IDs lipsă în cache:", Array.from(peerIds));
    console.groupEnd();

    peerIds.forEach(async (uid) => {
      try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        const exists = snap.exists();
        const data = exists ? snap.data() : null;

        console.groupCollapsed("👤 User profile din /users");
        console.log("UserID:", uid);
        console.log("Există document?", exists);
        console.log("Data:", data);
        console.groupEnd();

        if (exists) {
          setProfiles((prev) => ({
            ...prev,
            [uid]: { id: snap.id, ...data },
          }));
        } else {
          setProfiles((prev) => ({ ...prev, [uid]: null }));
        }
      } catch (e) {
        console.error("Eroare la getDoc(/users):", uid, e);
        setProfiles((prev) => ({ ...prev, [uid]: null }));
      }
    });
  }, [conversations, currentUser?.uid, profiles]);

  // dacă nu avem nimic selectat și avem conversații, ia prima
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!selectedPeerId && conversations.length > 0) {
      const first = conversations[0];
      const participants = first.participants || [];
      const peerId =
        participants.length === 1
          ? participants[0]
          : participants.find((p) => p !== currentUser.uid) || participants[0];

      console.log("🎯 Setez selectedPeerId din prima conversație:", peerId);
      setSelectedPeerId(peerId || null);
    }
  }, [conversations, currentUser?.uid, selectedPeerId]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;

    const qLower = search.toLowerCase();
    return conversations.filter((c) => {
      const participants = c.participants || [];
      const peerId =
        participants.length === 1
          ? participants[0]
          : participants.find((p) => p !== currentUser?.uid) || participants[0];
      const profile = profiles[peerId];
      const name =
        profile?.stageName ||
        profile?.displayName ||
        profile?.name ||
        profile?.username ||
        "";
      const target = (name + " " + (c.lastMessage || "")).toLowerCase();
      return target.includes(qLower);
    });
  }, [search, conversations, profiles, currentUser?.uid]);

  const handleSelectConversation = (peerId) => {
    console.log("🖱 Select conversation for peerId:", peerId);
    setSelectedPeerId(peerId);
    navigate(`/messages/${peerId}`);
  };

  if (!currentUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 bg-black min-h-screen text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                {t("chat.inbox_title")}
              </h1>
              <p className="text-sm text-white/70">
                {t("chat.inbox_not_logged")}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-sm"
        >
          {t("auth.login") || "Login"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-black min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-violet-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">
              {t("chat.inbox_title")}
            </h1>
            <p className="text-xs sm:text-sm text-white/70">
              {t("chat.inbox_subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Layout: sidebar + chat */}
      <div className="bg-[#050509] border border-white/10 rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] min-h-[520px]">
        {/* LEFT – lista de conversații */}
        <div className="border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
          {/* Search */}
          <div className="p-3 sm:p-4 border-b border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("chat.search_placeholder")}
                className="w-full bg-white/5 text-xs sm:text-sm text-white rounded-full pl-8 pr-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-8 text-xs text-white/70">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("chat.loading")}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-xs text-white/60 text-center">
                <UserIcon className="w-7 h-7 mb-2 text-white/40" />
                {t("chat.inbox_empty")}
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filteredConversations.map((conv, idx) => {
                  const participants = conv.participants || [];
                  const peerId =
                    participants.length === 1
                      ? participants[0]
                      : participants.find((p) => p !== currentUser.uid) ||
                        participants[0];
                  const profile = profiles[peerId];

                  const name =
                    profile?.stageName ||
                    profile?.displayName ||
                    profile?.name ||
                    profile?.username ||
                    profile?.email ||
                    "Profil";

                  const lastMsg = conv.lastMessage || "";
                  const snippet =
                    lastMsg.length > 36
                      ? lastMsg.slice(0, 33) + "..."
                      : lastMsg;

                  const updatedLabel = conv._updated
                    ? formatDistanceToNow(conv._updated, {
                        addSuffix: true,
                        locale: ro,
                      })
                    : "";

                  const isActive = peerId === selectedPeerId;

                  const initials =
                    (name || "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "?";

                  console.groupCollapsed(
                    `📨 [SIDEBAR] Conv #${idx + 1} – conversationId=${conv.id}`
                  );
                  console.log("Participants:", participants);
                  console.log("peerId folosit în listă:", peerId);
                  console.log("Profil găsit în cache:", profile);
                  console.log("Inițiale calculate:", initials);
                  console.groupEnd();

                  return (
                    <li
                      key={conv.id}
                      className={`px-3 sm:px-4 py-3 flex items-center gap-3 text-xs sm:text-sm cursor-pointer transition-colors ${
                        isActive ? "bg-violet-600/40" : "hover:bg-white/5"
                      }`}
                      onClick={() => handleSelectConversation(peerId)}
                    >
                      {/* Avatar mic, 100% fallback pe inițiale */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-[11px] font-semibold">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {name}
                          </span>
                          <span className="text-[10px] text-white/50 whitespace-nowrap">
                            {updatedLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/60 truncate">
                          {snippet || t("chat.no_messages_yet")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT – chatul propriu-zis */}
        <div className="flex flex-col">
          {selectedPeerId ? (
            <ConversationPanel
              currentUser={currentUser}
              peerId={selectedPeerId}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-sm text-white/70">
              <MessageCircle className="w-10 h-10 mb-3 text-white/50" />
              <p>{t("chat.inbox_pick")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= CONVERSATION PANEL (chat cu profilul selectat) ================= */

function ConversationPanel({ currentUser, peerId }) {
  const { t } = useTranslation();
  const [peerProfile, setPeerProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const bottomRef = useRef(null);
  const ensuredConversationDoc = useRef(false);

  // conv id stabil
  const conversationId = useMemo(() => {
    if (!currentUser?.uid || !peerId) return null;
    const id = [currentUser.uid, peerId].sort().join("__");
    console.log("💡 conversationId (panel):", id);
    return id;
  }, [currentUser?.uid, peerId]);

  // profil peer
  useEffect(() => {
    if (!peerId) return;
    const ref = doc(db, "users", peerId);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          console.log("👤 Peer profile în panel:", peerId, snap.data());
          setPeerProfile({ id: snap.id, ...snap.data() });
        } else {
          console.warn("⚠️ Peer profile NU există în /users:", peerId);
          setPeerProfile(null);
        }
      })
      .catch((e) => {
        console.error("Eroare getDoc(peerProfile):", e);
        setPeerProfile(null);
      });
  }, [peerId]);

  // listener mesaje
  useEffect(() => {
    if (!conversationId) return;

    setLoadingMessages(true);
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt;
          const created =
            ts && typeof ts.toDate === "function" ? ts.toDate() : new Date();
          return { id: d.id, ...data, _created: created };
        });

        console.groupCollapsed("💬 Mesaje în panel");
        console.log("conversationId:", conversationId);
        console.log("Număr mesaje:", rows.length);
        console.groupEnd();

        setMessages(rows);
        setLoadingMessages(false);
      },
      (err) => {
        console.error("Messages listener error", err);
        setLoadingMessages(false);
      }
    );

    return () => unsub();
  }, [conversationId]);

  // scroll jos
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const displayName =
    peerProfile?.stageName ||
    peerProfile?.displayName ||
    peerProfile?.name ||
    peerProfile?.username ||
    peerProfile?.email ||
    t("chat.unknown_user");

  const peerInitials =
    (displayName || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "U";

  const selfInitials =
    (currentUser?.displayName || currentUser?.email || "You")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "Y";

  // actualizează/creează docul din "conversations"
  useEffect(() => {
    if (
      !conversationId ||
      !currentUser?.uid ||
      !peerId ||
      messages.length === 0 ||
      ensuredConversationDoc.current
    ) {
      return;
    }

    ensuredConversationDoc.current = true;

    const last = messages[messages.length - 1];

    console.log("🛠 Sync conversație din panel -> /conversations doc");

    setDoc(
      doc(db, "conversations", conversationId),
      {
        participants: [currentUser.uid, peerId],
        lastMessage: last.text || "",
        lastSenderId: last.senderId || currentUser.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => {
      console.error("ensure conversations doc error", err);
      ensuredConversationDoc.current = false;
    });
  }, [messages, conversationId, currentUser?.uid, peerId]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!currentUser?.uid || !peerId || !conversationId) return;

        const text = input.trim();
        if (!text) return;

        // optimistic – apare imediat
        const tempId = `temp-${Date.now()}`;
        const optimistic = {
        id: tempId,
        text,
        senderId: currentUser.uid,
        recipientId: peerId,
        _created: new Date(),
        __optimistic: true,
        };
        setMessages((prev) => [...prev, optimistic]);
        setInput("");
        setSending(true);

        try {
        // 1) salvăm mesajul în subcolecția conversations/{id}/messages
        const msgRef = collection(
            db,
            "conversations",
            conversationId,
            "messages"
        );
        await addDoc(msgRef, {
            text,
            senderId: currentUser.uid,
            recipientId: peerId,
            createdAt: serverTimestamp(),
        });

        // 2) upsert documentul din colectia "conversations"
        await setDoc(
            doc(db, "conversations", conversationId),
            {
            participants: [currentUser.uid, peerId],
            lastMessage: text,
            lastSenderId: currentUser.uid,
            updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        // 3) NOTIFICARE la userul care primește mesajul
        //    (dacă nu-ți scrii ție însuți)
        if (peerId !== currentUser.uid) {
            const notifRef = collection(
            db,
            `users/${peerId}/notifications`
            );

            const senderName =
            currentUser.displayName ||
            currentUser.email ||
            "User";

            // scurtăm puțin textul pentru notificare
            const body =
            text.length > 140 ? text.slice(0, 137) + "…" : text;

            await addDoc(notifRef, {
            type: "message.new",
            read: false,
            createdAt: serverTimestamp(),
            fromUserId: currentUser.uid,
            fromName: senderName,
            conversationId,
            title: senderName,          // ex: "Bogdan ți-a trimis un mesaj"
            body,                       // conținutul ultimului mesaj
            });

            console.log(
            "[chat] notification.message.new creată pentru",
            peerId
            );
        }
        } catch (err) {
        console.error("Send message error:", err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } finally {
        setSending(false);
        }
    };


  return (
    <div className="flex flex-col h-full">
      {/* header conv */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center text-xs font-semibold">
          {peerInitials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            {displayName}
          </div>
          {peerProfile?.type && (
            <div className="text-[11px] text-white/60 capitalize">
              {peerProfile.type}
            </div>
          )}
        </div>
      </div>

      {/* mesaje */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 bg-gradient-to-b from-[#050509] to-black">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8 text-xs text-white/60">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("chat.loading")}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-white/60">
            <UserIcon className="w-7 h-7 mb-2 text-white/40" />
            {t("chat.empty")}
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUser.uid;

            return (
              <div
                key={m.id}
                className={`flex w-full ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-end gap-2 max-w-[90%] ${
                    isMine ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      isMine
                        ? "bg-violet-500 text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {isMine ? selfInitials : peerInitials}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs sm:text-sm break-words ${
                      isMine
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <form
        onSubmit={handleSend}
        className="border-t border-white/10 bg-black/90 px-3 sm:px-4 py-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.input_placeholder")}
          className="flex-1 bg-black text-white text-xs sm:text-sm rounded-full px-3 py-2 border border-white/15 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
