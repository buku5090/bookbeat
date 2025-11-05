// components/CollabData.jsx
import { useEffect, useState } from "react";
import { db } from "../../src/firebase";
import { collection, onSnapshot, orderBy, query, where, limit as qLimit } from "firebase/firestore";

/**
 * Data loader pentru colaborări. Folosește render-prop.
 * <CollabData profileUid={...} side="artist|location">{({rows,loading})=> ... }</CollabData>
 */
export default function CollabData({ profileUid, side = "artist", limit = 50, children }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileUid) return;
    const col = collection(db, "collaborations");
    let q = query(
      col,
      where(side === "artist" ? "artistId" : "locationId", "==", profileUid),
      orderBy("eventDate", "desc"),
      qLimit(limit)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [profileUid, side, limit]);

  return typeof children === "function" ? children({ rows, loading }) : null;
}
