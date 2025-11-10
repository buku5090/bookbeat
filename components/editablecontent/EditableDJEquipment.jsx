import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import SectionTitle from "../styling/SectionTitle";
import { Button } from "../uiux";
import { useTranslation } from "react-i18next";

const OPTIONS_BY_TYPE = {
  artist: [
    "editable_dj_equipment.options.artist.none",
    "editable_dj_equipment.options.artist.controller_only",
    "editable_dj_equipment.options.artist.mixer_players",
    "editable_dj_equipment.options.artist.full_mobile",
    "editable_dj_equipment.options.artist.other"
  ],
  location: [
    "editable_dj_equipment.options.location.full_ready",
    "editable_dj_equipment.options.location.speakers_only",
    "editable_dj_equipment.options.location.mixer_only",
    "editable_dj_equipment.options.location.space_only",
    "editable_dj_equipment.options.location.other"
  ],
};

export default function EditableDJEquipment({ type = "artist", value, canEdit = false, onSave }) {
  const { t } = useTranslation();

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
  const showCustom = preset === t("editable_dj_equipment.options.artist.other") || preset === t("editable_dj_equipment.options.location.other");

  const handleSave = async () => {
    const payload = { preset, notes: notes?.trim?.() || "" };
    await onSave?.(payload);
    setEditing(false);
  };

  return (
    <section>
      {!editing && (
        <div className="relative bg-white">
          {canEdit && !editing && (
            <div className="flex items-center justify-between">
              <SectionTitle>{t("editable_dj_equipment.title")}</SectionTitle>
              <button
                onClick={() => setEditing(true)}
                aria-label={t("editable_dj_equipment.edit")}
                className="absolute right-0 !bg-white !px-3 !py-1 !text-gray-400 hover:text-gray-700 transition rounded"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}

          {preset ? (
            <>
              <p className="font-medium">{preset}</p>
              {notes?.trim() && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{notes}</p>}
            </>
          ) : (
            <p className="text-gray-500 italic">{t("editable_dj_equipment.not_specified")}</p>
          )}
        </div>
      )}

      {editing && canEdit && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="grid gap-2">
            {OPTIONS.map((key) => (
              <label
                key={key}
                className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${
                  preset === t(key) ? "border-black" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="dj-equipment"
                  className="mt-1"
                  checked={preset === t(key)}
                  onChange={() => setPreset(t(key))}
                />
                <span className="leading-snug">{t(key)}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">{t("editable_dj_equipment.details_label")}</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[96px]"
              placeholder={
                showCustom
                  ? t("editable_dj_equipment.placeholder_other")
                  : t("editable_dj_equipment.placeholder_default")
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
              {t("editable_dj_equipment.cancel")}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!preset}>
              {t("editable_dj_equipment.save")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
