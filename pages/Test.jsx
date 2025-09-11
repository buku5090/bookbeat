"use client";
import { Trash2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase";

(async () => {
  const snap = await getDocs(collection(db, "availability"));
  const bad = [];
  snap.forEach((d) => {
    const x = d.data();
    const toDate = (v) => (typeof v?.toDate === "function" ? v.toDate() : new Date(v));
    const s = x.start ? toDate(x.start) : null;
    const e = x.end ? toDate(x.end) : null;
    if (!s || !e || isNaN(+s) || isNaN(+e)) bad.push({ id: d.id, start: x.start, end: x.end });
  });
  console.log("Docs invalide:", bad);
})();

export default function Test() {
  return (
    <div className="fixed bottom-4 left-4 z-[9999] rounded px-3 py-2 bg-black text-white">
      <div className="flex items-center gap-2">
        <Trash2 className="w-5 h-5" />
        <span>Lucide OK</span>
        
      </div>
    </div>
  );
}
