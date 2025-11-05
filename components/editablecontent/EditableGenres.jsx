// components/EditableGenres.jsx
import EditableChips from "./EditableChips";
import { genres as GENRES } from "../../src/data/genres";

const SUGGESTIONS = [...new Set(GENRES.map((g) => String(g).trim()).filter(Boolean))];

export default function EditableGenres({
  value = [],
  canEdit,
  onSave,
  onChipClick, // ← NOU
}) {
  const handleSave = (arr) => {
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
      onChipClick={onChipClick} // ← forward
      customTheme={{
        bg: "#E7F0FF",
        border: "#E7F0FF",
        text: "#1F2A44",
        hint: "#4A4A4A",
      }}
      maxMessage="Ai deja 5 genuri selectate. Șterge unul ca să poți adăuga altul."
    />
  );
}
