import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "../uiux";
import { useTranslation } from "react-i18next";

const OPTIONS_BY_TYPE = {
  artist: [
    "editable_dj_equipment.options.artist.none",
    "editable_dj_equipment.options.artist.controller_only",
    "editable_dj_equipment.options.artist.mixer_players",
    "editable_dj_equipment.options.artist.full_mobile",
    "editable_dj_equipment.options.artist.other",
  ],
  location: [
    "editable_dj_equipment.options.location.full_ready",
    "editable_dj_equipment.options.location.speakers_only",
    "editable_dj_equipment.options.location.mixer_only",
    "editable_dj_equipment.options.location.space_only",
    "editable_dj_equipment.options.location.other",
  ],
};

export default function EditableDJEquipment({
  type = "artist",
  value,
  canEdit = false,
  onSave,
}) {
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
  const showCustom =
    preset === t("editable_dj_equipment.options.artist.other") ||
    preset === t("editable_dj_equipment.options.location.other");

  const handleSave = async () => {
    const payload = { preset, notes: notes?.trim?.() || "" };
    await onSave?.(payload);
    setEditing(false);
  };

  return (
    <section className="w-full">
      {/* READ-ONLY */}
      {!editing && (
        <div
          className="relative rounded-2xl border shadow-lg p-4 sm:p-5 bg-black text-white"
          style={{ borderColor: "#7c3aed" }}
        >
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              aria-label={t("editable_dj_equipment.edit")}
              className="absolute top-0 right-0 !py-2 !px-4 border !border-white rounded !bg-black !text-white hover:!text-gray-200 hover:!bg-gray-800 transition"
              style={{ borderColor: "#4b5563" }}
            >
              <Pencil size={14} />
            </button>
          )}

          {preset ? (
            <>
              <p className="font-semibold text-lg text-white">{preset}</p>
              {notes?.trim() && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{notes}</p>
              )}
            </>
          ) : (
            <p className="italic text-gray-400">{t("editable_dj_equipment.not_specified")}</p>
          )}
        </div>
      )}

      {/* EDIT MODE */}
      {editing && canEdit && (
        <div
          className="rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 border bg-black text-white"
          style={{ borderColor: "#7c3aed" }}
        >
          <div className="grid gap-2">
            {OPTIONS.map((key) => {
              const selected = preset === t(key);
              return (
                <label
                  key={key}
                  className="group flex items-start gap-3 rounded-2xl border overflow-visible px-5 py-4 cursor-pointer transition-all bg-black text-white"
                  style={{
                    borderColor: selected ? "#ffffff" : "#374151",
                    boxShadow: selected ? "0 0 0 2px #ffffff33" : "none",
                  }}
                >
                  <input
                    type="radio"
                    name="dj-equipment"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border outline-none accent-white bg-black"
                    checked={selected}
                    onChange={() => setPreset(t(key))}
                    style={{ borderColor: selected ? "#ffffff" : "#6b7280" }}
                  />
                  <span className="leading-snug font-medium text-white">{t(key)}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">
              {t("editable_dj_equipment.details_label")}
            </label>
            <textarea
              className="w-full rounded-xl px-4 py-3 min-h-[110px] text-sm outline-none placeholder-gray-400 bg-black text-white"
              style={{ border: "1px solid #374151", boxShadow: "none" }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #ffffff33")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              placeholder={
                showCustom
                  ? t("editable_dj_equipment.placeholder_other")
                  : t("editable_dj_equipment.placeholder_default")
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              className="!rounded-xl !px-4 !py-2 bg-black text-white border"
              style={{ borderColor: "#4b5563" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#000000")}
              onClick={() => {
                setEditing(false);
                setPreset(initial.preset);
                setNotes(initial.notes);
              }}
            >
              {t("editable_dj_equipment.cancel")}
            </Button>

            <Button
              variant="primary"
              disabled={!preset}
              className="!rounded-xl !px-5 !py-2 !font-semibold disabled:opacity-60 bg-black text-white border"
              style={{ borderColor: "#ffffff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#111111")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#000000")}
              onClick={handleSave}
            >
              {t("editable_dj_equipment.save")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
