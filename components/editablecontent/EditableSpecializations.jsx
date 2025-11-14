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
      variant="specializations"
      canEdit={!!canEdit}
      onSave={onSave}
      suggestions={SPECIALIZATION_OPTIONS}
      placeholder={t("editable_specializations.placeholder")}
      max={max}
      allowCustom={false}
      onChipClick={onChipClick}
    />
  );
}
