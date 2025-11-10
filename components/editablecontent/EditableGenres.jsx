import EditableChips from "./EditableChips";
import { genres as GENRES } from "../../src/data/genres";
import { useTranslation } from "react-i18next";

const SUGGESTIONS = [...new Set(GENRES.map((g) => String(g).trim()).filter(Boolean))];

export default function EditableGenres({ value = [], canEdit, onSave, onChipClick }) {
  const { t } = useTranslation();

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
      label={t("editable_genres.label")}
      value={Array.isArray(value) ? value : []}
      canEdit={!!canEdit}
      onSave={handleSave}
      suggestions={SUGGESTIONS}
      placeholder={t("editable_genres.placeholder")}
      max={5}
      allowCustom={false}
      onChipClick={onChipClick}
      customTheme={{
        bg: "#E7F0FF",
        border: "#E7F0FF",
        text: "#1F2A44",
        hint: "#4A4A4A",
      }}
      maxMessage={t("editable_genres.max_message")}
    />
  );
}
