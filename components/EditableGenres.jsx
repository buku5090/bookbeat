// components/EditableGenres.jsx
import EditableChips from "./EditableChips";
import { genres as GENRES } from "../src/data/genres";

// normalizare simplă (trim + dedup, păstrând ordinea)
const SUGGESTIONS = [...new Set(GENRES.map((g) => String(g).trim()).filter(Boolean))];

export default function EditableGenres({
  value = [],
  canEdit,
  onSave,
}) {
  const handleSave = (arr) => {
    // doar valori din lista oficială + dedup case-insensitive + maxim 5
    const inList = arr.filter((x) =>
      SUGGESTIONS.some((s) => s.toLowerCase() === String(x).toLowerCase())
    );
    const unique = [
      ...new Map(inList.map((s) => [String(s).toLowerCase(), String(s).trim()])).values(),
    ].slice(0, 5);

    onSave?.(unique);
  };

  return (
    <EditableChips
      variant="genres"
      label="GENURI MUZICALE"
      value={Array.isArray(value) ? value : []}
      canEdit={!!canEdit}
      onSave={handleSave}
      suggestions={SUGGESTIONS}
      placeholder="Alege genuri"
      max={5}
      allowCustom={false}
      // culorile din screenshot (pastel albastru)
      customTheme={{
        bg: "#E7F0FF",
        border: "#E7F0FF",
        text: "#1F2A44",
        hint: "#4A4A4A",
      }}
      // mesajul pe care îl va afișa toast-ul intern din EditableChips
      maxMessage="Ai deja 5 genuri selectate. Șterge unul ca să poți adăuga altul."
    />
  );
}
