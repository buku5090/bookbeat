import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Trash, CheckCircle, Star, Eye, ShieldAlert, Flag, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Firebase (păstrez calea TA curentă)
import { db, storage } from "../src/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { ref, getDownloadURL, deleteObject } from "firebase/storage";

/** ——— Heuristici simple pt. conținut obscen (RO + EN) ——— */
const OBSCENE_WORDS = [
  // Română (adauga ce vrei tu)
  "pula", "pizda", "muie", "fut", "curve", "idiot", "handicapat", "prost",
  // Engleză
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "faggot",
];

function hasObsceneContent(text = "") {
  const t = (text || "").toLowerCase();
  // Reguli simple: cuvinte interzise + lungime anormală de repetare a caracterelor etc.
  const bad = OBSCENE_WORDS.some((w) => t.includes(w));
  const repeatedChars = /(.)\1{6,}/.test(t); // ex: aaaaaaa
  return bad || repeatedChars;
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState(null); // {type, userId?}
  const [bulkSelection, setBulkSelection] = useState(new Set());

  const navigate = useNavigate();
  const { user } = useAuth();

  /** ——— Protecție admin minimală (păstrată ca la tine) ——— */
  useEffect(() => {
    if (!user || user.email !== "adminbookmix@gmail.com") {
      navigate("/"); // 🔒 doar admin
    }
  }, [user, navigate]);

  /** ——— Subscribe la users ——— */
  useEffect(() => {
    const qRef = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(arr);
        setLoading(false);
      },
      (err) => {
        console.error("[Admin] users onSnapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  async function fetchUserDetails(userId) {
    const d = await getDoc(doc(db, "users", userId));
    return { id: d.id, ...d.data() };
  }

  /** ——— Acțiuni ——— */
  async function markVerified(userId, value = true) {
    await updateDoc(doc(db, "users", userId), {
      verified: value,
      verifiedAt: value ? new Date() : null,
    });
  }

  async function promoteUser(userId, value = true) {
    await updateDoc(doc(db, "users", userId), {
      featured: value,
      featuredAt: value ? new Date() : null,
      role: value ? "featured" : "user",
    });
  }

  async function flagUser(userId, reason = "obscene_bio") {
    await updateDoc(doc(db, "users", userId), {
      flagged: true,
      flaggedReason: reason,
      flaggedAt: new Date(),
    });
  }

  async function unflagUser(userId) {
    await updateDoc(doc(db, "users", userId), {
      flagged: false,
      flaggedReason: null,
      flaggedAt: null,
    });
  }

  async function deleteAccount(userId, options = { removeStorage: true }) {
    // 1) șterge pozele de ID din Storage dacă există
    if (options.removeStorage) {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();
      if (data?.idPhotos && Array.isArray(data.idPhotos)) {
        for (const path of data.idPhotos) {
          try {
            const sRef = ref(storage, path);
            await deleteObject(sRef);
          } catch (e) {
            console.warn("failed to delete storage object:", path, e?.message || e);
          }
        }
      }
    }
    // 2) șterge documentul din Firestore
    await deleteDoc(doc(db, "users", userId));
    // Notă: ștergerea din Auth se face server-side (Cloud Functions/Admin SDK)
  }

  /** ——— Search + filtre ——— */
  const visible = useMemo(() => {
    const list = users
      .filter((u) => {
        if (filter === "verified") return u.verified === true;
        if (filter === "unverified") return !u.verified;
        if (filter === "flagged") return u.flagged === true;
        return true;
      })
      .filter((u) => {
        if (!queryText) return true;
        const q = queryText.toLowerCase();
        return (
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.stageName || "").toLowerCase().includes(q) ||
          (u.bio || "").toLowerCase().includes(q)
        );
      });
    return list;
  }, [users, filter, queryText]);

  /** ——— Bulk actions ——— */
  async function applyBulk(action) {
    const ids = Array.from(bulkSelection);
    setConfirmAction(null);
    for (const id of ids) {
      try {
        if (action === "delete") await deleteAccount(id);
        if (action === "verify") await markVerified(id, true);
        if (action === "promote") await promoteUser(id, true);
        if (action === "flag") await flagUser(id, "manual_bulk");
      } catch (e) {
        console.error(`bulk action ${action} failed for ${id}`, e);
      }
    }
    setBulkSelection(new Set());
  }

  /** ——— UI ——— */
  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard — BookMix</h1>

        <div className="flex gap-3 items-center">
          <div className="relative">
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Caută nume, email, bio..."
              className="pl-9 pr-3 py-2 bg-gray-900/60 border border-gray-800 rounded-md w-72 placeholder-gray-400"
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-md"
          >
            <option value="all">Toți</option>
            <option value="verified">Verificați</option>
            <option value="unverified">Neverificați</option>
            <option value="flagged">Semnalați</option>
          </select>

          <div className="text-sm text-gray-400">{visible.length} conturi</div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTĂ CONTURI */}
        <section className="lg:col-span-2 bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
          {/* BULK ACTIONS */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setConfirmAction({ type: "bulkVerify" })}
                className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900 flex items-center gap-2"
              >
                <CheckCircle size={16} /> Verifică selectate
              </button>
              <button
                onClick={() => setConfirmAction({ type: "bulkPromote" })}
                className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900 flex items-center gap-2"
              >
                <Star size={16} /> Promovează selectate
              </button>
              <button
                onClick={() => setConfirmAction({ type: "bulkFlag" })}
                className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900 flex items-center gap-2"
              >
                <Flag size={16} /> Marchează „flagged”
              </button>
              <button
                onClick={() => setConfirmAction({ type: "bulkDelete" })}
                className="px-3 py-1 rounded-md border border-red-900/60 bg-red-900/20 hover:bg-red-900/30 text-red-300 flex items-center gap-2"
              >
                <Trash size={16} /> Șterge selectate
              </button>
            </div>
            <div className="text-xs text-gray-500">
              ⚠️ Ștergerea din Auth trebuie făcută server-side (Cloud Functions/Admin SDK).
            </div>
          </div>

          {/* TABEL */}
          <div className="overflow-auto max-h-[70vh] rounded-xl border border-gray-800">
            <table className="w-full table-auto">
              <thead className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800">
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="p-2">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setBulkSelection(new Set(visible.map((u) => u.id)));
                        else setBulkSelection(new Set());
                      }}
                      checked={bulkSelection.size > 0 && bulkSelection.size === visible.length}
                    />
                  </th>
                  <th className="p-2">User</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Rol</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">
                      Se încarcă...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">
                      Nu s-au găsit conturi.
                    </td>
                  </tr>
                ) : (
                  visible.map((u) => {
                    const obscene = hasObsceneContent(u.bio);
                    return (
                      <tr key={u.id} className="border-t border-gray-800 hover:bg-gray-900/40">
                        <td className="p-2 align-top">
                          <input
                            type="checkbox"
                            checked={bulkSelection.has(u.id)}
                            onChange={(e) => {
                              const s = new Set(bulkSelection);
                              if (e.target.checked) s.add(u.id);
                              else s.delete(u.id);
                              setBulkSelection(s);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.photoURL || "/placeholder-avatar.png"}
                              alt="avatar"
                              className="w-10 h-10 rounded-full object-cover border border-gray-800"
                            />
                            <div>
                              <div className="font-medium">
                                {u.displayName || u.stageName || "—"}
                              </div>
                              <div className="text-xs text-gray-400">{u.city || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-sm">{u.email || "—"}</td>
                        <td className="p-2 text-sm">{u.role || (u.featured ? "featured" : "user")}</td>
                        <td className="p-2 text-sm">
                          <div className="flex items-center gap-2">
                            {u.verified ? (
                              <span className="text-green-400">Verificat</span>
                            ) : (
                              <span className="text-amber-400">Neverificat</span>
                            )}
                            {u.flagged && (
                              <span className="inline-flex items-center gap-1 text-red-300">
                                <ShieldAlert size={14} /> Flagged
                              </span>
                            )}
                            {obscene && !u.flagged && (
                              <button
                                onClick={() => flagUser(u.id, "obscene_auto")}
                                title="Bio suspectă — marchează flagged"
                                className="inline-flex items-center gap-1 text-red-300/90 hover:text-red-200"
                              >
                                <ShieldAlert size={14} /> Suspicios
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={async () => setSelected(await fetchUserDetails(u.id))}
                              title="Vezi detalii"
                              className="px-2 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900 flex items-center gap-2"
                            >
                              <Eye size={14} /> Detalii
                            </button>
                            <button
                              onClick={() => markVerified(u.id, !u.verified)}
                              className="px-2 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900"
                            >
                              {u.verified ? "Revocă" : "Verifică"}
                            </button>
                            <button
                              onClick={() => promoteUser(u.id, !u.featured)}
                              className="px-2 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900"
                            >
                              {u.featured ? "Anulează promo" : "Promovează"}
                            </button>
                            {!u.flagged ? (
                              <button
                                onClick={() => flagUser(u.id, "manual")}
                                className="px-2 py-1 rounded-md border border-red-900/60 bg-red-900/20 hover:bg-red-900/30 text-red-300 flex items-center gap-2"
                              >
                                <Flag size={14} /> Flag
                              </button>
                            ) : (
                              <button
                                onClick={() => unflagUser(u.id)}
                                className="px-2 py-1 rounded-md border border-green-900/60 bg-green-900/20 hover:bg-green-900/30 text-green-300"
                              >
                                Unflag
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ type: "delete", userId: u.id })}
                              className="px-2 py-1 rounded-md border border-red-900/60 bg-red-900/20 hover:bg-red-900/30 text-red-300 flex items-center gap-2"
                            >
                              <Trash size={14} /> Șterge
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* DETALII USER + POZE ID + AUDIT */}
        <aside className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Detalii & Audit</h3>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <img
                  src={selected.photoURL || "/placeholder-avatar.png"}
                  className="w-16 h-16 rounded-md object-cover border border-gray-800"
                />
                <div>
                  <div className="font-medium">{selected.displayName || selected.stageName || "—"}</div>
                  <div className="text-sm text-gray-400">{selected.email || "—"}</div>
                  <div className="text-xs text-gray-500">
                    Înregistrat:{" "}
                    {selected.createdAt?.toDate
                      ? selected.createdAt.toDate().toLocaleString()
                      : selected.createdAt || "—"}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">Bio</h4>
                <p className="text-sm text-gray-300 max-h-24 overflow-auto whitespace-pre-wrap border border-gray-800 rounded-md p-2">
                  {selected.bio || "—"}
                </p>
                {hasObsceneContent(selected.bio) && (
                  <div className="mt-2 text-red-300 text-sm inline-flex items-center gap-1">
                    <ShieldAlert size={14} /> Bio suspectă (detecție automată)
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium">Poze ID</h4>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {selected.idPhotos && selected.idPhotos.length > 0 ? (
                    selected.idPhotos.map((p, i) => <IdPhoto key={i} storagePath={p} />)
                  ) : (
                    <div className="text-sm text-gray-500">Nu există poze de ID încă.</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => markVerified(selected.id, !selected.verified)}
                  className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900"
                >
                  {selected.verified ? "Revocă verificare" : "Verifică cont"}
                </button>
                <button
                  onClick={() => promoteUser(selected.id, !selected.featured)}
                  className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900"
                >
                  {selected.featured ? "Anulează promo" : "Promovează"}
                </button>
                {!selected.flagged ? (
                  <button
                    onClick={() => flagUser(selected.id, "manual")}
                    className="px-3 py-1 rounded-md border border-red-900/60 bg-red-900/20 hover:bg-red-900/30 text-red-300"
                  >
                    Marchează flagged
                  </button>
                ) : (
                  <button
                    onClick={() => unflagUser(selected.id)}
                    className="px-3 py-1 rounded-md border border-green-900/60 bg-green-900/20 hover:bg-green-900/30 text-green-300"
                  >
                    Unflag
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction({ type: "delete", userId: selected.id })}
                  className="px-3 py-1 rounded-md border border-red-900/60 bg-red-900/20 hover:bg-red-900/30 text-red-300"
                >
                  Șterge cont
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60 hover:bg-gray-900"
                >
                  Închide
                </button>
              </div>

              <div>
                <h4 className="text-sm font-medium">Ultimele acțiuni</h4>
                <AuditLog userId={selected.id} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Selectează un cont pentru a vedea detaliile. Poți vizualiza bio, poze de ID, și istoricul de acțiuni.
            </div>
          )}
        </aside>
      </main>

      {/* Confirmări */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black/60" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gray-950 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
            <Dialog.Title className="font-semibold text-lg">Confirmare</Dialog.Title>
            <div className="mt-4 space-y-2 text-gray-300">
              {confirmAction?.type === "delete" && <p>Confirmi ștergerea permanentă a acestui cont?</p>}
              {confirmAction?.type === "bulkDelete" && <p>Confirmi ștergerea tuturor conturilor selectate?</p>}
              {confirmAction?.type === "bulkVerify" && <p>Confirmi verificarea tuturor conturilor selectate?</p>}
              {confirmAction?.type === "bulkPromote" && <p>Confirmi promovarea conturilor selectate?</p>}
              {confirmAction?.type === "bulkFlag" && <p>Confirmi marcarea ca „flagged” pentru conturile selectate?</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-3 py-1 rounded-md border border-gray-800 bg-gray-900/60">
                Anulează
              </button>
              <button
                onClick={async () => {
                  if (confirmAction.type === "delete") {
                    await deleteAccount(confirmAction.userId);
                    setConfirmAction(null);
                    if (selected?.id === confirmAction.userId) setSelected(null);
                  }
                  if (confirmAction.type === "bulkDelete") await applyBulk("delete");
                  if (confirmAction.type === "bulkVerify") await applyBulk("verify");
                  if (confirmAction.type === "bulkPromote") await applyBulk("promote");
                  if (confirmAction.type === "bulkFlag") await applyBulk("flag");
                }}
                className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmă
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

/** ——— Poze ID din Storage ——— */
function IdPhoto({ storagePath }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getDownloadURL(ref(storage, storagePath));
        if (mounted) setUrl(u);
      } catch (e) {
        console.warn("getDownloadURL failed:", e);
      }
    })();
    return () => { mounted = false; };
  }, [storagePath]);

  if (!url)
    return (
      <div className="w-24 h-16 rounded-md bg-gray-900/60 border border-gray-800 flex items-center justify-center text-xs text-gray-500">
        Se încarcă
      </div>
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="w-24 h-16 rounded-md overflow-hidden border border-gray-800">
      <img src={url} className="w-full h-full object-cover" alt="ID" />
    </a>
  );
}

/** ——— Audit log opțional (colecția 'auditLogs' cu userId, action, createdAt) ——— */
function AuditLog({ userId }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    if (!userId) return;
    const qRef = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((l) => l.userId === userId).slice(0, 12);
        setLogs(all);
      },
      (err) => console.error("[Admin] audit onSnapshot error:", err)
    );
    return () => unsub();
  }, [userId]);

  if (logs.length === 0) return <div className="text-sm text-gray-500">Niciun eveniment recent.</div>;
  return (
    <ul className="text-sm space-y-2 max-h-48 overflow-auto pr-1">
      {logs.map((l) => (
        <li key={l.id} className="text-gray-300">
          {new Date(l.createdAt?.toMillis ? l.createdAt.toMillis() : l.createdAt).toLocaleString()} — {l.action} {l.by ? `(${l.by})` : ""}
        </li>
      ))}
    </ul>
  );
}
