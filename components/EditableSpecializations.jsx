// components/EditableSpecializations.jsx
import EditableChips from "./EditableChips";

const SPECIALIZATION_OPTIONS = [
  "Nuntă", "Club", "Bar", "Cafenea", "Corporate", "Festival",
  "Privat", "Restaurant", "Plajă", "Afterparty", "Lounge",
];

export default function EditableSpecializations({
  value = [],
  canEdit,
  onSave,
  max = 8,
}) {
  return (
    <EditableChips
      label="PREFERINȚE"
      value={Array.isArray(value) ? value : []}
      canEdit={!!canEdit}
      onSave={onSave}
      suggestions={SPECIALIZATION_OPTIONS}
      placeholder="Adaugă tip de eveniment"
      max={max}
      allowCustom={false} // păstrăm controlul listelor pentru filtrare
      // paletă separată pentru Preferințe (albastru pastel)
      customTheme={{
        bg: "#FFE9F1",
        border: "#E7F0FF",
        text: "#5A0E30",
        hint: "#4A4A4A",
      }}
    />
  );
}
