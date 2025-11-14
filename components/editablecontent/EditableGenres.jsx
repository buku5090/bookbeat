import EditableChips from "./EditableChips";
import { genres as GENRES } from "../../src/data/genres";
import { useTranslation } from "react-i18next";

const SUGGESTIONS = [...new Set(GENRES.map((g) => String(g).trim()).filter(Boolean))];

// Paletă BookMix (dark + accent mov)
const BOOKMIX_THEME = {
  // text & fundaluri de bază
  text: "#EDEDED",
  hint: "#9CA3AF",
  bg: "#0B0B0F",        // fundal input / container
  border: "#232323",

  // chips
  chipBg: "#161616",
  chipBorder: "#2A2A2A",
  chipText: "#EDEDED",
  chipSelectedBg: "#8B5CF6", // accent mov
  chipSelectedText: "#0B0B0F",

  // dropdown / opțiuni
  dropdownBg: "#0F0F14",
  dropdownBorder: "#242424",
  optionText: "#EDEDED",
  optionHoverBg: "#1F2937",
  optionHoverText: "#FFFFFF",
  optionActiveBg: "#8B5CF6",
  optionActiveText: "#0B0B0F",

  // scrollbar (opțional)
  scrollThumb: "#2A2A2A",
  scrollTrack: "transparent",
};

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
      customTheme={BOOKMIX_THEME}
      maxMessage={t("editable_genres.max_message")}
    />
  );
}
