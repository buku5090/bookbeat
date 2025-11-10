import EditableChips from "./EditableChips";
import { useTranslation } from "react-i18next";

const SPECIALIZATION_OPTIONS = [
  "Nuntă", "Club", "Bar", "Cafenea", "Corporate", "Festival",
  "Privat", "Restaurant", "Plajă", "Afterparty", "Lounge",
];

export default function EditableSpecializations({
  value = [],
  canEdit,
  onSave,
  max = 8,
  onChipClick,
}) {
  const { t } = useTranslation();

  return (
    <EditableChips
      label={t("editable_specializations.label")}
      value={Array.isArray(value) ? value : []}
      canEdit={!!canEdit}
      onSave={onSave}
      suggestions={SPECIALIZATION_OPTIONS}
      placeholder={t("editable_specializations.placeholder")}
      max={max}
      allowCustom={false}
      onChipClick={onChipClick}
      customTheme={{
        bg: "#FFE9F1",
        border: "#E7F0FF",
        text: "#5A0E30",
        hint: "#4A4A4A",
      }}
    />
  );
}
