// components/EditableDJEquipment.jsx
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import { Button } from "../uiux";

const OPTIONS_BY_TYPE = {
  artist: [
    "Nu am echipament",
    "Am doar consolă/controller",
    "Am mixer + player(e)",
    "Echipament complet și mobil (PA inclus)",
    "Altă configurație",
  ],
  location: [
    "Echipament complet – artistul doar vine și pune muzică",
    "Avem doar boxe – artistul trebuie să aducă mixer/consolă",
    "Avem doar mixer – artistul aduce player(e)/laptop",
    "Doar spațiu – artistul aduce tot",
    "Altă configurație",
  ],
};

export default function EditableDJEquipment({
  type = "artist",                // "artist" | "location"
  value,                          // string sau { preset, notes }
  canEdit = false,
  onSave,                         // primește { preset, notes }
}) {
  // normalizare valoare
  const initial = (() => {
    if (!value) return { preset: "", notes: "" };
    if (typeof value === "string") return { preset: value, notes: "" };
    const { preset = "", notes = "" } = value || {};
    return { preset, notes };
  })();

  const [editing, setEditing] = useState(false);
  const [preset, setPreset] = useState(initial.preset);
  const [notes, setNotes] = useState(initial.notes);

  useEffect(() => {
    const next = (() => {
      if (!value) return { preset: "", notes: "" };
      if (typeof value === "string") return { preset: value, notes: "" };
      const { preset = "", notes = "" } = value || {};
      return { preset, notes };
    })();
    setPreset(next.preset);
    setNotes(next.notes);
  }, [value]);

  const OPTIONS = OPTIONS_BY_TYPE[type] || OPTIONS_BY_TYPE.artist;
  const showCustom = preset === "Altă configurație";

  const handleSave = async () => {
    const payload = { preset, notes: notes?.trim?.() || "" };
    await onSave?.(payload);
    setEditing(false);
  };

  return (
    <section>
      {/* VIEW */}
      {!editing && (
        <div className="relative bg-white">
          {/* buton edit identic cu EditableField */}
          {canEdit && !editing && (
            <div className="flex items-center justify-between">
                <SectionTitle>Echipament DJ</SectionTitle>
                <button
                    onClick={() => setEditing(true)}
                    aria-label="Editează"
                    className="absolute right-0 !bg-white !px-3 !py-1 !text-gray-400 hover:text-gray-700 transition rounded"
                        >
                        <Pencil size={14} />
                </button>
            </div>
          )}

          {preset ? (
            <>
              <p className="font-medium">{preset}</p>
              {notes?.trim() ? (
                <p className="text-gray-600 mt-1 whitespace-pre-wrap">{notes}</p>
              ) : null}
            </>
          ) : (
            <p className="text-gray-500 italic">Nu a fost specificat încă.</p>
          )}
        </div>
      )}

      {/* EDIT */}
      {editing && canEdit && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="grid gap-2">
            {OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${
                  preset === opt ? "border-black" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="dj-equipment"
                  className="mt-1"
                  checked={preset === opt}
                  onChange={() => setPreset(opt)}
                />
                <span className="leading-snug">{opt}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Detalii (opțional)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[96px]"
              placeholder={
                showCustom
                  ? "Descrie configurația: mărci, modele, cerințe, etc."
                  : "Ex: „prefer conectare pe XLR”, „am flight-case”, „PA 2x1kW + sub”"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setPreset(initial.preset);
                setNotes(initial.notes);
              }}
            >
              Anulează
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!preset}>
              Salvează
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
