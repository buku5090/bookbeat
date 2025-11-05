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
  const colors = [
    { name: "Negru", hex: "#000000" },
    { name: "Alb", hex: "#FFFFFF" },
    { name: "Roșu", hex: "#E50914" },
    { name: "Mov", hex: "#8A2BE2" },
    { name: "Turcoaz", hex: "#00CED1" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-white">
      <h1 className="text-2xl font-bold mb-6">Schema cromatică BookMix</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6">
        {colors.map((color) => (
          <div
            key={color.hex}
            className="relative w-40 h-40 rounded-2xl shadow-lg flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: color.hex }}
          >
            <span
              className={`font-semibold text-sm ${
                color.hex === "#FFFFFF" ? "text-black" : "text-white"
              }`}
            >
              {color.name} <br />
              {color.hex}
            </span>
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-4 z-[9999] rounded px-3 py-2 bg-black text-white flex items-center gap-2">
        <Trash2 className="w-5 h-5" />
        <span>Lucide OK</span>
      </div>
    </div>
  );
}
